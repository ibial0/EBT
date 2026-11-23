/**
 * Arbitrum Orbit canonical bridge deployments.
 *
 * An Orbit chain is an Arbitrum Nitro L2/L3 that settles to a parent chain. Its bridge is
 * NOT the Optimism OP Stack portal: deposits go through the Arbitrum gateway set deployed
 * on the parent chain. Every address below was read from the chain (bytecode present) and
 * cross-checked against the chain's own documentation.
 *
 * Two deposit paths exist and both are used here:
 *
 *   ETH    Inbox.createRetryableTicket{value: amount + submission + gas*fee}(...)
 *          a native ETH retryable ticket, one signature, no wrapped asset needed.
 *   ERC-20 L1GatewayRouter.outboundTransfer{value: submission + gas*fee}(token, ...)
 *          one approval plus one deposit.
 *
 * Withdrawals take the 7-day challenge period and are not offered.
 */
import type { Address } from './chains'

export interface OrbitBridgeCfg {
  /** the Orbit chain itself */
  chainId: number
  /** the chain the Orbit chain settles to */
  parentChainId: number
  rollup: Address
  inbox: Address
  bridge: Address
  outbox?: Address
  l1GatewayRouter: Address
  l1Erc20Gateway: Address
  l1WethGateway?: Address
  l1Weth?: Address
  l2GatewayRouter?: Address
  l2Weth?: Address
  /** short note on where the addresses came from */
  source: string
}

export const ORBIT_BRIDGES: Record<number, OrbitBridgeCfg> = {
  // Robinhood Chain Testnet — Arbitrum Orbit chain settling to Ethereum Sepolia.
  // https://docs.robinhood.com/chain/protocol-contracts/
  46630: {
    chainId: 46630,
    parentChainId: 11155111,
    rollup: '0xdc5F8E399DBd8a9F5F87AeC4C23Beb12431b386D',
    inbox: '0xF2939afA86F6f933A3CE17fCAB007907B6b0B7a4',
    bridge: '0x96295BDad104eaD97cC08797b3dC68efF59CcF30',
    outbox: '0x8D180Caf588f3Da027BEf1F42a106Da93F90b166',
    l1GatewayRouter: '0xF6F11aAEE80875776C264d93B37B34cE437382D1',
    l1Erc20Gateway: '0x52C2976cbDEf48BcC51d07d3c523769F76ECBd09',
    l1WethGateway: '0x8f8A6799F2b1978c6586318543c73D8Fb12f218f',
    l1Weth: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
    l2GatewayRouter: '0x77bF00A6A90c600f214b34BAFBB7918c0cF113A8',
    l2Weth: '0x7943e237c7F95DA44E0301572D358911207852Fa',
    source: 'https://docs.robinhood.com/chain/protocol-contracts/',
  },

  // SX Toronto — Arbitrum Orbit chain settling to 11155111.
  // Addresses verified with bytecode on the parent chain; portal-data.arbitrum.io orbit registry.
  79479957: {
    chainId: 79479957,
    parentChainId: 11155111,
    rollup: '0x82332BE0ef83A2b7Df91DCDCF481c393455E0D31',
    inbox: '0x46C42Cf5127ffd6dE2d9f231173C6d81E5010726',
    bridge: '0xC703f27438898BebE682D253185149cBeaC1621c',
    l1GatewayRouter: '0xEb362E3C9B081baE0024b34955a132B93D05047f',
    l1Erc20Gateway: '0xa66971304463c017F4D152685B1483cc63Fd116d',
    outbox: '0x5B8220489827Be74CeD6b7974C3a80d3ba8dbf91',
    l2GatewayRouter: '0x650cD99b736173d8AB9aeF9f4b3B5DA8EE054adC',
    source: 'https://portal-data.arbitrum.io/__auto-generated-orbitChains.json',
  },
  // Humanity Testnet — Arbitrum Orbit chain settling to 11155111.
  // Addresses verified with bytecode on the parent chain; portal-data.arbitrum.io orbit registry.
  7080969: {
    chainId: 7080969,
    parentChainId: 11155111,
    rollup: '0x627E5adAA60F15Ed29e16F4e18e481F878d76376',
    inbox: '0x5AAa02fa6A405329CAe9b7F6D744f73CB20bFe2e',
    bridge: '0xA2e0a93Adc142A94C0a0E4e80940298F9c59DeC9',
    l1GatewayRouter: '0x105b7c26707c0D048D8d885d31A3b550e7B6E162',
    l1Erc20Gateway: '0x2D771595616748fA9f31D1434426fE1b0cd2C35b',
    outbox: '0xDE34eC789e300229E6e419aa814452e413CDb69B',
    l2GatewayRouter: '0x13D8B6d796CC2cdE2c28C9cC52E5328384c6fBB0',
    source: 'https://portal-data.arbitrum.io/__auto-generated-orbitChains.json',
  },
  // Plume Testnet — Arbitrum Orbit chain settling to 11155111.
  // Addresses verified with bytecode on the parent chain; portal-data.arbitrum.io orbit registry.
  98867: {
    chainId: 98867,
    parentChainId: 11155111,
    rollup: '0x3B37BeD1c38c6283A56E60340FE813C0BBA031C3',
    inbox: '0xb48cdff890199f5De31514024B95F8664F8Af222',
    bridge: '0xC55b89c17d7a35877FA4ea818fea2a70d5765f1c',
    l1GatewayRouter: '0xF06D7785E023FFdE5E0daAFc40d268c2DD6bB1eD',
    l1Erc20Gateway: '0xB57388059e3e2C13a6cb9E551dA6B5D80dCf8a47',
    outbox: '0x3F6e2Ee3406b18b7F5ce3D0447d3aD8fbc807744',
    l2GatewayRouter: '0x77510dC7fbB7a9861d233404794f6446d4BbFdc7',
    source: 'https://portal-data.arbitrum.io/__auto-generated-orbitChains.json',
  },
  // T-Rex Testnet — Arbitrum Orbit chain settling to 11155111.
  // Addresses verified with bytecode on the parent chain; portal-data.arbitrum.io orbit registry.
  1962: {
    chainId: 1962,
    parentChainId: 11155111,
    rollup: '0x82ea947bB006690667225099cDf87D03A2dd56dC',
    inbox: '0xCb47f0bb29f44e00fbb00324f0E104330Ee1072F',
    bridge: '0x5b1b3C2B531caac8b7A50E65A8d954aDCf8CBc24',
    l1GatewayRouter: '0xa2ea20576C50371136ea1b20A364A82185d4D4a5',
    l1Erc20Gateway: '0xd30F1C65476f47A4D5c54e6c246a5EB6D74295A3',
    outbox: '0x8aB6FA23Ebb58FAa105C108b7F6c27C110828781',
    l1WethGateway: '0xEb801249D7213fE018e562970F1c29A107d52882',
    l1Weth: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
    l2GatewayRouter: '0x00AB824F25ed820A351e0A7b0aF15c3B84755B77',
    l2Weth: '0x24305a5E6F469950E9842e95A7D577D5522E5151',
    source: 'https://portal-data.arbitrum.io/__auto-generated-orbitChains.json',
  },
  // Galactica Cassiopeia Testnet — Arbitrum Orbit chain settling to 11155111.
  // Addresses verified with bytecode on the parent chain; portal-data.arbitrum.io orbit registry.
  843843: {
    chainId: 843843,
    parentChainId: 11155111,
    rollup: '0x2A419230ACA266F4BCddE349936871C6e622529d',
    inbox: '0xb0579056c22aD1fF85a1288f82089B1205447613',
    bridge: '0xD522DC770E2452375AfceD3c3ec96eb784c75570',
    l1GatewayRouter: '0x6E5d41f9a8aA672938f719cC6562676808f9bf60',
    l1Erc20Gateway: '0xe557F0db287eD44f11630dCA4aDf850660f0B38E',
    source: 'https://portal-data.arbitrum.io/__auto-generated-orbitChains.json',
  },
  // HPP Sepolia — Arbitrum Orbit chain settling to 11155111.
  // Addresses verified with bytecode on the parent chain; portal-data.arbitrum.io orbit registry.
  181228: {
    chainId: 181228,
    parentChainId: 11155111,
    rollup: '0x537F6A3606cb000aE568005bebAF8bd1Ea2DE3b6',
    inbox: '0xAAD45a7bF65b43E56767CdE3Ab84A5433c714Afc',
    bridge: '0x1DDe0F57E7889B6866505634E58E3057b01dfed0',
    l1GatewayRouter: '0x8deBBE23AAE151C49609A46ad2b14590e3692F21',
    l1Erc20Gateway: '0x15C7018696e1bDc392C252a28E0accD429D85b3E',
    l1WethGateway: '0xbB0c4391ACBA1e218feE5aD156fA661eBff5545B',
    l1Weth: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
    source: 'https://portal-data.arbitrum.io/__auto-generated-orbitChains.json',
  },
  // JASMY Chain Testnet — Arbitrum Orbit chain settling to 11155111.
  // Addresses verified with bytecode on the parent chain; portal-data.arbitrum.io orbit registry.
  681: {
    chainId: 681,
    parentChainId: 11155111,
    rollup: '0xb4d897FFc6b163414C36A470E5c3B9AE8a4e784E',
    inbox: '0x574DB42697C40492ED620441AA5Ca633E06d1B47',
    bridge: '0x53A868f525D27F1c5De0fd983a7672A501C54853',
    l1GatewayRouter: '0x779922999bFD660e1A4997E2774b472Fbeb6a9D4',
    l1Erc20Gateway: '0xD0e209e57709C34Bba9AF68F515bb0d17fdD6E5E',
    source: 'https://portal-data.arbitrum.io/__auto-generated-orbitChains.json',
  },
  // Mars Chain Testnet — Arbitrum Orbit chain settling to 11155111.
  // Addresses verified with bytecode on the parent chain; portal-data.arbitrum.io orbit registry.
  704852: {
    chainId: 704852,
    parentChainId: 11155111,
    rollup: '0xdc57101751220C05f401b9C7982B183A11B7D173',
    inbox: '0xb78614a722431f15F47bCd873e48A5B1cf9983b1',
    bridge: '0xAA8bb4E9851735E07Fe6ccb29d61def136Cce3E9',
    l1GatewayRouter: '0xDA4BA4BE6e32241B45Af53182e9E5606ba62A7e6',
    l1Erc20Gateway: '0xa43ff360E93fA20551C2Ef49d8cf8ea6E40586Ab',
    source: 'https://portal-data.arbitrum.io/__auto-generated-orbitChains.json',
  },
  // GenLayer Chain Testnet — Arbitrum Orbit chain settling to 11155111.
  // Addresses verified with bytecode on the parent chain; portal-data.arbitrum.io orbit registry.
  4221: {
    chainId: 4221,
    parentChainId: 11155111,
    rollup: '0x96cb416A3defB4Ec596e23806581Eb02f6def71a',
    inbox: '0x0f76cf640B349bA9D66DB844CF420c138C43d49A',
    bridge: '0x4F408768E4eC8Fffb55E84c9ac21801c088C183c',
    l1GatewayRouter: '0x68F084B09c9b34CeD4894313689e1Fb55d114f34',
    l1Erc20Gateway: '0xD28787A5f3fDC85cB3e706978C63583a53C856E7',
    l2GatewayRouter: '0x707DbF4d53390238C96A15C9406881Aec98f9289',
    source: 'https://portal-data.arbitrum.io/__auto-generated-orbitChains.json',
  },
  // WorldMobile Testnet — Arbitrum Orbit chain settling to 84532.
  // Addresses verified with bytecode on the parent chain; portal-data.arbitrum.io orbit registry.
  323432: {
    chainId: 323432,
    parentChainId: 84532,
    rollup: '0xEE0e953FEF4733e93E228207a1DdFDcEDFD650F6',
    inbox: '0xa5099f144FA1ed4A74a6E6dFc6Bb1B4E514FD061',
    bridge: '0x28C3C1FC243DCCDD5Ae2Aa9081fA01b64D69cD21',
    l1GatewayRouter: '0x2dbc704a564975811AbB70991B6E4A281cafe01F',
    l1Erc20Gateway: '0xC837bDe6dBEDE5Fd5EB2A5678f9634985D91E5DD',
    outbox: '0x193cc92D190D5d9d593A8b9242449e1f5AA8a678',
    l1Weth: '0x4200000000000000000000000000000000000006',
    l2GatewayRouter: '0x186f8022a1Cd5D13E92876FA2A63DF45ce40b7C7',
    source: 'https://portal-data.arbitrum.io/__auto-generated-orbitChains.json',
  },
  // Xai Testnet — Arbitrum Orbit chain settling to 421614.
  // Addresses verified with bytecode on the parent chain; portal-data.arbitrum.io orbit registry.
  37714555429: {
    chainId: 37714555429,
    parentChainId: 421614,
    rollup: '0xeedE9367Df91913ab149e828BDd6bE336df2c892',
    inbox: '0x6396825803B720bc6A43c63caa1DcD7B31EB4dd0',
    bridge: '0x6c7FAC4edC72E86B3388B48979eF37Ecca5027e6',
    l1GatewayRouter: '0x185b868DBBF41554465fcb99C6FAb9383E15f47A',
    l1Erc20Gateway: '0xCcB451C4Df22addCFe1447c58bC6b2f264Bb1256',
    outbox: '0xc7491a559b416540427f9f112C5c98b1412c5d51',
    l1Weth: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
    l2GatewayRouter: '0x3B8ba769a43f34cdD67a20aF60d08D54C9C8f1AD',
    source: 'https://portal-data.arbitrum.io/__auto-generated-orbitChains.json',
  },
  // Edge Testnet — Arbitrum Orbit chain settling to 421614.
  // Addresses verified with bytecode on the parent chain; portal-data.arbitrum.io orbit registry.
  33431: {
    chainId: 33431,
    parentChainId: 421614,
    rollup: '0x244935dedb20c68df097abd384b4eff531457867',
    inbox: '0x784702Ec0D8E1CA4B3a062230F2cf748841560F7',
    bridge: '0x399FEA0125A0B8A9782cB0Cdb6DC11669305E68d',
    l1GatewayRouter: '0x3ef0E50bE1063A1FA76319b457F46411Add06d89',
    l1Erc20Gateway: '0x68A6e8A0C10954C2A3D6349d4c1B746f4dCFA8Ab',
    l1WethGateway: '0xdCA777FFCa62E791CC83fc46b8880A7E192050Ee',
    l1Weth: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
    source: 'https://portal-data.arbitrum.io/__auto-generated-orbitChains.json',
  },
}

/** Every Orbit chain that can be deposited into from `parentChainId`. */
export function orbitDepositTargets(parentChainId: number): OrbitBridgeCfg[] {
  return Object.values(ORBIT_BRIDGES).filter((c) => c.parentChainId === parentChainId)
}

export function orbitBridgeFor(chainId: number): OrbitBridgeCfg | null {
  return ORBIT_BRIDGES[chainId] ?? null
}

/**
 * Orbit chains that accept a native ETH retryable ticket.
 *
 * Verified by executing the calldata with eth_call: these four deploy the standard
 * EthInbox signature and the call succeeds. Every other Orbit chain deploys an
 * ERC20Inbox, which takes an extra `tokenTotalFeeAmount` argument and prices the ticket
 * in that chain's own gas token, so a plain ETH deposit does not exist there.
 */
export const ORBIT_ETH_NATIVE = new Set([46630, 1962, 181228, 33431])

/** True when `fromId` is the parent of an Orbit chain that accepts a native ETH deposit. */
export function orbitBridgeAvailable(fromId: number, toId: number): boolean {
  const cfg = ORBIT_BRIDGES[toId]
  return Boolean(cfg) && cfg.parentChainId === fromId && ORBIT_ETH_NATIVE.has(toId)
}
