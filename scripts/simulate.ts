/**
 * EBT integration simulation — runs against live testnet RPCs with eth_call + state override.
 *
 * It exercises the SAME calldata builders the UI uses (src/lib/*), so a green result
 * means "the transaction this app builds is accepted by the real contract".
 *
 * Nothing is signed and nothing is broadcast: every check is a read-only eth_call.
 */
import { createPublicClient, http, encodeFunctionData, keccak256, pad, toHex, parseAbi } from 'viem'
import { sepolia, baseSepolia } from 'viem/chains'
import { getChain, CCTP_TOKEN_MESSENGER_V2 } from '../src/config/chains'
import { tokenMessengerV2Abi, buildDepositForBurnArgs, fetchCctpFees, maxFeeFor } from '../src/lib/cctp'
import { buildSwapCalldata } from '../src/lib/swapExec'
import { swapRouterV1Abi } from '../src/lib/uniswap'
import { buildOpDeposit } from '../src/lib/bridgeExec'
import { quoteBest, erc20Abi } from '../src/lib/uniswap'
import { assertTestnet, TestnetViolation, assertCctpRoute } from '../src/lib/guard'
import { WETH, USDC_OF, TOKENS, tokensForChain } from '../src/config/tokens'
import { RPC } from '../src/lib/wallet'
import { decodeCctpMessage } from '../src/lib/cctpMessage'
import { messageNonce } from '../src/lib/errors'
import { opDepositTargets, getPortalAddress } from '../src/lib/opstack'

const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com'
const BASE_RPC = 'https://sepolia.base.org'
const SENDER = '0x1111111111111111111111111111111111111111' as const

const results: Array<{ id: string; ok: boolean; detail: string }> = []
const record = (id: string, ok: boolean, detail: string) => {
  results.push({ id, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(46)} ${detail}`)
}

const l1 = createPublicClient({ chain: sepolia, transport: http(SEPOLIA_RPC, { timeout: 30000 }) })
const l2 = createPublicClient({ chain: baseSepolia, transport: http(BASE_RPC, { timeout: 30000 }) })

const GWEI = 10n ** 9n

/** code that returns `true` for any call (used to satisfy simulateContract-style flows) */
const ALWAYS_TRUE = '0x600160005260206000f3' as const

async function main() {
  console.log('\n=== EBT integration simulation ===', new Date().toISOString())

  /* ---------------- 0. guard rails ---------------- */
  try {
    assertTestnet(1)
    record('guard: mainnet rejected', false, 'chain 1 was accepted — guard is broken')
  } catch (e) {
    record('guard: mainnet rejected', e instanceof TestnetViolation, (e as Error).message)
  }
  try {
    assertTestnet(424242)
    record('guard: unknown chain rejected', false, 'unknown chain accepted')
  } catch {
    record('guard: unknown chain rejected', true, 'unknown testnet id throws')
  }
  try {
    assertCctpRoute(91342, 84532)
    record('guard: GIWA has no CCTP route', false, 'GIWA accepted as CCTP source')
  } catch (e) {
    record('guard: GIWA has no CCTP route', true, (e as Error).message)
  }

  /* ---------------- 1. CCTP fee API ---------------- */
  let fees: Awaited<ReturnType<typeof fetchCctpFees>> | null = null
  try {
    fees = await fetchCctpFees(0, 6)
    record('cctp: Iris fee API (0 → 6)', fees.fastBps >= 0, `fast=${fees.fastBps}bps standard=${fees.standardBps}bps`)
  } catch (e) {
    record('cctp: Iris fee API (0 → 6)', false, (e as Error).message)
  }

  /* ---------------- 2. CCTP burn calldata accepted by TokenMessengerV2 ---------------- */
  const amount = 1_000_000n // 1 USDC
  const maxFee = maxFeeFor(amount, fees?.fastBps ?? 1)
  const burnData = encodeFunctionData({
    abi: tokenMessengerV2Abi,
    functionName: 'depositForBurn',
    args: buildDepositForBurnArgs({
      amount,
      destDomain: 6,
      recipient: SENDER,
      burnToken: USDC_OF(11155111)!.address,
      maxFee,
      fast: true,
    }),
  })

  // With no USDC balance the contract must get past argument validation and fail inside USDC.
  let burnBaseline = ''
  try {
    await l1.call({ to: CCTP_TOKEN_MESSENGER_V2, data: burnData, account: SENDER })
    record('cctp: burn reaches token transfer', true, 'call succeeded with no balance (unexpected but harmless)')
  } catch (e) {
    burnBaseline = (e as { shortMessage?: string; details?: string }).shortMessage || (e as Error).message
    const ok = /exceeds (balance|allowance)|transfer amount|ERC20/i.test(burnBaseline)
    record('cctp: burn reaches token transfer', ok, `revert: ${burnBaseline.slice(0, 90)}`)
  }

  // Now fund the sender via storage override and expect a clean success.
  const funded = await simulateWithUsdc(amount, maxFee)
  record('cctp: depositForBurn succeeds with funds', funded.ok, funded.detail)

  /* ---------------- 3. Uniswap native → USDC swap (full path) ---------------- */
  const chainSepolia = getChain(11155111)!
  const weth = WETH[11155111]
  const usdc = USDC_OF(11155111)!
  const ethIn = 1_000_000_000_000_000n // 0.001 ETH
  const nativeQuote = await quoteBest(l1 as never, chainSepolia, weth, usdc.address, ethIn)
  record('swap: quote WETH→USDC on Sepolia', Boolean(nativeQuote), nativeQuote ? `out=${nativeQuote.amountOut} fee=${nativeQuote.fee} impact=${nativeQuote.priceImpactBps}bps` : 'no quote')

  if (nativeQuote) {
    const tx = buildSwapCalldata({
      chain: chainSepolia,
      account: SENDER,
      tokenIn: { address: null, symbol: 'ETH', decimals: 18 },
      tokenOut: { address: usdc.address, symbol: 'USDC', decimals: 6 },
      amountIn: ethIn,
      amountOutMinimum: (nativeQuote.amountOut * 99n) / 100n,
      fee: nativeQuote.fee,
    })
    try {
      const r = await l1.call({
        to: tx.to,
        data: tx.data,
        value: tx.value,
        account: SENDER,
        stateOverride: [{ address: SENDER, balance: 10n * 10n ** 18n }],
      })
      record('swap: native ETH→USDC executes', true, `returned ${r.data?.slice(0, 66) ?? 'ok'}`)
    } catch (e) {
      record('swap: native ETH→USDC executes', false, ((e as { shortMessage?: string }).shortMessage || (e as Error).message).slice(0, 120))
    }
  }

  /* ---------------- 4. OP Stack deposit into GIWA ---------------- */
  const opTx = buildOpDeposit({ toChainId: 91342, recipient: SENDER, mint: 1_000_000_000_000_000n })
  try {
    await l1.call({
      to: opTx.to,
      data: opTx.data,
      value: opTx.value,
      account: SENDER,
      stateOverride: [{ address: SENDER, balance: 10n * 10n ** 18n }],
    })
    record('opstack: GIWA deposit accepted', true, `portal ${opTx.to}`)
  } catch (e) {
    record('opstack: GIWA deposit accepted', false, ((e as { shortMessage?: string }).shortMessage || (e as Error).message).slice(0, 120))
  }

  /* ---------------- 5. ERC-20 swap path (approve + swap calldata) ---------------- */
  const usdcQuote = await quoteBest(l1 as never, chainSepolia, usdc.address, weth, 1_000_000n)
  record('swap: quote USDC→WETH on Sepolia', Boolean(usdcQuote), usdcQuote ? `out=${usdcQuote.amountOut} fee=${usdcQuote.fee}` : 'no quote')
  if (usdcQuote) {
    const approveData = encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [chainSepolia.uniswap!.router02, 1_000_000n] })
    const approveSim = await simulateErc20Call(usdc.address, approveData, 0n, chainSepolia.uniswap!.router02)
    record('swap: USDC.approve(router, exact)', approveSim.ok, approveSim.detail)

    const tx = buildSwapCalldata({
      chain: chainSepolia,
      account: SENDER,
      tokenIn: { address: usdc.address, symbol: 'USDC', decimals: 6 },
      tokenOut: { address: null, symbol: 'ETH', decimals: 18 },
      amountIn: 1_000_000n,
      amountOutMinimum: (usdcQuote.amountOut * 99n) / 100n,
      fee: usdcQuote.fee,
    })
    const swapWithFunds = await simulateErc20Call(tx.to, tx.data, 1_000_000n, chainSepolia.uniswap!.router02)
    record('swap: USDC→ETH executes with funds', swapWithFunds.ok, swapWithFunds.detail)
  }

  /* ---------------- 6. second Uniswap chain ---------------- */
  const chainBase = getChain(84532)!
  const baseQuote = await quoteBest(l2 as never, chainBase, USDC_OF(84532)!.address, WETH[84532], 1_000_000n)
  record('swap: quote USDC→WETH on Base Sepolia', Boolean(baseQuote), baseQuote ? `out=${baseQuote.amountOut} fee=${baseQuote.fee}` : 'no quote')

  /* OP Sepolia uses the canonical v3 deployment (same addresses as Base) */
  const chainOp = getChain(11155420)!
  const opClient = createPublicClient({ transport: http(RPC[11155420], { timeout: 25000 }) })
  const opUsdc = USDC_OF(11155420)!
  const opQuote = await quoteBest(opClient as never, chainOp, opUsdc.address, WETH[11155420], 1_000_000n)
  record('swap: quote USDC→WETH on OP Sepolia', Boolean(opQuote), opQuote ? `out=${opQuote.amountOut} fee=${opQuote.fee}` : 'no quote')
  if (opQuote) {
    const opTx = buildSwapCalldata({
      chain: chainOp,
      account: SENDER,
      tokenIn: { address: opUsdc.address, symbol: 'USDC', decimals: 6 },
      tokenOut: { address: WETH[11155420], symbol: 'WETH', decimals: 18 },
      amountIn: 1_000_000n,
      amountOutMinimum: (opQuote.amountOut * 99n) / 100n,
      fee: opQuote.fee,
    })
    const opSwap = await simulateErc20Call(opTx.to, opTx.data, 1_000_000n, chainOp.uniswap!.router02)
    record('swap: USDC→WETH executes on OP Sepolia', opSwap.ok, opSwap.detail)
  }

  /* ---------------- 7. pair coverage matrix ---------------- */
  const pairs = await pairCoverage()
  record('swap: executable pair coverage', pairs.live > 0, `${pairs.live} live pairs / ${pairs.tried} probed`)

  /* ---------------- 8. Arc specifics ---------------- */
  const arc = createPublicClient({ transport: http(RPC[5042002], { timeout: 25000 }) })
  try {
    const domain = (await arc.readContract({
      address: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
      abi: parseAbi(['function localDomain() view returns (uint32)']),
      functionName: 'localDomain',
    })) as number
    record('arc: MessageTransmitter localDomain', domain === 26, `domain=${domain}`)
  } catch (e) {
    record('arc: MessageTransmitter localDomain', false, (e as Error).message.slice(0, 90))
  }
  try {
    const [dec, native] = await Promise.all([
      arc.readContract({
        address: '0x3600000000000000000000000000000000000000',
        abi: parseAbi(['function decimals() view returns (uint8)']),
        functionName: 'decimals',
      }),
      arc.getGasPrice(),
    ])
    record('arc: USDC ERC-20 view is 6dp', Number(dec) === 6, `decimals=${dec}, gasPrice=${native}`)
    record('arc: gas floor ≥20 gwei', native >= 20n * 10n ** 9n, `${native / 10n ** 9n} gwei`)
  } catch (e) {
    record('arc: USDC ERC-20 view is 6dp', false, (e as Error).message.slice(0, 90))
  }

  /* ---------------- 9. OP deposit targets ---------------- */
  const targets = opDepositTargets(11155111)
  record(
    'opstack: ETH deposit targets from Sepolia',
    targets.length >= 5,
    targets.map((c) => c.short).join(', '),
  )
  for (const t of targets.slice(0, 3)) {
    const portal = getPortalAddress(t)
    const code = portal ? await l1.getCode({ address: portal }).catch(() => undefined) : undefined
    record(`opstack: portal has code (${t.short})`, Boolean(code && code !== '0x'), portal ?? 'none')
  }

  /* ---------------- 10. recover a real stopped transfer ---------------- */
  try {
    const found = await findRecentBurnToArc()
    if (!found) {
      record('cctp: real Base→Arc recovery', false, 'no recent Base→Arc burn found to test with')
    } else {
      const att = await fetch(`https://iris-api-sandbox.circle.com/v2/messages/6?transactionHash=${found}&cctpVersion=2`)
      const j = (await att.json()) as { messages?: Array<{ message: string; attestation: string }> }
      const m = j.messages?.[0]
      if (!m) {
        record('cctp: real Base→Arc recovery', false, 'Iris has no message for that burn yet')
      } else {
        const dec = decodeCctpMessage(m.message)
        const used = (await arc.readContract({
          address: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
          abi: parseAbi(['function usedNonces(bytes32) view returns (uint256)']),
          functionName: 'usedNonces',
          args: [messageNonce(m.message as `0x${string}`)],
        })) as bigint
        record('cctp: message decoder (real message)', Boolean(dec && dec.destinationDomain === 26), dec ? `amount=${dec.amount} → domain ${dec.destinationDomain}` : 'decode failed')

        if (used === 0n) {
          const data = encodeFunctionData({
            abi: parseAbi(['function receiveMessage(bytes message, bytes attestation) returns (bool)']),
            functionName: 'receiveMessage',
            args: [m.message as `0x${string}`, m.attestation as `0x${string}`],
          })
          try {
            const r = await arc.call({ to: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275', data, account: SENDER })
            record('cctp: Arc mint simulation', r.data === '0x' + '0'.repeat(63) + '1', `return=${r.data}`)
          } catch (e) {
            record('cctp: Arc mint simulation', false, ((e as { shortMessage?: string }).shortMessage || (e as Error).message).slice(0, 110))
          }
        } else {
          record('cctp: Arc mint simulation', true, 'message already minted (usedNonces != 0) — decoder + nonce offset correct')
        }
      }
    }
  } catch (e) {
    record('cctp: real Base→Arc recovery', false, (e as Error).message.slice(0, 100))
  }

  /* ---------------- 11. Arc swap (Uniswap v3, v1-style router) ---------------- */
  try {
    const arcChain = getChain(5042002)!
    const arcUsdc = USDC_OF(5042002)!
    const eurc = tokensForChain(5042002).find((t) => t.symbol === 'EURC')
    if (!arcChain.uniswap || !eurc) throw new Error('Arc swap deployment missing from the registry')
    const q = await quoteBest(arc as never, arcChain, arcUsdc.address, eurc.address, 1_000_000n)
    record('swap: quote USDC→EURC on Arc', Boolean(q), q ? `out=${q.amountOut} fee=${q.fee} impact=${q.priceImpactBps}bps` : 'no quote')

    if (q) {
      const tx = buildSwapCalldata({
        chain: arcChain,
        account: SENDER,
        tokenIn: { address: arcUsdc.address, symbol: 'USDC', decimals: 6 },
        tokenOut: { address: eurc.address, symbol: 'EURC', decimals: 6 },
        amountIn: 1_000_000n,
        amountOutMinimum: (q.amountOut * 99n) / 100n,
        fee: q.fee,
      })
      try {
        await arc.call({ account: SENDER, to: tx.to, data: tx.data })
        record('swap: Arc router accepts calldata', true, 'call succeeded (unfunded sender, no state change)')
      } catch (e) {
        const msg = ((e as { shortMessage?: string }).shortMessage || (e as Error).message).slice(0, 90)
        record('swap: Arc router accepts calldata', /\bSTF\b/.test(msg), `${msg} (STF = decoded, reached token transfer)`)
      }
      // a fee tier with no pool must fail differently — proves the pool, not the encoding, decides
      try {
        const bad = buildSwapCalldata({
          chain: arcChain, account: SENDER,
          tokenIn: { address: arcUsdc.address, symbol: 'USDC', decimals: 6 },
          tokenOut: { address: eurc.address, symbol: 'EURC', decimals: 6 },
          amountIn: 1_000_000n, amountOutMinimum: 1n, fee: 500,
        })
        await arc.call({ account: SENDER, to: bad.to, data: bad.data })
        record('swap: Arc empty tier rejected', false, 'fee tier 500 unexpectedly succeeded')
      } catch (e) {
        const msg = ((e as { shortMessage?: string }).shortMessage || (e as Error).message).slice(0, 60)
        record('swap: Arc empty tier rejected', /SPL|pool/i.test(msg), msg)
      }
    }
  } catch (e) {
    record('swap: quote USDC→EURC on Arc', false, (e as Error).message.slice(0, 100))
  }

  /* ---------------- summary ---------------- */
  const failed = results.filter((r) => !r.ok)
  console.log(`\n=== ${results.length - failed.length}/${results.length} checks passed ===`)
  const fs = await import('node:fs')
  fs.writeFileSync('scripts/simulation-report.json', JSON.stringify({ ranAt: new Date().toISOString(), results, pairs }, null, 2))
  if (failed.length) process.exitCode = 1
}

async function pairCoverage() {
  let tried = 0
  let live = 0
  for (const c of [11155111, 84532, 1301]) {
    const chain = getChain(c)!
    if (!chain.uniswap) continue
    const client = createPublicClient({ chain: chain.viem, transport: http(RPC[chain.id], { timeout: 20000 }) })
    const toks = tokensForChain(c)
    for (const a of toks) {
      for (const b of toks) {
        if (a.address === b.address) continue
        tried++
        const q = await quoteBest(client as never, chain, a.address, b.address, 10n ** BigInt(a.decimals))
        if (q) live++
      }
    }
  }
  return { tried, live }
}

async function findRecentBurnToArc(): Promise<string | null> {
  const res = await fetch('https://base-sepolia.blockscout.com/api/v2/addresses/0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA/transactions?filter=to')
  const j = (await res.json()) as { items?: Array<{ hash: string }> }
  const items = j.items ?? []
  for (const t of items.slice(0, 25)) {
    const d = await fetch(`https://base-sepolia.blockscout.com/api/v2/transactions/${t.hash}`)
    const tx = (await d.json()) as { decoded_input?: { parameters?: Array<{ name: string; value: string }> } }
    const dest = tx.decoded_input?.parameters?.find((p) => p.name === 'destinationDomain')?.value
    if (dest && Number(dest) === 26) return t.hash
  }
  return null
}

/* ── helpers ── */

/** Discovers the real USDC storage layout by matching a pool's on-chain balance. */
async function findUsdcSlots(): Promise<{ balance: number; allowance: number } | null> {
  const usdc = USDC_OF(11155111)!.address
  const chain = getChain(11155111)!
  const pool = (await l1.readContract({
    address: chain.uniswap!.factory,
    abi: parseAbi(['function getPool(address,address,uint24) view returns (address)']),
    functionName: 'getPool',
    args: [usdc, WETH[11155111], 500],
  })) as `0x${string}`
  const realBal = (await l1.readContract({ address: usdc, abi: erc20Abi, functionName: 'balanceOf', args: [pool] })) as bigint
  if (realBal === 0n) return null

  let balanceSlot: number | null = null
  for (let slot = 0; slot < 24; slot++) {
    const key = mappingKey(pool, slot)
    const raw = (await l1.getStorageAt({ address: usdc, slot: key })) as `0x${string}` | undefined
    if (!raw) continue
    const value = BigInt(raw)
    // FiatTokenV2_2 packs a blacklist flag in the lowest bit
    if (value === realBal || value >> 1n === realBal) {
      balanceSlot = slot
      break
    }
  }
  if (balanceSlot === null) return null

  for (let as = 0; as < 24; as++) {
    if (as === balanceSlot) continue
    if (await tryBurnWithSlots(usdc, balanceSlot, as)) return { balance: balanceSlot, allowance: as }
  }
  return null
}

let slotCache: { balance: number; allowance: number } | null | undefined

async function simulateWithUsdc(amount: bigint, maxFee: bigint) {
  const usdc = USDC_OF(11155111)!.address
  if (slotCache === undefined) slotCache = await findUsdcSlots()
  if (!slotCache) return { ok: false, detail: 'could not locate USDC balance/allowance slots' }

  const data = encodeFunctionData({
    abi: tokenMessengerV2Abi,
    functionName: 'depositForBurn',
    args: buildDepositForBurnArgs({ amount, destDomain: 6, recipient: SENDER, burnToken: usdc, maxFee, fast: true }),
  })
  try {
    await l1.call({
      to: CCTP_TOKEN_MESSENGER_V2,
      data,
      account: SENDER,
      stateOverride: [
        { address: SENDER, balance: 10n * 10n ** 18n },
        ...usdcOverrides(usdc, amount * 1000n, amount, slotCache.balance, slotCache.allowance),
      ],
    })
    return { ok: true, detail: `layout balance=${slotCache.balance} allowance=${slotCache.allowance}, maxFee=${maxFee}` }
  } catch (e) {
    return { ok: false, detail: ((e as { shortMessage?: string }).shortMessage || (e as Error).message).slice(0, 120) }
  }
}

async function tryBurnWithSlots(usdc: `0x${string}`, bs: number, as: number): Promise<boolean> {
  const amount = 1_000_000n
  const data = encodeFunctionData({
    abi: tokenMessengerV2Abi,
    functionName: 'depositForBurn',
    args: buildDepositForBurnArgs({ amount, destDomain: 6, recipient: SENDER, burnToken: usdc, maxFee: 1_000n, fast: true }),
  })
  try {
    await l1.call({
      to: CCTP_TOKEN_MESSENGER_V2,
      data,
      account: SENDER,
      stateOverride: [{ address: SENDER, balance: 10n * 10n ** 18n }, ...usdcOverrides(usdc, amount * 1000n, amount, bs, as)],
    })
    return true
  } catch {
    return false
  }
}

function mappingKey(owner: string, slot: number) {
  return keccak256(('0x' + pad(owner as `0x${string}`, { size: 32 }).slice(2) + pad(toHex(BigInt(slot)), { size: 32 }).slice(2)) as `0x${string}`)
}

function nestedMappingKey(owner: string, spender: string, slot: number) {
  const inner = mappingKey(owner, slot)
  return keccak256(('0x' + pad(spender as `0x${string}`, { size: 32 }).slice(2) + inner.slice(2)) as `0x${string}`)
}

function usdcOverrides(
  usdc: `0x${string}`,
  balance: bigint,
  allowance: bigint,
  balanceSlot: number,
  allowanceSlot: number,
  spender: `0x${string}` = CCTP_TOKEN_MESSENGER_V2,
) {
  const balKey = mappingKey(SENDER, balanceSlot)
  const allowKey = nestedMappingKey(SENDER, spender, allowanceSlot)
  return [
    {
      address: usdc,
      stateDiff: [
        { slot: balKey, value: pad(toHex(balance), { size: 32 }) },
        { slot: allowKey, value: pad(toHex(allowance), { size: 32 }) },
      ],
    },
  ]
}

async function simulateErc20Call(to: `0x${string}`, data: `0x${string}`, amount = 0n, spender?: `0x${string}`) {
  const usdc = USDC_OF(11155111)!.address
  if (slotCache === undefined) slotCache = await findUsdcSlots()
  const overrides: unknown[] = [{ address: SENDER, balance: 10n * 10n ** 18n }]
  if (slotCache)
    overrides.push(...usdcOverrides(usdc, amount * 1000n, amount, slotCache.balance, slotCache.allowance, spender ?? to))
  try {
    const r = await l1.call({ to, data, account: SENDER, stateOverride: overrides as never })
    return { ok: true, detail: `returned ${r.data?.slice(0, 18) ?? 'ok'}` }
  } catch (e) {
    return { ok: false, detail: ((e as { shortMessage?: string }).shortMessage || (e as Error).message).slice(0, 120) }
  }
}

void ALWAYS_TRUE
void parseAbi
void GWEI
void TOKENS
main().catch((e) => {
  console.error('simulation crashed:', e)
  process.exitCode = 1
})
