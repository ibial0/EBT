import { usableSourceTokens, reachableDestTokens, findRoutes } from '../src/lib/routes'
import { nativeToken, USDC_OF } from '../src/config/tokens'
const t0 = Date.now()
const s = usableSourceTokens(11155111, 84532)
console.log('usableSourceTokens(Sepolia->Base):', s.length, 'tokens in', Date.now() - t0, 'ms')
const t1 = Date.now()
const d = reachableDestTokens(11155111, 84532, USDC_OF(11155111)!)
console.log('reachableDestTokens:', d.length, 'in', Date.now() - t1, 'ms')
const t2 = Date.now()
const r = findRoutes(11155111, 84532, nativeToken(11155111), USDC_OF(84532)!)
console.log('findRoutes direct:', r.length, 'in', Date.now() - t2, 'ms')
const t3 = Date.now()
const r2 = findRoutes(5042002, 91342, USDC_OF(5042002)!, nativeToken(91342))
console.log('findRoutes arc->giwa:', r2.length, 'in', Date.now() - t3, 'ms')
