"use client";

import { useState } from "react";
import { AddressInput } from "@scaffold-ui/components";
import { Address, isAddress, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { useApproveIfNeeded, useTokenMeta } from "~~/hooks/dex";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

/**
 * 挂单表单：卖出 A 换取 B。金额按"个"输入，页面按各自代币的 decimals 换算成最小单位。
 * 提交时先 approve（额度不够才发），再 postOrder，两笔交易各弹一次 MetaMask。
 */
export const PostOrderForm = () => {
  const { address: account } = useAccount();
  const [tokenGive, setTokenGive] = useState("");
  const [amountGive, setAmountGive] = useState("");
  const [tokenWant, setTokenWant] = useState("");
  const [amountWant, setAmountWant] = useState("");
  const [busy, setBusy] = useState(false);

  const giveMeta = useTokenMeta(tokenGive);
  const wantMeta = useTokenMeta(tokenWant);
  const approveIfNeeded = useApproveIfNeeded();
  const { writeContractAsync: writeDex } = useScaffoldWriteContract({ contractName: "PotosDEX" });

  const ready =
    !!account &&
    isAddress(tokenGive) &&
    isAddress(tokenWant) &&
    tokenGive.toLowerCase() !== tokenWant.toLowerCase() &&
    giveMeta.decimals !== undefined &&
    wantMeta.decimals !== undefined &&
    Number(amountGive) > 0 &&
    Number(amountWant) > 0;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      const give = parseUnits(amountGive, giveMeta.decimals!);
      const want = parseUnits(amountWant, wantMeta.decimals!);
      await approveIfNeeded(tokenGive as Address, give);
      await writeDex({
        functionName: "postOrder",
        args: [tokenGive as Address, give, tokenWant as Address, want],
      });
      notification.success("挂单成功，代币已托管进 DEX");
      setAmountGive("");
      setAmountWant("");
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body gap-3">
        <h2 className="card-title">挂单</h2>
        <p className="text-sm opacity-70 m-0">
          我卖出 A，换取 B。挂单时 A 会托管进 DEX 合约，任何人整单吃掉后 B 直接进你的钱包；没人吃可以随时撤单。
        </p>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="label text-sm">我卖出的代币（合约地址）</label>
            <AddressInput value={tokenGive} onChange={setTokenGive} placeholder="0x... 你实验 2 的代币" />
            <input
              className="input input-bordered w-full"
              placeholder={`数量${giveMeta.symbol ? `（${giveMeta.symbol}）` : ""}`}
              value={amountGive}
              onChange={e => setAmountGive(e.target.value)}
              type="number"
              min="0"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="label text-sm">我想要的代币（合约地址）</label>
            <AddressInput value={tokenWant} onChange={setTokenWant} placeholder="0x... 同学的代币" />
            <input
              className="input input-bordered w-full"
              placeholder={`数量${wantMeta.symbol ? `（${wantMeta.symbol}）` : ""}`}
              value={amountWant}
              onChange={e => setAmountWant(e.target.value)}
              type="number"
              min="0"
            />
          </div>
        </div>

        {isAddress(tokenGive) && giveMeta.isError && (
          <p className="text-error text-sm m-0">这个地址读不到 symbol/decimals，不像是 ERC20 合约</p>
        )}
        {isAddress(tokenWant) && wantMeta.isError && (
          <p className="text-error text-sm m-0">这个地址读不到 symbol/decimals，不像是 ERC20 合约</p>
        )}

        <div className="card-actions justify-end">
          <button className="btn btn-primary" disabled={!ready || busy} onClick={submit}>
            {busy ? <span className="loading loading-spinner loading-sm" /> : "授权并挂单"}
          </button>
        </div>
      </div>
    </div>
  );
};
