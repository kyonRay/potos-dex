"use client";

import { Address as AddressDisplay } from "@scaffold-ui/components";
import { erc20Abi, formatUnits } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { useAllOrders, useTokenMeta } from "~~/hooks/dex";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

const TokenBalanceRow = ({ token, balance }: { token: `0x${string}`; balance: bigint | undefined }) => {
  const { targetNetwork } = useTargetNetwork();
  const { symbol, decimals } = useTokenMeta(token);
  const has = balance !== undefined && balance > 0n;

  return (
    <tr className={has ? "" : "opacity-50"}>
      <td>
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold">{symbol ?? "..."}</span>
          <AddressDisplay address={token} chain={targetNetwork} size="xs" onlyEnsOrAddress />
        </div>
      </td>
      <td className="font-mono text-right">
        {balance !== undefined && decimals !== undefined ? formatUnits(balance, decimals) : "-"}
      </td>
    </tr>
  );
};

/**
 * 集市里出现过的所有代币，以及我各持有多少。
 * 代币列表从订单簿推导（tokenGive 与 tokenWant 去重），不需要额外索引。
 */
export const MyTokens = () => {
  const { address: account } = useAccount();
  const { orders } = useAllOrders();

  const tokens = Array.from(
    new Set(orders.flatMap(({ order }) => [order.tokenGive.toLowerCase(), order.tokenWant.toLowerCase()])),
  ) as `0x${string}`[];

  // 余额在这里一次批量读出，才能把有余额的代币排到前面（sort 是稳定的，其余保持订单簿顺序）
  const { data: balanceResults } = useReadContracts({
    contracts: tokens.map(token => ({
      address: token,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account!],
    })),
    query: { enabled: !!account && tokens.length > 0 },
  });
  const rows = tokens
    .map((token, i) => ({ token, balance: balanceResults?.[i]?.result as bigint | undefined }))
    .sort((a, b) => Number((b.balance ?? 0n) > 0n) - Number((a.balance ?? 0n) > 0n));

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body gap-3">
        <h2 className="card-title">
          我的代币 <span className="badge badge-ghost">集市里出现过 {tokens.length} 种</span>
        </h2>
        {!account && <p className="text-sm opacity-70 m-0">连接钱包后显示余额</p>}
        <div className="overflow-x-auto">
          <table className="table table-sm whitespace-nowrap">
            <thead>
              <tr>
                <th>代币</th>
                <th className="text-right">我的余额</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <TokenBalanceRow key={row.token} token={row.token} balance={row.balance} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
