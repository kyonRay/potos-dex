"use client";

import { useState } from "react";
import { TokenAmount } from "./TokenAmount";
import { Address as AddressDisplay } from "@scaffold-ui/components";
import { useAccount } from "wagmi";
import { type Order, useAllOrders, useApproveIfNeeded } from "~~/hooks/dex";
import { useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

const STATUS_LABEL = ["挂单中", "已成交", "已撤单"] as const;
const STATUS_BADGE = ["badge-success", "badge-neutral", "badge-ghost"] as const;

const OrderRow = ({ id, order }: { id: bigint; order: Order }) => {
  const { address: account } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const approveIfNeeded = useApproveIfNeeded();
  const { writeContractAsync: writeDex } = useScaffoldWriteContract({ contractName: "PotosDEX" });
  const [busy, setBusy] = useState(false);

  const isMaker = !!account && account.toLowerCase() === order.maker.toLowerCase();
  const isOpen = order.status === 0;

  const fill = async () => {
    setBusy(true);
    try {
      await approveIfNeeded(order.tokenWant, order.amountWant);
      await writeDex({ functionName: "fillOrder", args: [id] });
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await writeDex({ functionName: "cancelOrder", args: [id] });
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className={isOpen ? "" : "opacity-60"}>
      <td className="font-mono">#{id.toString()}</td>
      <td>
        <div className="flex items-center gap-1">
          <AddressDisplay address={order.maker} chain={targetNetwork} size="xs" onlyEnsOrAddress />
          {isMaker && <span className="badge badge-outline badge-sm">我</span>}
        </div>
      </td>
      <td>
        <TokenAmount token={order.tokenGive} amount={order.amountGive} />
      </td>
      <td>
        <TokenAmount token={order.tokenWant} amount={order.amountWant} />
      </td>
      <td>
        <span className={`badge ${STATUS_BADGE[order.status] ?? ""}`}>{STATUS_LABEL[order.status] ?? "?"}</span>
        {order.status === 1 && (
          <div className="mt-1">
            <AddressDisplay address={order.taker} chain={targetNetwork} size="xs" onlyEnsOrAddress />
          </div>
        )}
      </td>
      <td>
        {isOpen && !isMaker && (
          <button className="btn btn-sm btn-primary" disabled={!account || busy} onClick={fill}>
            {busy ? <span className="loading loading-spinner loading-xs" /> : "吃单"}
          </button>
        )}
        {isOpen && isMaker && (
          <button className="btn btn-sm btn-outline" disabled={busy} onClick={cancel}>
            {busy ? <span className="loading loading-spinner loading-xs" /> : "撤单"}
          </button>
        )}
      </td>
    </tr>
  );
};

/** 订单簿：分页拉全部订单，每个区块刷新 */
export const OrderBook = () => {
  const [onlyOpen, setOnlyOpen] = useState(true);
  const { orders, orderCount, isLoading } = useAllOrders();

  const visible = orders.filter(row => !onlyOpen || row.order.status === 0).reverse();

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body gap-3">
        <div className="flex items-center justify-between">
          <h2 className="card-title">
            订单簿 <span className="badge badge-ghost">{orderCount?.toString() ?? "-"} 单</span>
          </h2>
          <label className="label cursor-pointer gap-2">
            <span className="label-text text-sm">只看挂单中</span>
            <input
              type="checkbox"
              className="toggle toggle-sm"
              checked={onlyOpen}
              onChange={e => setOnlyOpen(e.target.checked)}
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-sm whitespace-nowrap">
            <thead>
              <tr>
                <th>#</th>
                <th>挂单人</th>
                <th>卖出</th>
                <th>换取</th>
                <th>状态</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="text-center">
                    <span className="loading loading-dots" />
                  </td>
                </tr>
              )}
              {!isLoading && visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center opacity-60">
                    还没有订单，去挂第一单
                  </td>
                </tr>
              )}
              {visible.map(row => (
                <OrderRow key={row.id.toString()} id={row.id} order={row.order} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
