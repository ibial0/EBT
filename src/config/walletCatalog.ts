/**
 * Wallet catalog.
 *
 * Every entry here can actually be connected by this app once its extension is present:
 * EVM wallets inject window.ethereum, Solana/Sui/Aptos wallets are discovered through
 * Wallet Standard, and the remaining families have an explicit provider in
 * lib/walletsMulti.ts. Wallets we cannot connect are deliberately absent — a row that
 * can never connect is worse than no row.
 *
 * Rows show "Install" until detection finds the extension; the card links to the
 * wallet's own download page.
 */

export interface CatalogEntry {
  key: string
  name: string
  families: Array<'evm' | 'solana' | 'sui' | 'aptos' | 'starknet' | 'cosmos' | 'stellar' | 'algorand' | 'near' | 'polkadot' | 'xrpl'>
  installUrl: string
}

export const WALLET_CATALOG: CatalogEntry[] = [
  // EVM (injected)
  { key: 'metamask', name: 'MetaMask', families: ['evm'], installUrl: 'https://metamask.io/download/' },
  { key: 'rabby', name: 'Rabby Wallet', families: ['evm'], installUrl: 'https://rabby.io/' },
  { key: 'coinbase', name: 'Coinbase Wallet', families: ['evm'], installUrl: 'https://www.coinbase.com/wallet' },
  { key: 'trust', name: 'Trust Wallet', families: ['evm'], installUrl: 'https://trustwallet.com/' },
  { key: 'brave', name: 'Brave Wallet', families: ['evm'], installUrl: 'https://brave.com/wallet/' },
  { key: 'rainbow', name: 'Rainbow', families: ['evm'], installUrl: 'https://rainbow.me/' },
  { key: 'zerion', name: 'Zerion', families: ['evm'], installUrl: 'https://zerion.io/' },
  { key: 'enkrypt', name: 'Enkrypt', families: ['evm'], installUrl: 'https://www.enkrypt.com/' },
  { key: 'frame', name: 'Frame', families: ['evm'], installUrl: 'https://frame.sh/' },

  // Multichain
  { key: 'phantom', name: 'Phantom', families: ['evm', 'solana'], installUrl: 'https://phantom.app/' },
  { key: 'okx', name: 'OKX Wallet', families: ['evm', 'solana', 'sui', 'aptos', 'starknet'], installUrl: 'https://web3.okx.com/' },
  { key: 'coin98', name: 'Coin98', families: ['evm', 'solana'], installUrl: 'https://coin98.com/' },
  { key: 'nightly', name: 'Nightly', families: ['solana', 'sui', 'aptos', 'near'], installUrl: 'https://nightly.app/' },

  // Solana
  { key: 'solflare', name: 'Solflare', families: ['solana'], installUrl: 'https://solflare.com/' },
  { key: 'backpack', name: 'Backpack', families: ['solana'], installUrl: 'https://backpack.app/' },
  { key: 'glow', name: 'Glow', families: ['solana'], installUrl: 'https://glow.app/' },

  // Sui
  { key: 'slush', name: 'Slush', families: ['sui'], installUrl: 'https://slush.app/' },
  { key: 'suiet', name: 'Suiet', families: ['sui'], installUrl: 'https://suiet.app/' },

  // Aptos
  { key: 'petra', name: 'Petra', families: ['aptos'], installUrl: 'https://petra.app/' },
  { key: 'pontem', name: 'Pontem', families: ['aptos'], installUrl: 'https://pontem.network/' },

  // Starknet
  { key: 'argent', name: 'Argent X', families: ['starknet'], installUrl: 'https://www.argent.xyz/argent-x/' },
  { key: 'braavos', name: 'Braavos', families: ['starknet'], installUrl: 'https://braavos.app/' },

  // Cosmos
  { key: 'keplr', name: 'Keplr', families: ['cosmos'], installUrl: 'https://www.keplr.app/' },
  { key: 'leap', name: 'Leap', families: ['cosmos'], installUrl: 'https://www.leapwallet.io/' },

  // Stellar
  { key: 'freighter', name: 'Freighter', families: ['stellar'], installUrl: 'https://www.freighter.app/' },
  { key: 'xbull', name: 'xBull', families: ['stellar'], installUrl: 'https://xbull.app/' },

  // Algorand
  { key: 'algorand', name: 'Algorand Wallet', families: ['algorand'], installUrl: 'https://perawallet.app/' },

  // NEAR
  { key: 'meteor', name: 'Meteor Wallet', families: ['near'], installUrl: 'https://meteorwallet.app/' },
  { key: 'near', name: 'NEAR Wallet', families: ['near'], installUrl: 'https://wallet.near.org/' },

  // Polkadot
  { key: 'talisman', name: 'Talisman', families: ['polkadot'], installUrl: 'https://talisman.xyz/' },
  { key: 'subwallet', name: 'SubWallet', families: ['polkadot'], installUrl: 'https://subwallet.app/' },
  { key: 'polkadotjs', name: 'Polkadot.js', families: ['polkadot'], installUrl: 'https://polkadot.js.org/extension/' },

  // XRP Ledger
  { key: 'crossmark', name: 'Crossmark', families: ['xrpl'], installUrl: 'https://crossmark.io/' },
  { key: 'gemwallet', name: 'GemWallet', families: ['xrpl'], installUrl: 'https://gemwallet.app/' },
]
