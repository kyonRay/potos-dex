"use client";

import type { NextPage } from "next";
import { MyTokens } from "~~/components/dex/MyTokens";
import { OrderBook } from "~~/components/dex/OrderBook";
import { PostOrderForm } from "~~/components/dex/PostOrderForm";
import { RecentTrades } from "~~/components/dex/RecentTrades";

const DexPage: NextPage = () => {
  return (
    <div className="flex flex-col gap-6 max-w-6xl w-full mx-auto px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold m-0">班级集市</h1>
        <p className="opacity-70 m-0 mt-1">
          拿你实验 2 发行的代币来换同学的代币。挂单托管、整单成交、一笔交易内原子互换。
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <PostOrderForm />
          <OrderBook />
        </div>
        <div className="flex flex-col gap-6">
          <MyTokens />
          <RecentTrades />
        </div>
      </div>
    </div>
  );
};

export default DexPage;
