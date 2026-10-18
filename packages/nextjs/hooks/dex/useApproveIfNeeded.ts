import { Address, erc20Abi } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useDeployedContractInfo, useTransactor } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

/**
 * 挂单和吃单之前都要先让 DEX 有权从用户账户划走代币。
 * 返回一个函数：额度不够就发一笔 approve 并等它上链，够了就直接返回。
 */
export const useApproveIfNeeded = () => {
  const { address: account } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { data: dex } = useDeployedContractInfo({ contractName: "PotosDEX" });
  const writeTx = useTransactor();

  return async (token: Address, amount: bigint) => {
    if (!account || !publicClient || !walletClient || !dex) {
      notification.error("请先连接钱包");
      throw new Error("wallet not ready");
    }

    const allowance = await publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "allowance",
      args: [account, dex.address],
    });
    if (allowance >= amount) return;

    await writeTx(() =>
      walletClient.writeContract({
        address: token,
        abi: erc20Abi,
        functionName: "approve",
        args: [dex.address, amount],
      }),
    );
  };
};
