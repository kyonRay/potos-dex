import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBlockNumber, useReadContracts } from "wagmi";
import { useDeployedContractInfo, useScaffoldReadContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

export type Order = {
  maker: `0x${string}`;
  tokenGive: `0x${string}`;
  amountGive: bigint;
  tokenWant: `0x${string}`;
  amountWant: bigint;
  status: number;
  taker: `0x${string}`;
};

// 每单约 16k gas，一次 getOrders 读全部会在 ~180 单时超过 RPC 的 eth_call gas 上限，所以分页读
const PAGE_SIZE = 50n;

/** 分页读出全部订单，每个区块刷新 */
export const useAllOrders = () => {
  const { targetNetwork } = useTargetNetwork();
  const { data: dex } = useDeployedContractInfo({ contractName: "PotosDEX" });
  const { data: orderCount } = useScaffoldReadContract({ contractName: "PotosDEX", functionName: "orderCount" });

  const pageStarts: bigint[] = [];
  for (let start = 0n; start < (orderCount ?? 0n); start += PAGE_SIZE) pageStarts.push(start);

  const {
    data: pages,
    isLoading,
    queryKey,
  } = useReadContracts({
    contracts: pageStarts.map(start => ({
      address: dex?.address,
      abi: dex?.abi,
      functionName: "getOrders",
      args: [start, PAGE_SIZE],
      chainId: targetNetwork.id,
    })),
    query: { enabled: !!dex && orderCount !== undefined },
  });

  const queryClient = useQueryClient();
  const { data: blockNumber } = useBlockNumber({ watch: true, chainId: targetNetwork.id });
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockNumber]);

  // id 由页起点推出而不是数组下标，某一页读失败时其余订单的 id 也不会错位
  const orders = (pages ?? []).flatMap((page, p) =>
    ((page.result ?? []) as readonly Order[]).map((order, i) => ({ id: pageStarts[p] + BigInt(i), order })),
  );

  return { orders, orderCount, isLoading: orderCount === undefined || isLoading };
};
