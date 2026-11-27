
import { tokensForChain } from '../src/config/tokens'
console.log(tokensForChain(46630).map(t => `${t.symbol} ${t.address} ${t.decimals}`).join('\n'))
