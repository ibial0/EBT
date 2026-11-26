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
    "address": "0x46C29547f4B75c9f18cEc5b114cF3ce3231A66f8",
    "fee": 100,
    "token0": "0x3600000000000000000000000000000000000000",
    "token1": "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    "verifiedReserve0": "156661",
    "verifiedReserve1": "11827793",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 5042002,
    "address": "0xc4Abb91884094972FC6634c0D91Bb9f9332277f1",
    "fee": 500,
    "token0": "0x3600000000000000000000000000000000000000",
    "token1": "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    "verifiedReserve0": "39880083899",
    "verifiedReserve1": "34068568263",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 5042002,
    "address": "0x1c02648cf14Ece64Afc1af141C177760AEc7013a",
    "fee": 3000,
    "token0": "0x3600000000000000000000000000000000000000",
    "token1": "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    "verifiedReserve0": "7585170203769",
    "verifiedReserve1": "6065190091538",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 5042002,
    "address": "0xfF615E968e1d50980972b2E291571dF2aEF10919",
    "fee": 10000,
    "token0": "0x3600000000000000000000000000000000000000",
    "token1": "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    "verifiedReserve0": "70377905096",
    "verifiedReserve1": "72274247821",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 5042002,
    "address": "0x7330519D79141BF281AE040b460cAc87FC4c676E",
    "fee": 500,
    "token0": "0x3600000000000000000000000000000000000000",
    "token1": "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF",
    "verifiedReserve0": "15265504473",
    "verifiedReserve1": "4143674",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 5042002,
    "address": "0xa231458f45727CbFa45c1181b25CccB911ca163a",
    "fee": 3000,
    "token0": "0x3600000000000000000000000000000000000000",
    "token1": "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF",
    "verifiedReserve0": "201469291425",
    "verifiedReserve1": "57399408",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 5042002,
    "address": "0x4301Aba1AE52614a3412CAC2E1a780e346d2Cff9",
    "fee": 10000,
    "token0": "0x3600000000000000000000000000000000000000",
    "token1": "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF",
    "verifiedReserve0": "64256595364",
    "verifiedReserve1": "15967169",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 5042002,
    "address": "0x54E6a86F3f2FCd9b8FDF84ca228951feCBd470Ec",
    "fee": 500,
    "token0": "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    "token1": "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF",
    "verifiedReserve0": "10954839544",
    "verifiedReserve1": "3820713",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 5042002,
    "address": "0x035641936aAc893DAB0CB6E506c36eCc07B53702",
    "fee": 3000,
    "token0": "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    "token1": "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF",
    "verifiedReserve0": "52377463967",
    "verifiedReserve1": "18223868",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 5042002,
    "address": "0x6cb2f7B446F2BDFF5d237537336Ef06BEa4D7d28",
    "fee": 10000,
    "token0": "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    "token1": "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF",
    "verifiedReserve0": "1937694680",
    "verifiedReserve1": "714521",
    "verifiedAt": "2026-11-26"
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
  },
  {
    "chainId": 421614,
    "address": "0x152c469626C706E201721F13eb470691E4E81c5D",
    "fee": 100,
    "token0": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    "token1": "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73",
    "verifiedReserve0": "1388113",
    "verifiedReserve1": "16893214078089609",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 421614,
    "address": "0x6F112d524DC998381C09b4e53C7e5e2cc260f877",
    "fee": 500,
    "token0": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    "token1": "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73",
    "verifiedReserve0": "484270",
    "verifiedReserve1": "24433223387361378",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 421614,
    "address": "0x66EEAB70aC52459Dd74C6AD50D578Ef76a441bbf",
    "fee": 3000,
    "token0": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    "token1": "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73",
    "verifiedReserve0": "9464573648",
    "verifiedReserve1": "960297452910686462",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 421614,
    "address": "0x3eCedaB7E9479E29B694d8590dc34e0Ce6059868",
    "fee": 10000,
    "token0": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    "token1": "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73",
    "verifiedReserve0": "153071950",
    "verifiedReserve1": "133289146153059987",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 421614,
    "address": "0x1CcD58e854f9b0881cEc94AdB0D327Cb16e75CCc",
    "fee": 500,
    "token0": "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73",
    "token1": "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
    "verifiedReserve0": "19166551540816988",
    "verifiedReserve1": "11438915154698831841",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 421614,
    "address": "0x57B033D7ab4288B40CF080bd2FA9B9D924407015",
    "fee": 3000,
    "token0": "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73",
    "token1": "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
    "verifiedReserve0": "20825322015484692",
    "verifiedReserve1": "14416577210254393286",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x9713eb44CCa49f95b2d94Ea7008e5CCd5AebdDf1",
    "fee": 500,
    "token0": "0x33e4191705c386532ba27cBF171Db86919200B94",
    "token1": "0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F",
    "verifiedReserve0": "2697910797656535317",
    "verifiedReserve1": "2342619320038308528488",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x9640AFcBc2310d011B7b71a76975e919D9B6Fa4A",
    "fee": 3000,
    "token0": "0x33e4191705c386532ba27cBF171Db86919200B94",
    "token1": "0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F",
    "verifiedReserve0": "2022360388213413798104",
    "verifiedReserve1": "143211807050559282339229",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x43ffC1D309AfD02b4E349911fE9c782d48EC5427",
    "fee": 10000,
    "token0": "0x33e4191705c386532ba27cBF171Db86919200B94",
    "token1": "0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F",
    "verifiedReserve0": "329396302203107091913",
    "verifiedReserve1": "22948335873744488378437",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x242eE443E66E2DFF77287C9639CDc13Fd9a42C77",
    "fee": 500,
    "token0": "0x33e4191705c386532ba27cBF171Db86919200B94",
    "token1": "0xC5124C846c6e6307986988dFb7e743327aA05F19",
    "verifiedReserve0": "8383393695684952335",
    "verifiedReserve1": "16405882327365792274",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x2Daa36EA45d5BB50249a1a16dFD21cB027bCa666",
    "fee": 3000,
    "token0": "0x33e4191705c386532ba27cBF171Db86919200B94",
    "token1": "0xC5124C846c6e6307986988dFb7e743327aA05F19",
    "verifiedReserve0": "864715128618274832250",
    "verifiedReserve1": "1903636830612507155184",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x9cf9d9359B7db19C7D4b6F5b233F8F0Dc9F1A3D6",
    "fee": 10000,
    "token0": "0x33e4191705c386532ba27cBF171Db86919200B94",
    "token1": "0xC5124C846c6e6307986988dFb7e743327aA05F19",
    "verifiedReserve0": "175720737987818098855",
    "verifiedReserve1": "352571097524195710641",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x5F05Bc624115cD84D775346811C9cfe2131a4649",
    "fee": 500,
    "token0": "0x33e4191705c386532ba27cBF171Db86919200B94",
    "token1": "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    "verifiedReserve0": "2248298091987244393",
    "verifiedReserve1": "643714648922122359786",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x52Da6b2ea089D0FB2054b057a88D8Aa516Cb54C3",
    "fee": 3000,
    "token0": "0x33e4191705c386532ba27cBF171Db86919200B94",
    "token1": "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    "verifiedReserve0": "20485157857936305125",
    "verifiedReserve1": "23173513939646998926959",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x2Ad1916Faee9e9748df4FB891F896E1B0CE45C7E",
    "fee": 10000,
    "token0": "0x33e4191705c386532ba27cBF171Db86919200B94",
    "token1": "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    "verifiedReserve0": "1362057690564957122",
    "verifiedReserve1": "802739457358136429116",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x14768ae6E6c655E9dF62256B18D7dF85501C24fC",
    "fee": 500,
    "token0": "0x33e4191705c386532ba27cBF171Db86919200B94",
    "token1": "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    "verifiedReserve0": "396544599308112860",
    "verifiedReserve1": "1137359349152859724711",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x593e2e0EF3869616Ec3Fbe989dCFf2699D52b69B",
    "fee": 3000,
    "token0": "0x33e4191705c386532ba27cBF171Db86919200B94",
    "token1": "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    "verifiedReserve0": "30339517578458603154",
    "verifiedReserve1": "31907228840867800651567",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x70F03dBdD0BB28Fc4ef4c74485E4d7e72205994c",
    "fee": 10000,
    "token0": "0x33e4191705c386532ba27cBF171Db86919200B94",
    "token1": "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    "verifiedReserve0": "1064096664538952017",
    "verifiedReserve1": "926857532976053687223",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xA132e66EDD001ddfd92Bb453BD8C54906351CCEB",
    "fee": 500,
    "token0": "0x33e4191705c386532ba27cBF171Db86919200B94",
    "token1": "0x71178BAc73cBeb415514eB542a8995b82669778d",
    "verifiedReserve0": "6135134469989618393",
    "verifiedReserve1": "1424976138152163742387",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x51cc359a19dfD16217Cd6C186e1476f78768588D",
    "fee": 3000,
    "token0": "0x33e4191705c386532ba27cBF171Db86919200B94",
    "token1": "0x71178BAc73cBeb415514eB542a8995b82669778d",
    "verifiedReserve0": "19436362073090792259",
    "verifiedReserve1": "28176723964410688464358",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x691B90b449d0d2aAfF1755e32E11d4D7407987D1",
    "fee": 10000,
    "token0": "0x33e4191705c386532ba27cBF171Db86919200B94",
    "token1": "0x71178BAc73cBeb415514eB542a8995b82669778d",
    "verifiedReserve0": "1173522720470859742",
    "verifiedReserve1": "772972882662005037788",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xE17a996e14cD652cEe29f6af8B427b4641b9f6F0",
    "fee": 500,
    "token0": "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    "token1": "0x33e4191705c386532ba27cBF171Db86919200B94",
    "verifiedReserve0": "627343077983669690462",
    "verifiedReserve1": "2570571973274004503",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x4dAC9Debe44d3aA104ab66f09Debb40C59F4A283",
    "fee": 3000,
    "token0": "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    "token1": "0x33e4191705c386532ba27cBF171Db86919200B94",
    "verifiedReserve0": "27285500403573192446347",
    "verifiedReserve1": "16124597788605985668",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xC62A46EB59197a8253e4caB484eAfA8FD0AED18A",
    "fee": 10000,
    "token0": "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    "token1": "0x33e4191705c386532ba27cBF171Db86919200B94",
    "verifiedReserve0": "897793417209981154543",
    "verifiedReserve1": "1391003523063672822",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x026F4e9e08b5d07e4c3E00bcf10a6A3456613FC5",
    "fee": 500,
    "token0": "0x33e4191705c386532ba27cBF171Db86919200B94",
    "token1": "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    "verifiedReserve0": "1586349875001093664",
    "verifiedReserve1": "521381727129942533068",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x3274D3092aA2e1a9321aB2cB04697C87c5a389b0",
    "fee": 3000,
    "token0": "0x33e4191705c386532ba27cBF171Db86919200B94",
    "token1": "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    "verifiedReserve0": "17970310654396462875",
    "verifiedReserve1": "25531938564419602293760",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x9f72f15699b73AdcbB0A75b1E3304084658b260E",
    "fee": 10000,
    "token0": "0x33e4191705c386532ba27cBF171Db86919200B94",
    "token1": "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    "verifiedReserve0": "1312597875964720371",
    "verifiedReserve1": "810383932954723185115",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xCc546879Ce73A888170fFA0485bC9bc8a41fC0D2",
    "fee": 500,
    "token0": "0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F",
    "token1": "0xC5124C846c6e6307986988dFb7e743327aA05F19",
    "verifiedReserve0": "1753620038793684971951",
    "verifiedReserve1": "37649445640722634688",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xA0780f7286A3e4fAFD292A51dAa35Ef3130C88FE",
    "fee": 3000,
    "token0": "0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F",
    "token1": "0xC5124C846c6e6307986988dFb7e743327aA05F19",
    "verifiedReserve0": "175250830790862890568122",
    "verifiedReserve1": "5196872066124454924159",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x02711b28f1EFC5A306ABf8E78BAc446fe963cfcD",
    "fee": 10000,
    "token0": "0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F",
    "token1": "0xC5124C846c6e6307986988dFb7e743327aA05F19",
    "verifiedReserve0": "82074116201276477129186",
    "verifiedReserve1": "2795881478069022862318",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x0A837200fB77687ba9b749E5174bd9a09E51286A",
    "fee": 3000,
    "token0": "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    "token1": "0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F",
    "verifiedReserve0": "361484122745456779856543",
    "verifiedReserve1": "24365758882874309717102",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x28007aCa8B2c9b1cb670eF6a277E9d7bd34b72B2",
    "fee": 10000,
    "token0": "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    "token1": "0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F",
    "verifiedReserve0": "915401020868770139843",
    "verifiedReserve1": "93051036574704227477",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x8f1304370A11Df1De9058597960686A01d747A72",
    "fee": 500,
    "token0": "0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F",
    "token1": "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    "verifiedReserve0": "22160061276439623387",
    "verifiedReserve1": "278787194144077586084",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xFfEf1147c3724a19AB7328F4e361C049ba452dA9",
    "fee": 3000,
    "token0": "0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F",
    "token1": "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    "verifiedReserve0": "21598036744351909871392",
    "verifiedReserve1": "330709708534062164827045",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x4df7eFFBd174D67fe9cDb9c349e0a89fD6Cab957",
    "fee": 10000,
    "token0": "0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F",
    "token1": "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    "verifiedReserve0": "200318147604441631433",
    "verifiedReserve1": "1629653790762223489393",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x44697c5f09b301Bc116859F0F5541167B7879b08",
    "fee": 500,
    "token0": "0x71178BAc73cBeb415514eB542a8995b82669778d",
    "token1": "0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F",
    "verifiedReserve0": "361676433807697870751",
    "verifiedReserve1": "39706034586119266532",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xae12d50f75ea3f4Cf983Af1272614754e7F5e813",
    "fee": 3000,
    "token0": "0x71178BAc73cBeb415514eB542a8995b82669778d",
    "token1": "0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F",
    "verifiedReserve0": "381146219867077743381937",
    "verifiedReserve1": "20809923137978858759074",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x6B4b28CA45Ea4b368C22DFFE56b66d1E8b9EE414",
    "fee": 10000,
    "token0": "0x71178BAc73cBeb415514eB542a8995b82669778d",
    "token1": "0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F",
    "verifiedReserve0": "10531391915480261386394",
    "verifiedReserve1": "544457662949508284454",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xb6AdC34E20afADc739E6587565fD9443ee0a9b2A",
    "fee": 500,
    "token0": "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    "token1": "0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F",
    "verifiedReserve0": "11757111850639423779",
    "verifiedReserve1": "11740567279359503221",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x82A81E9EdB32958104A2c9514b8Fc85F972b53Af",
    "fee": 3000,
    "token0": "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    "token1": "0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F",
    "verifiedReserve0": "335705667605890148616680",
    "verifiedReserve1": "18576148766265403667875",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x1cA65F8BbC5e3676e28fE5fd51f7efec10348B19",
    "fee": 10000,
    "token0": "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    "token1": "0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F",
    "verifiedReserve0": "1016223726611962512422",
    "verifiedReserve1": "122782095175756712828",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x1E56A3d850aBB031F707571196245FE008346128",
    "fee": 500,
    "token0": "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    "token1": "0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F",
    "verifiedReserve0": "315659441789957842515",
    "verifiedReserve1": "25270717130486840646",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xcD8a64d13D5B99Dc546a3D6FFD8e5C7dD0Ecb1a0",
    "fee": 3000,
    "token0": "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    "token1": "0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F",
    "verifiedReserve0": "391230409916797269366546",
    "verifiedReserve1": "19662799883768452303702",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xC0b6F7C201fbC8e2fF7eC2D99B1eeD2F41240E26",
    "fee": 10000,
    "token0": "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    "token1": "0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F",
    "verifiedReserve0": "274056226310408776618",
    "verifiedReserve1": "22220155831702080012",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x88858b158ddC87A41aa5bA27fEdB2b4AcAFeCFDB",
    "fee": 500,
    "token0": "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    "token1": "0xC5124C846c6e6307986988dFb7e743327aA05F19",
    "verifiedReserve0": "27768232849510314806",
    "verifiedReserve1": "164764512854277633",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x202F1CF9dC0959E031CdEdDC77775b361eE38F5C",
    "fee": 3000,
    "token0": "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    "token1": "0xC5124C846c6e6307986988dFb7e743327aA05F19",
    "verifiedReserve0": "85617572406743432778956",
    "verifiedReserve1": "203454269958569397147",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x8808E6052E1471DBbBC805436bDB6612cE914222",
    "fee": 10000,
    "token0": "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    "token1": "0xC5124C846c6e6307986988dFb7e743327aA05F19",
    "verifiedReserve0": "1745428583482721010308",
    "verifiedReserve1": "9884745470878855311",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xf46fBB3FF4dbBd9574B1F16dFb0d2bFC51d17F81",
    "fee": 500,
    "token0": "0xC5124C846c6e6307986988dFb7e743327aA05F19",
    "token1": "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    "verifiedReserve0": "7569183189460571091",
    "verifiedReserve1": "949095485402587314275",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x72A998Ef8d7f4580a9cb9CD6EDEAD1b5e66f574d",
    "fee": 3000,
    "token0": "0xC5124C846c6e6307986988dFb7e743327aA05F19",
    "token1": "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    "verifiedReserve0": "228980623950816951954",
    "verifiedReserve1": "99830367878387618607775",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x3cf874d06F115C67580245a18cB3b58adf16973F",
    "fee": 10000,
    "token0": "0xC5124C846c6e6307986988dFb7e743327aA05F19",
    "token1": "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    "verifiedReserve0": "2670430791928632639",
    "verifiedReserve1": "321583526302864109923",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x06f37b55eC1586DE56934bC49F884194580e701C",
    "fee": 500,
    "token0": "0x71178BAc73cBeb415514eB542a8995b82669778d",
    "token1": "0xC5124C846c6e6307986988dFb7e743327aA05F19",
    "verifiedReserve0": "417209516263350748377",
    "verifiedReserve1": "2028982190067699624",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x7851d2AD470033559eD6Db3804F0E4D0FE9cFF6F",
    "fee": 3000,
    "token0": "0x71178BAc73cBeb415514eB542a8995b82669778d",
    "token1": "0xC5124C846c6e6307986988dFb7e743327aA05F19",
    "verifiedReserve0": "25238487254503218515247",
    "verifiedReserve1": "47972251066061262676",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xafA0002417A88E3996Aa0E74543277B909824FfA",
    "fee": 10000,
    "token0": "0x71178BAc73cBeb415514eB542a8995b82669778d",
    "token1": "0xC5124C846c6e6307986988dFb7e743327aA05F19",
    "verifiedReserve0": "1033130506007226417000",
    "verifiedReserve1": "4567581793351458017",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x90781e518c6E9E0Db0C719D4Cf0729db1230bD36",
    "fee": 500,
    "token0": "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    "token1": "0xC5124C846c6e6307986988dFb7e743327aA05F19",
    "verifiedReserve0": "39999999999999999962",
    "verifiedReserve1": "4899853838061971539",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x955DB6368483BB2EC2c65cf5E59E8F709A32f78D",
    "fee": 3000,
    "token0": "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    "token1": "0xC5124C846c6e6307986988dFb7e743327aA05F19",
    "verifiedReserve0": "72807380676363528190263",
    "verifiedReserve1": "134695380593105256714",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x3550a3bc32672184B3bbCC970208AFffD9F8FEbE",
    "fee": 10000,
    "token0": "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    "token1": "0xC5124C846c6e6307986988dFb7e743327aA05F19",
    "verifiedReserve0": "1192433678607497745235",
    "verifiedReserve1": "5846403254992033410",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x252b981E872bEd269F74B5460edcfC29893584a2",
    "fee": 500,
    "token0": "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    "token1": "0xC5124C846c6e6307986988dFb7e743327aA05F19",
    "verifiedReserve0": "719408646635108739843",
    "verifiedReserve1": "2960029517849927978",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x3b0e730b5E46Ee2B0bf970D4Cb8e7D7A4cCB112F",
    "fee": 3000,
    "token0": "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    "token1": "0xC5124C846c6e6307986988dFb7e743327aA05F19",
    "verifiedReserve0": "42191104839164341417051",
    "verifiedReserve1": "76600354642377199895",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xb3fEc8c2dDc606F09774905C37ebbe6ED9056989",
    "fee": 10000,
    "token0": "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    "token1": "0xC5124C846c6e6307986988dFb7e743327aA05F19",
    "verifiedReserve0": "319067524670124056553",
    "verifiedReserve1": "1356193223431822053",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xa53de45efF01cb3B0f0080bB6b513559833F1474",
    "fee": 500,
    "token0": "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    "token1": "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    "verifiedReserve0": "224395492186079051756",
    "verifiedReserve1": "154246012717713460308",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x07f39115f3c14bD30A381c0A5bb55fD804FCF799",
    "fee": 3000,
    "token0": "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    "token1": "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    "verifiedReserve0": "11981736985481970985315",
    "verifiedReserve1": "15256869672087615661099",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x797582960fd0FCf2208C2c735deBF6Fb2191d8BC",
    "fee": 10000,
    "token0": "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    "token1": "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    "verifiedReserve0": "455336053861740064197",
    "verifiedReserve1": "191491218781317757490",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x5e2feA11818F4D989291a3414554EC9D1648D1f1",
    "fee": 500,
    "token0": "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    "token1": "0x71178BAc73cBeb415514eB542a8995b82669778d",
    "verifiedReserve0": "585666024155604012860",
    "verifiedReserve1": "630403947535276191130",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x2F107F30f6AeA7f6de7391AC913C83A800846a89",
    "fee": 3000,
    "token0": "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    "token1": "0x71178BAc73cBeb415514eB542a8995b82669778d",
    "verifiedReserve0": "31495545271361846088533",
    "verifiedReserve1": "41415672971924553022424",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xBa27C39753293546190dC92d37F770113DC00543",
    "fee": 10000,
    "token0": "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    "token1": "0x71178BAc73cBeb415514eB542a8995b82669778d",
    "verifiedReserve0": "915177090182045470026",
    "verifiedReserve1": "908164516412844688839",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xBAD86693988eaa88084fbe964247eD5a4b5aB943",
    "fee": 500,
    "token0": "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    "token1": "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    "verifiedReserve0": "890706254905059923153",
    "verifiedReserve1": "688982194864541288236",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xBD28E5aE2a740556C5085c50957E25d0673478bE",
    "fee": 3000,
    "token0": "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    "token1": "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    "verifiedReserve0": "5477515938308546986905",
    "verifiedReserve1": "4940803972485293982650",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x6CdF4a4f5fEF1e0e546d848325c973e407670edb",
    "fee": 10000,
    "token0": "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    "token1": "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    "verifiedReserve0": "2038659128833782205753",
    "verifiedReserve1": "1409641670059516452179",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x3790b3Bb4067034CcF7ABB04DD936b5Bc3f835a1",
    "fee": 500,
    "token0": "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    "token1": "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    "verifiedReserve0": "291627555602807701822",
    "verifiedReserve1": "286410123972204106606",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xE21a5fc1B6cd2113efe61268b7dF6166CD50a6B4",
    "fee": 3000,
    "token0": "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    "token1": "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    "verifiedReserve0": "13460585365948617221409",
    "verifiedReserve1": "10778603799702721357149",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xf72c7AD2831CDC69A4c759a4b0Bd7F5247647F33",
    "fee": 10000,
    "token0": "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    "token1": "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
    "verifiedReserve0": "475417238919770620771",
    "verifiedReserve1": "478848359446596395899",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xA410A40284682cd21Fd6530BC05E663796F3E440",
    "fee": 500,
    "token0": "0x71178BAc73cBeb415514eB542a8995b82669778d",
    "token1": "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    "verifiedReserve0": "219386521094274847562",
    "verifiedReserve1": "181061037352254883445",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x97088c76Bc40C052d586797753E331e3b4Bb9bca",
    "fee": 3000,
    "token0": "0x71178BAc73cBeb415514eB542a8995b82669778d",
    "token1": "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    "verifiedReserve0": "6597697846430535514106",
    "verifiedReserve1": "6100046647255865554690",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x03Be1A6E44C189292c9E45E31B7aEED0610609A0",
    "fee": 10000,
    "token0": "0x71178BAc73cBeb415514eB542a8995b82669778d",
    "token1": "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    "verifiedReserve0": "549822703726434930572",
    "verifiedReserve1": "429187508254248969543",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x05A538A68257abeED9A6621133aeFFb5666c9BBF",
    "fee": 500,
    "token0": "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    "token1": "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    "verifiedReserve0": "342661719336151930445",
    "verifiedReserve1": "262855988791975303239",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x60bEC5865C5B2fFb3F1293bd439cdD021f521042",
    "fee": 3000,
    "token0": "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    "token1": "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    "verifiedReserve0": "6042288025099525764676",
    "verifiedReserve1": "6385035481679550808376",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x8682c3ea4c68332bd4569cf4C8B1C46B55FbA89E",
    "fee": 10000,
    "token0": "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    "token1": "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    "verifiedReserve0": "621398907164558599539",
    "verifiedReserve1": "466728407305791760682",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xb8FCf62d72d3d347211a0Ed4a9B2B65Db08E3d5f",
    "fee": 500,
    "token0": "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    "token1": "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    "verifiedReserve0": "326627038167271082952",
    "verifiedReserve1": "241691180187091405303",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xd463abdE38F40a412aC3BF06D14Eebc8BE17888F",
    "fee": 3000,
    "token0": "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    "token1": "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    "verifiedReserve0": "11405550872212215279086",
    "verifiedReserve1": "11744392176908818237214",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xF30dA39cFc7127fe7F628a60dE30C771C77baFfe",
    "fee": 10000,
    "token0": "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    "token1": "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
    "verifiedReserve0": "262143238791815581338",
    "verifiedReserve1": "192738981508841417831",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x8fAFC8E278C20dAbAeAB929D0a6970f519895B61",
    "fee": 500,
    "token0": "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    "token1": "0x71178BAc73cBeb415514eB542a8995b82669778d",
    "verifiedReserve0": "239117038520704641124",
    "verifiedReserve1": "223179873835838199925",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xcb69F61707c2a2221C6DF39FaaB1CFBCa33659Eb",
    "fee": 3000,
    "token0": "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    "token1": "0x71178BAc73cBeb415514eB542a8995b82669778d",
    "verifiedReserve0": "2945323574319842221159",
    "verifiedReserve1": "3098323945742368830827",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x946d54709D247C65E2e71740A524f953d85F308F",
    "fee": 10000,
    "token0": "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    "token1": "0x71178BAc73cBeb415514eB542a8995b82669778d",
    "verifiedReserve0": "645701663845975780555",
    "verifiedReserve1": "754250986238225283964",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xAC59f59676FDc7eB2827eF42eA42fF56f52195Fc",
    "fee": 500,
    "token0": "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    "token1": "0x71178BAc73cBeb415514eB542a8995b82669778d",
    "verifiedReserve0": "119708922747331879055",
    "verifiedReserve1": "118708922747331879055",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x046d61a5C0fB41C54974Efe0Da3667ab2223675D",
    "fee": 3000,
    "token0": "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    "token1": "0x71178BAc73cBeb415514eB542a8995b82669778d",
    "verifiedReserve0": "6493591929117294292864",
    "verifiedReserve1": "8086175240281270825353",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0xfB8886eaf00d9D8F0516Cf269Fb3df2C9727d30C",
    "fee": 10000,
    "token0": "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    "token1": "0x71178BAc73cBeb415514eB542a8995b82669778d",
    "verifiedReserve0": "341838495286121753104",
    "verifiedReserve1": "320054362652225342097",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x8eE327F5D0a726f57c93a612585e1d6F4774035D",
    "fee": 500,
    "token0": "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    "token1": "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    "verifiedReserve0": "30999999999999999996",
    "verifiedReserve1": "28999999999999999996",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x44DD8Cf09FF6179F34BB58A27373D34D3A226bFc",
    "fee": 3000,
    "token0": "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    "token1": "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    "verifiedReserve0": "14427451091996688510516",
    "verifiedReserve1": "18088267155038295700236",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 46630,
    "address": "0x14Aa19572db057ADA69225f26220bD0E2F6C072E",
    "fee": 10000,
    "token0": "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
    "token1": "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
    "verifiedReserve0": "5559550569271401490523",
    "verifiedReserve1": "1305518504657828316630",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 11155111,
    "address": "0xCFE991Ce422B04b6271EC2a8aBBEfBcA381021A2",
    "fee": 100,
    "token0": "0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4",
    "token1": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "verifiedReserve0": "8491",
    "verifiedReserve1": "14714",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 11155111,
    "address": "0x68adf381B8F9e9e100bb6E13d50b14094e3b6a9d",
    "fee": 500,
    "token0": "0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4",
    "token1": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "verifiedReserve0": "44266960",
    "verifiedReserve1": "538102851",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 11155111,
    "address": "0xF3B99e8DeFf7B8d5A9bb8A6641c047821878a8DF",
    "fee": 3000,
    "token0": "0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4",
    "token1": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "verifiedReserve0": "7732353",
    "verifiedReserve1": "126796378",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 11155111,
    "address": "0xCC7D4c741622340E5dAD84582b958cEE67273022",
    "fee": 10000,
    "token0": "0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4",
    "token1": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "verifiedReserve0": "2366832",
    "verifiedReserve1": "10606186",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 11155111,
    "address": "0x7e65f34fa94C4E5f58E4FB73B82968c1A8F036dB",
    "fee": 100,
    "token0": "0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "7119906",
    "verifiedReserve1": "707198669293812",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 11155111,
    "address": "0x1b025D4b5478072e7Fe7DCFf654e6009B162B423",
    "fee": 3000,
    "token0": "0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "1967479680",
    "verifiedReserve1": "251443560778883338",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 11155111,
    "address": "0x375e90bE947AD1a573e0b90ca58d44280E3C1010",
    "fee": 3000,
    "token0": "0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "2084227819121064577246",
    "verifiedReserve1": "1084187368308470",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 11155111,
    "address": "0x97aA940C7A327f569C13C8416C2805e530B87F78",
    "fee": 10000,
    "token0": "0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "69799507475131509066413",
    "verifiedReserve1": "86883148205146135",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 11155111,
    "address": "0xba09E75749973Ce095121dfc02ec8D8364eE1AC9",
    "fee": 3000,
    "token0": "0xc4bF5CbDaBE595361438F8c6a187bDc330539c60",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "30946971822348003028644737",
    "verifiedReserve1": "161530432048392035",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 11155111,
    "address": "0xCcc455Fc237DcDa0167F72f6d1f749491b49FB9A",
    "fee": 3000,
    "token0": "0x6d906e526a4e2Ca02097BA9d0caA3c382F52278E",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "17344735",
    "verifiedReserve1": "14251135451630340",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 84532,
    "address": "0x43047A302cD99DDb32E32B2886B40935b60aD2C1",
    "fee": 500,
    "token0": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "token1": "0x808456652fdb597867f38412077A9182bf77359F",
    "verifiedReserve0": "1385168292",
    "verifiedReserve1": "282133135",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 84532,
    "address": "0xD7BC968b6fEa7154f89F6b72039809A225Da0eDB",
    "fee": 500,
    "token0": "0x4200000000000000000000000000000000000006",
    "token1": "0x808456652fdb597867f38412077A9182bf77359F",
    "verifiedReserve0": "29488168990859",
    "verifiedReserve1": "10598291",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 84532,
    "address": "0x3911184a1f07D9d3c7635436499323F6972869c4",
    "fee": 3000,
    "token0": "0x4200000000000000000000000000000000000006",
    "token1": "0x808456652fdb597867f38412077A9182bf77359F",
    "verifiedReserve0": "59521956575919",
    "verifiedReserve1": "817348",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 84532,
    "address": "0xa56DB863f91678C133A93238f9477e63ECb332f1",
    "fee": 100,
    "token0": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "token1": "0xE4aB69C077896252FAFBD49EFD26B5D171A32410",
    "verifiedReserve0": "15000000",
    "verifiedReserve1": "999999999999892361",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 84532,
    "address": "0x147890A28cfD948F727f088e56E8b0BcbDf2178E",
    "fee": 10000,
    "token0": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "token1": "0xE4aB69C077896252FAFBD49EFD26B5D171A32410",
    "verifiedReserve0": "25324943",
    "verifiedReserve1": "35159123",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 84532,
    "address": "0x78c470050f092ff228329C5267FEDA8A03d14d93",
    "fee": 3000,
    "token0": "0x4200000000000000000000000000000000000006",
    "token1": "0xE4aB69C077896252FAFBD49EFD26B5D171A32410",
    "verifiedReserve0": "12948385227337994",
    "verifiedReserve1": "81127908727113373301",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 84532,
    "address": "0xE047504D53BC5FAB8A0a327f2fc5fC9A03DC5c0a",
    "fee": 10000,
    "token0": "0x4200000000000000000000000000000000000006",
    "token1": "0xE4aB69C077896252FAFBD49EFD26B5D171A32410",
    "verifiedReserve0": "46843036741303967",
    "verifiedReserve1": "118563789847562784018",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 84532,
    "address": "0xAF53CAb0C0414A2e8C2f5a7eFab0A5a622944D7e",
    "fee": 500,
    "token0": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "token1": "0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a",
    "verifiedReserve0": "1107971",
    "verifiedReserve1": "406247949",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 11124,
    "address": "0xf170e21a104d144Ba2dDE05CEF7d0BC6832bA483",
    "fee": 500,
    "token0": "0x9EDCde0257F2386Ce177C3a7FCdd97787F0D841d",
    "token1": "0xe4C7fBB0a626ed208021ccabA6Be1566905E2dFc",
    "verifiedReserve0": "74450288986652646",
    "verifiedReserve1": "7240",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 11124,
    "address": "0xef58Ee803C3384630c1A81941840a1C7D0521D58",
    "fee": 3000,
    "token0": "0x9EDCde0257F2386Ce177C3a7FCdd97787F0D841d",
    "token1": "0xe4C7fBB0a626ed208021ccabA6Be1566905E2dFc",
    "verifiedReserve0": "353792100942306212302",
    "verifiedReserve1": "612429216250",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 11124,
    "address": "0x042f0478c80995c525ca893dDc67F6Eac41B4758",
    "fee": 10000,
    "token0": "0x9EDCde0257F2386Ce177C3a7FCdd97787F0D841d",
    "token1": "0xe4C7fBB0a626ed208021ccabA6Be1566905E2dFc",
    "verifiedReserve0": "16884486396412",
    "verifiedReserve1": "13991",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 296,
    "address": "0x914B98992d7eD602D1f5d9084ECe8160Fc0e741a",
    "fee": 3000,
    "token0": "0x0000000000000000000000000000000000001549",
    "token1": "0x0000000000000000000000000000000000003aD2",
    "verifiedReserve0": "29397742223",
    "verifiedReserve1": "778737763939",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 296,
    "address": "0x37814eDc1ae88cf27c0C346648721FB04e7E0AE7",
    "fee": 3000,
    "token0": "0x0000000000000000000000000000000000003aD2",
    "token1": "0x0000000000000000000000000000000000120f46",
    "verifiedReserve0": "3176865566065",
    "verifiedReserve1": "1327336091135",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 296,
    "address": "0xE1A05C0885470dF9AAc2DC6dC184CE5AdC478289",
    "fee": 3000,
    "token0": "0x0000000000000000000000000000000000003aD2",
    "token1": "0x0000000000000000000000000000000000428957",
    "verifiedReserve0": "86432488686",
    "verifiedReserve1": "9999001712733",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 296,
    "address": "0x6A32800F4A339D157Cf816eE8FCF965a857cd5e3",
    "fee": 3000,
    "token0": "0x0000000000000000000000000000000000003aD2",
    "token1": "0x00000000000000000000000000000000003991eD",
    "verifiedReserve0": "782943555367",
    "verifiedReserve1": "341898765018",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 97,
    "address": "0x3E9eB43FDcbC21790008AFc127AbE261F048ed58",
    "fee": 500,
    "token0": "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd",
    "token1": "0x64544969ed7EBf5f083679233325356EbE738930",
    "verifiedReserve0": "8599370744844041249",
    "verifiedReserve1": "8599370744844041249",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 97,
    "address": "0x2dbB5a4c235164B9f772179A43faca2c71a8abDB",
    "fee": 500,
    "token0": "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd",
    "token1": "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
    "verifiedReserve0": "10185849655331548555",
    "verifiedReserve1": "10185849655331548555",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 97,
    "address": "0xACf30D531C2DAc92a99a917d41Fa98ce7FBbED17",
    "fee": 100,
    "token0": "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd",
    "token1": "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee",
    "verifiedReserve0": "545360024206973696867",
    "verifiedReserve1": "545360024206973696867",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 97,
    "address": "0x3AD3f791d0e04bA135f28Ee385d1e0e6BB01FCfa",
    "fee": 100,
    "token0": "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd",
    "token1": "0xFa60D973F7642B748046464e165A65B7323b0DEE",
    "verifiedReserve0": "687376534786619541791142924",
    "verifiedReserve1": "687376534786619541791142924",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 97,
    "address": "0x055b47c48D1886dF6D653d51Cfe595F84e9A214d",
    "fee": 500,
    "token0": "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd",
    "token1": "0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06",
    "verifiedReserve0": "1581544427403815780",
    "verifiedReserve1": "1581544427403815780",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 97,
    "address": "0x6baD9Cb227548c98D74409aD50b0497a0EB17d11",
    "fee": 500,
    "token0": "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
    "token1": "0x64544969ed7EBf5f083679233325356EbE738930",
    "verifiedReserve0": "11471983204407980859",
    "verifiedReserve1": "11471983204407980859",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 97,
    "address": "0x110F83ebF344aCB880B0e2a9dB0908b90178254f",
    "fee": 500,
    "token0": "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
    "token1": "0xFa60D973F7642B748046464e165A65B7323b0DEE",
    "verifiedReserve0": "37950103902179356785851",
    "verifiedReserve1": "37950103902179356785851",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 97,
    "address": "0x26e888A6d81B5A9Ce7C3D1346035E1f270dAc993",
    "fee": 500,
    "token0": "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee",
    "token1": "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
    "verifiedReserve0": "1294727569772396112",
    "verifiedReserve1": "1294727569772396112",
    "verifiedAt": "2026-11-26"
  },
  {
    "chainId": 97,
    "address": "0x88668219c1937f9F838DA0e328caDd0B71ABcA93",
    "fee": 100,
    "token0": "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee",
    "token1": "0xFa60D973F7642B748046464e165A65B7323b0DEE",
    "verifiedReserve0": "197578474394538410496",
    "verifiedReserve1": "197578474394538410496",
    "verifiedAt": "2026-11-26"
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
