/**
 * Verified Uniswap v3 pools, discovered on chain 2026-11-23 by
 * `scripts/pools.ts` (factory.getPool -> pool.liquidity -> token balances).
 * A pool is listed only when `liquidity()` was non-zero and both reserves
 * could be read. Reserves are re-read live by `src/lib/liquidity.ts`;
 * the numbers here are the discovery snapshot used to decide what to show.
 */
import type { Address } from './chains'

export interface PoolCfg {
  chainId: number
  address: Address
  /** Uniswap v3 fee tier in hundredths of a bip: 100 = 0.01%, 10000 = 1% */
  fee: number
  token0: Address
  token1: Address
  verifiedReserve0: string
  verifiedReserve1: string
  verifiedAt: string
}

export const POOLS: PoolCfg[] = [
  {
    "chainId": 1301,
    "address": "0xE87b0A6C6611119deCF5C4e9203E1c46F561BdAE",
    "fee": 100,
    "token0": "0x31d0220469e10c4E71834a79b1f276d740d3768F",
    "token1": "0x4200000000000000000000000000000000000006",
    "verifiedReserve0": "42014588378",
    "verifiedReserve1": "3772514428467693984",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 1301,
    "address": "0xBeAD5792bB6C299AB11Eaa425aC3fE11ebA47b3B",
    "fee": 500,
    "token0": "0x31d0220469e10c4E71834a79b1f276d740d3768F",
    "token1": "0x4200000000000000000000000000000000000006",
    "verifiedReserve0": "2076600831",
    "verifiedReserve1": "2673961759605389782",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 1301,
    "address": "0x8F463126bBEA80A10DF9Bf6FF5455B6B0292B34e",
    "fee": 3000,
    "token0": "0x31d0220469e10c4E71834a79b1f276d740d3768F",
    "token1": "0x4200000000000000000000000000000000000006",
    "verifiedReserve0": "13747449155",
    "verifiedReserve1": "12514608542111072502",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 1301,
    "address": "0xa88bF2bF5583b386B19E73D1a26A5Ab0Fa90f12D",
    "fee": 10000,
    "token0": "0x31d0220469e10c4E71834a79b1f276d740d3768F",
    "token1": "0x4200000000000000000000000000000000000006",
    "verifiedReserve0": "208608076643",
    "verifiedReserve1": "42083414198080918051",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 84532,
    "address": "0x57183717A087d2fe3Ad890873877244c3B96156c",
    "fee": 100,
    "token0": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "token1": "0x4200000000000000000000000000000000000006",
    "verifiedReserve0": "136332682",
    "verifiedReserve1": "52275803144775563",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 84532,
    "address": "0x94bfc0574FF48E92cE43d495376C477B1d0EEeC0",
    "fee": 500,
    "token0": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "token1": "0x4200000000000000000000000000000000000006",
    "verifiedReserve0": "503563173",
    "verifiedReserve1": "25926487314142203",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 84532,
    "address": "0x46880b404CD35c165EDdefF7421019F8dD25F4Ad",
    "fee": 3000,
    "token0": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "token1": "0x4200000000000000000000000000000000000006",
    "verifiedReserve0": "44244626292",
    "verifiedReserve1": "4420791961596887455",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 84532,
    "address": "0x4664755562152EDDa3a3073850FB62835451926a",
    "fee": 10000,
    "token0": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "token1": "0x4200000000000000000000000000000000000006",
    "verifiedReserve0": "16507710",
    "verifiedReserve1": "19714730856043871",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 5042002,
    "address": "0x911aFa2C1B51a8fe23511359AB58F73AD7b81D94",
    "fee": 100,
    "token0": "0x3600000000000000000000000000000000000000",
    "token1": "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    "verifiedReserve0": "4640228",
    "verifiedReserve1": "1000196",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 5042002,
    "address": "0xFC1109e67e39C697819b69A34561c5330c952a8F",
    "fee": 3000,
    "token0": "0x3600000000000000000000000000000000000000",
    "token1": "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    "verifiedReserve0": "3715075",
    "verifiedReserve1": "543972",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 5042002,
    "address": "0x7A1ccE68c3AA18E02Ad60F68e58c8161fd2CB155",
    "fee": 10000,
    "token0": "0x3600000000000000000000000000000000000000",
    "token1": "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    "verifiedReserve0": "28684438",
    "verifiedReserve1": "1266691",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x294A263412D5Be965b45Bd93121CA58813F68b07",
    "fee": 100,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "verifiedReserve0": "31704233762",
    "verifiedReserve1": "54958582749590138",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x6E81F4a9bE879CE9FCBAD4Eafc9311fB9e766299",
    "fee": 500,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "verifiedReserve0": "51020132184",
    "verifiedReserve1": "107456147709604103",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x349492f65C8B27efEF83456189b85D0Fa32afCcd",
    "fee": 3000,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "verifiedReserve0": "197740020",
    "verifiedReserve1": "168011091714084",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x3855551c7c0c9E38e1a936f9939F2e187c22B767",
    "fee": 10000,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "verifiedReserve0": "11756579340",
    "verifiedReserve1": "34242001569025153",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x1Ba31Bd4650Cd9720Ee8837Bc6cCa5e1BdB151D4",
    "fee": 3000,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0x29f2D40B0605204364af54EC677bD022dA425d03",
    "verifiedReserve0": "19642654",
    "verifiedReserve1": "628857682",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x2d021e62D1aE41946846462d4bD8A85BB3d49C2c",
    "fee": 3000,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    "verifiedReserve0": "6170079729",
    "verifiedReserve1": "35912816523503120771",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x9C02D38A5A61bdc83b63B73f3776C4622a21d3cc",
    "fee": 100,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    "verifiedReserve0": "22508834",
    "verifiedReserve1": "2795493373",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0xfef3Ae91E2050AcCB4dA6033C6EB3b1BC4E3a1a5",
    "fee": 500,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    "verifiedReserve0": "448778653",
    "verifiedReserve1": "13303686223601",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0xCfDFab545198cC61da2156aA25607023F01814dF",
    "fee": 3000,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    "verifiedReserve0": "32295670",
    "verifiedReserve1": "4218851631",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0xFeEd501c2B21D315F04946F85fC6416B640240b5",
    "fee": 100,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "429579893696",
    "verifiedReserve1": "5959801456846468805",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x3289680dD4d6C10bb19b899729cda5eEF58AEfF1",
    "fee": 500,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "53481441798010",
    "verifiedReserve1": "119401705596513896128",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x6Ce0896eAE6D4BD668fDe41BB784548fb8F59b50",
    "fee": 3000,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "3431725151673",
    "verifiedReserve1": "65722329114594688632",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x6418EEC70f50913ff0d756B48d32Ce7C02b47C47",
    "fee": 10000,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "42485836784454",
    "verifiedReserve1": "1333764216040580066061",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0xAb3Aa251Ca3E750f630d2EEb6e0d72F65b4865B0",
    "fee": 10000,
    "token0": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "token1": "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    "verifiedReserve0": "55258667403973668",
    "verifiedReserve1": "355488692466765791653",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0xa23B8f156d2158836cc815cB35f0f18B853A386e",
    "fee": 3000,
    "token0": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "token1": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    "verifiedReserve0": "211193068586640",
    "verifiedReserve1": "12237817326",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0xb8b672bdd9cFF3D0979e7344c7358CA12E78a1F0",
    "fee": 100,
    "token0": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "1133013168814814610",
    "verifiedReserve1": "21964909819986693711",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x224Cc4e5b50036108C1d862442365054600c260C",
    "fee": 500,
    "token0": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "5719532514076937388",
    "verifiedReserve1": "114604961547648782414",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x287B0e934ed0439E2a7b1d5F0FC25eA2c24b64f7",
    "fee": 3000,
    "token0": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "64823265417907541040",
    "verifiedReserve1": "863760944578764886184",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x51aDC79e7760aC5317a0d05e7a64c4f9cB2d4369",
    "fee": 10000,
    "token0": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "20797636586969661060",
    "verifiedReserve1": "312713682542607439298",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x39CCc2b87c54c7bA26D7DeDF215652F6a10a7d7c",
    "fee": 3000,
    "token0": "0x29f2D40B0605204364af54EC677bD022dA425d03",
    "token1": "0x68194a729C2450ad26072b3D33ADaCbcef39D574",
    "verifiedReserve0": "10009078",
    "verifiedReserve1": "1078524187662633",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x4b053461dd564CF8e0d2F9E3b73D78BD837de765",
    "fee": 3000,
    "token0": "0x29f2D40B0605204364af54EC677bD022dA425d03",
    "token1": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    "verifiedReserve0": "2925071340267",
    "verifiedReserve1": "314371578211",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x1293173e5426C03ba6E9a3067cA235b8C5BC646F",
    "fee": 10000,
    "token0": "0x29f2D40B0605204364af54EC677bD022dA425d03",
    "token1": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    "verifiedReserve0": "192917924",
    "verifiedReserve1": "1121846004",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0xD1787BA366fea7F69212Dfc0a3637ACfEFdf7f25",
    "fee": 500,
    "token0": "0x29f2D40B0605204364af54EC677bD022dA425d03",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "1404337859279",
    "verifiedReserve1": "67557434745940148",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x695F5440917727B19E58D712A2f259dac905B790",
    "fee": 500,
    "token0": "0x68194a729C2450ad26072b3D33ADaCbcef39D574",
    "token1": "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    "verifiedReserve0": "586885864321001461929",
    "verifiedReserve1": "1719526730469639196",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x8F0630E71579ADa6A26187818A4AB792fF2F62C8",
    "fee": 3000,
    "token0": "0x68194a729C2450ad26072b3D33ADaCbcef39D574",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "6416913369123347759066",
    "verifiedReserve1": "28614150895190067",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x61F4FC9E845edC6F9E5af4eF82cdD8D9c26B0c90",
    "fee": 10000,
    "token0": "0x68194a729C2450ad26072b3D33ADaCbcef39D574",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "211049999999584513349",
    "verifiedReserve1": "377668274619",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x3C36878e3060AD03bD0B8C03E6DAB2D1686Aa38B",
    "fee": 100,
    "token0": "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    "token1": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    "verifiedReserve0": "262303740925040273",
    "verifiedReserve1": "2945352005",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x9e2bCA4c6ac6cC5028403AeC9D2cAF901EbA5D08",
    "fee": 100,
    "token0": "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "177705163295251145994",
    "verifiedReserve1": "330004310629861611",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x9BB3Ea0b68491F2a0cf2776C850cbB566022B345",
    "fee": 500,
    "token0": "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "123352475905658304440",
    "verifiedReserve1": "374170608650676244",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0xDD7CC9a0dA070fB8B60dC6680b596133fb4A7100",
    "fee": 3000,
    "token0": "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "1481457728158353181821",
    "verifiedReserve1": "2688396282227118368",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0xA470a353577901AA8cDCb828BB616ef41d58B88a",
    "fee": 10000,
    "token0": "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "13920262518399146945660",
    "verifiedReserve1": "35145573798139944297",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0xF34a455337252055B0398FB77a091eeBCEd36224",
    "fee": 100,
    "token0": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "8994571746",
    "verifiedReserve1": "392827503197233",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0xA8e0af24d703845504b0841e53777793Ea56120b",
    "fee": 500,
    "token0": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "288304424548",
    "verifiedReserve1": "14711015649021356",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x46bb6bb1b27069C652AA40ddbF47854b1C426428",
    "fee": 3000,
    "token0": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "4303196526513",
    "verifiedReserve1": "468137319229272995",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x58D850667c47981a1b6E7cA0b8Dc2eb937Cd4119",
    "fee": 10000,
    "token0": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "730835354608815",
    "verifiedReserve1": "28105863939487609555",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155420,
    "address": "0xEB18BA6D2d8408A87EE5Ac4264C8dbb73ad538eb",
    "fee": 500,
    "token0": "0x4200000000000000000000000000000000000006",
    "token1": "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
    "verifiedReserve0": "141435615166534429",
    "verifiedReserve1": "81514024",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155420,
    "address": "0x8955C97261722d87D83D00708Bbe5f6B5b4477d6",
    "fee": 3000,
    "token0": "0x4200000000000000000000000000000000000006",
    "token1": "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
    "verifiedReserve0": "3292538100106825",
    "verifiedReserve1": "413241",
    "verifiedAt": "2026-11-23"
  }
]
export function poolsForChain(chainId: number): PoolCfg[] {
  return POOLS.filter((p) => p.chainId === chainId)
}

/** Distinct tradeable pairs on a chain, one entry per unordered token pair. */
export function pairsForChain(chainId: number): Array<{ token0: Address; token1: Address }> {
  const seen = new Set<string>()
  const out: Array<{ token0: Address; token1: Address }> = []
  for (const p of poolsForChain(chainId)) {
    const a = p.token0.toLowerCase()
    const b = p.token1.toLowerCase()
    const key = a < b ? `${a}-${b}` : `${b}-${a}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ token0: p.token0, token1: p.token1 })
  }
  return out
}
