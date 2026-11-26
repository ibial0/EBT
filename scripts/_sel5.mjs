import { toFunctionSelector } from 'viem'
const sigs = ["AlreadyInit()", "AlreadySpent(uint256)", "BadPostUpgradeInit()", "BridgeCallFailed()", "HadZeroInit()", "MerkleProofTooLong(uint256,uint256)", "NotOwner(address,address)", "NotRollup(address,address)", "PathNotMinimal(uint256,uint256)", "ProofTooLong(uint256)", "RollupNotChanged()", "SimulationOnlyEntrypoint()", "UnknownRoot(bytes32)"]
for (const s of sigs) console.log(toFunctionSelector(s), s)
