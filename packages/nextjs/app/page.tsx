"use client";

import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { ArrowsRightLeftIcon, BugAntIcon } from "@heroicons/react/24/outline";
import { useDeployedContractInfo, useTargetNetwork } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const { data: dex } = useDeployedContractInfo({ contractName: "PotosDEX" });

  return (
    <div className="flex items-center flex-col grow pt-10">
      <div className="px-5 max-w-3xl w-full">
        <h1 className="text-center">
          <span className="block text-2xl mb-2">《区块链技术与应用》实训</span>
          <span className="block text-4xl font-bold">POTOS 班级集市</span>
        </h1>
        <div className="flex justify-center items-center space-x-2 flex-col">
          <p className="my-2 font-medium">当前账户</p>
          <Address address={connectedAddress} chain={targetNetwork} />
        </div>

        <div className="card bg-base-100 shadow-md mt-8">
          <div className="card-body gap-2">
            <h2 className="card-title">怎么玩</h2>
            <ol className="list-decimal pl-5 m-0 space-y-1">
              <li>MetaMask 切到 POTOS Testnet，账户里要有一点 POT 付 gas。</li>
              <li>拿你实验 2 发行的代币挂单：卖出多少自己的币，换取多少某位同学的币。</li>
              <li>去订单簿找一单你想要的，点吃单。DEX 在一笔交易里同时完成两笔转账。</li>
              <li>回到「我的代币」看看你集齐了几种同学的代币。</li>
            </ol>
            <p className="text-sm opacity-70 m-0 mt-2">
              集市合约地址：{dex ? <Address address={dex.address} chain={targetNetwork} size="sm" /> : "尚未部署"}
            </p>
          </div>
        </div>
      </div>

      <div className="grow bg-base-300 w-full mt-16 px-8 py-12">
        <div className="flex justify-center items-center gap-12 flex-col md:flex-row">
          <div className="flex flex-col bg-base-100 border border-base-300 px-10 py-10 text-center items-center max-w-xs">
            <ArrowsRightLeftIcon className="h-8 w-8" />
            <p>
              去
              <Link href="/dex" passHref className="link mx-1">
                班级集市
              </Link>
              挂单、吃单
            </p>
          </div>
          <div className="flex flex-col bg-base-100 border border-base-300 px-10 py-10 text-center items-center max-w-xs">
            <BugAntIcon className="h-8 w-8" />
            <p>
              在
              <Link href="/debug" passHref className="link mx-1">
                Debug Contracts
              </Link>
              直接调用合约函数
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
