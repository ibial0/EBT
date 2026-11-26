
import { toFunctionSelector } from 'viem'
const sigs = [
 'AlreadyInit()','AlreadySpent(uint256)','BadPostUpgradeInit()','BridgeCallFailed()',
 'NotRollupOrOwner(address,address,address)','NotAContract(address)','AlreadySpent(uint256)',
 'RootMismatch()','NotSpent(uint256)','RollupNotChanged()','NotInitialized()','InvalidProof()',
 'AlreadySpent(uint256 index)','DataTooLarge()','NotFound()','BadSendRoot()','NotConfirmed()',
 'SendRootNotFound(bytes32)','AlreadySpentIndex(uint256)','InvalidMerkleProof()'
]
for (const s of sigs) { try { console.log(toFunctionSelector(s), s) } catch(e){} }
