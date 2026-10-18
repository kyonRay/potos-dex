import { Address, erc20Abi, isAddress } from "viem";
import { useReadContract } from "wagmi";

/**
 * 读取任意 ERC20 的 symbol 与 decimals。
 * 用两个独立的 useReadContract 而不是 useReadContracts，因为 POTOS 测试网没有 Multicall3。
 */
export const useTokenMeta = (token?: string) => {
  const enabled = !!token && isAddress(token);
  const address = enabled ? (token as Address) : undefined;

  const { data: symbol, isError: symbolError } = useReadContract({
    address,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled, staleTime: 5 * 60 * 1000 },
  });
  const { data: decimals, isError: decimalsError } = useReadContract({
    address,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled, staleTime: 5 * 60 * 1000 },
  });

  return {
    symbol: symbol as string | undefined,
    decimals: decimals as number | undefined,
    isError: symbolError || decimalsError,
  };
};
