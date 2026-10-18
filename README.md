# POTOS 班级集市（potos-dex）

《区块链技术与应用》实训用的 ERC20 挂单簿。老师部署一份到 POTOS 测试网，全班学生拿各自在实验 2 发行的代币挂单、吃单，在一笔交易内完成原子互换。基于 [Scaffold-ETH 2](https://scaffoldeth.io)（Hardhat 3 + Next.js + Wagmi + Viem）。

## 合约

`packages/hardhat/contracts/PotosDEX.sol`

| 函数 | 说明 |
|---|---|
| `postOrder(tokenGive, amountGive, tokenWant, amountWant)` | 挂单。把 amountGive 个 tokenGive 托管进合约，换取 amountWant 个 tokenWant。调用前需先 approve 本合约 |
| `fillOrder(id)` | 整单吃单。taker 付 amountWant 个 tokenWant 给 maker，同时收到托管的 tokenGive。两次转账在同一笔交易内，要么都成功要么都回滚 |
| `cancelOrder(id)` | maker 撤单，托管代币原路退回 |
| `getOrder(id)` / `getOrders(start, count)` / `orderCount()` | 查询 |
| 事件 `OrderPosted` / `OrderFilled` / `OrderCancelled` | 前端订单簿和成交记录来源 |

设计取舍：挂单即托管（保证每单都能被吃）、只支持整单成交、无手续费、无管理员、任何 ERC20 都能挂。用 OpenZeppelin 的 `SafeERC20` 和 `ReentrancyGuard`，Solidity 0.8.30，EVM 目标固定为 `paris`（POTOS 不支持 Shanghai 之后的新指令）。

`DemoToken.sol` 只用于本地演示和单元测试，课堂上学生用自己的代币。

## 本地开发

```bash
yarn install
yarn chain            # 终端 1：本地 Hardhat 链
yarn deploy           # 终端 2：部署 PotosDEX 和两个演示代币到本地链
yarn start            # 终端 3：http://localhost:3000
yarn hardhat:test     # 单元测试（含 gas 统计）
```

本地链上 `DemoTokens` 部署脚本会给 Hardhat 前几个账户各发一些 ALC 和 BOB，可以直接在页面上挂单吃单。

## 部署到 POTOS 测试网

私钥只走环境变量，不写进任何文件：

```bash
export __RUNTIME_DEPLOYER_PRIVATE_KEY=0x你的私钥      # 账户里要有 POT
yarn deploy --network potosTestnet --tags PotosDEX
```

部署后 `packages/nextjs/contracts/deployedContracts.ts` 会自动更新，前端默认目标网络已经是 POTOS Testnet（`packages/nextjs/scaffold.config.ts`）。演示代币不要部署到测试网，所以上面带了 `--tags PotosDEX`。

网络参数：Chain ID 60600，RPC `https://rpc-testnet.potos.hk`，浏览器 `https://scan-testnet.potos.hk`，水龙头 `https://faucet-testnet.potos.hk`。测试网当前 gas price 约 21000 wei，一次吃单约 10 万 gas，水龙头每次领的 0.001 POT 足够做几百笔交易。

前端部署：`yarn next:build` 后用任意静态托管，或 `yarn vercel`。校内访问建议放到学校服务器上跑 `yarn next:serve`。

## 页面

`/dex`：

- 挂单表单：填代币地址和数量（按"个"，页面按各代币 decimals 换算），一键"授权并挂单"，额度不够时先弹 approve 再弹 postOrder。
- 订单簿：全部订单，默认只看挂单中；别人的单显示"吃单"，自己的单显示"撤单"。
- 我的代币：集市里出现过的所有代币及我的余额，用来看"集齐了几种同学的代币"。
- 最近成交：直接读 `OrderFilled` 事件。

## 课堂上怎么用

1. 老师提前部署合约，把前端跑起来，在实验 2 第 8 节之后开放。
2. 每位学生：给自己 mint 一些代币，挂至少一单（卖自己的币换某位同学的币），吃至少一单，最后"我的代币"里至少有 3 种同学的币。
3. 报告里贴挂单、吃单交易的哈希，以及"我的代币"截图；地址和哈希全班唯一。
4. 讲解点：挂单和吃单为什么都要先 approve 给 DEX 而不是给对方；一笔 fillOrder 交易里有几次 transferFrom、事件日志里有几个 Transfer；taker 没 approve 时为什么 maker 的托管代币一分不少。

## 目录

```
packages/hardhat/contracts/PotosDEX.sol      合约
packages/hardhat/contracts/DemoToken.sol     演示代币
packages/hardhat/deploy/00_deploy_dex.ts     部署 DEX
packages/hardhat/deploy/01_deploy_demo_tokens.ts  仅本地链
packages/hardhat/test/PotosDEX.ts            单元测试
packages/nextjs/app/dex/page.tsx             集市页面
packages/nextjs/components/dex/              挂单表单、订单簿、我的代币、最近成交
packages/nextjs/hooks/dex/                   读 ERC20 元数据、按需 approve
packages/nextjs/utils/scaffold-eth/customChains.ts  POTOS 链定义
```
