"use client";

import { Address as AddressDisplay } from "@scaffold-ui/components";
import { formatUnits } from "viem";
import { useTokenMeta } from "~~/hooks/dex";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

type TokenAmountProps = {
  token: `0x${string}`;
  amount: bigint;
};

/** 显示 "12.5 ZS0123" 加上代币合约地址，symbol 读不到时退回显示原始数值 */
export const TokenAmount = ({ token, amount }: TokenAmountProps) => {
  const { symbol, decimals, isError } = useTokenMeta(token);
  const { targetNetwork } = useTargetNetwork();

  const display =
    decimals !== undefined ? formatUnits(amount, decimals) : isError ? `${amount.toString()} (raw)` : "...";

  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono font-semibold">
        {display} {symbol ?? (isError ? "?" : "")}
      </span>
      <AddressDisplay address={token} chain={targetNetwork} size="xs" onlyEnsOrAddress />
    </div>
  );
};
