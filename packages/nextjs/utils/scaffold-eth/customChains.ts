import { defineChain } from "viem";

/**
 * POTOS 测试网：基于 FISCO BCOS 的 EVM 兼容链。
 * 链上没有部署 Multicall3，所以这里不声明 contracts.multicall3，wagmi 会退回逐个 eth_call。
 */
export const potosTestnet = defineChain({
  id: 60600,
  name: "POTOS Testnet",
  nativeCurrency: { name: "POTOS Token", symbol: "POT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc-testnet.potos.hk"] },
  },
  blockExplorers: {
    default: { name: "POTOS Testnet Explorer", url: "https://scan-testnet.potos.hk" },
  },
  testnet: true,
});
