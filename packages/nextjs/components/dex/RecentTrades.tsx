"use client";

import { Address as AddressDisplay } from "@scaffold-ui/components";
import { useScaffoldEventHistory, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-eth";

/** 最近成交：直接读 OrderFilled 事件，展示"事件就是链上日志"这一点 */
export const RecentTrades = () => {
  const { targetNetwork } = useTargetNetwork();
  // 课堂规模的合约事件很少，直接 getLogs 足够；生产环境应换成索引服务
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const { data: events, isLoading } = useScaffoldEventHistory({
    contractName: "PotosDEX",
    eventName: "OrderFilled",
    watch: true,
  });

  const latest = [...(events ?? [])].slice(0, 20);

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body gap-3">
        <h2 className="card-title">最近成交</h2>
        {isLoading && <span className="loading loading-dots" />}
        {!isLoading && latest.length === 0 && <p className="text-sm opacity-60 m-0">还没有成交记录</p>}
        <ul className="flex flex-col gap-3 m-0 p-0 list-none divide-y divide-base-200 [&>li:not(:first-child)]:pt-3">
          {latest.map(ev => {
            const txLink = getBlockExplorerTxLink(targetNetwork.id, ev.transactionHash);
            return (
              <li key={`${ev.transactionHash}-${ev.logIndex}`} className="flex flex-col gap-1 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="badge badge-outline badge-sm">#{ev.args.id?.toString()}</span>
                  {txLink && (
                    <a className="link text-xs opacity-70" href={txLink} target="_blank" rel="noreferrer">
                      区块 {ev.blockNumber?.toString()}
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="flex items-center gap-2">
                    <AddressDisplay address={ev.args.taker} chain={targetNetwork} size="xs" onlyEnsOrAddress />
                    <span className="opacity-60">吃了</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <AddressDisplay address={ev.args.maker} chain={targetNetwork} size="xs" onlyEnsOrAddress />
                    <span className="opacity-60">的单</span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
