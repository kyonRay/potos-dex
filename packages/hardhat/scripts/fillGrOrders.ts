import * as dotenv from "dotenv";
dotenv.config();
import { ethers, Wallet } from "ethers";
import * as fs from "fs";
import { config } from "hardhat";
import password from "@inquirer/password";

/**
 * 老师批量吃单：把订单簿里所有"想要 GR00x"的开放订单一次吃掉。
 *
 *   yarn fill-gr --network potosTestnet         # 预演：只列出会吃哪些单
 *   yarn fill-gr --network potosTestnet --yes   # 真正发交易
 *
 * 用部署者账户吃单（GR 全在它手里），--yes 时输入与 yarn deploy 相同的密码。
 * 每种 GR 先 approve 本批总额，再逐张 fillOrder；单张失败（比如刚被撤单）只跳过，不影响其他单。
 */

const GR_SYMBOLS = ["GR001", "GR002", "GR003", "GR004", "GR005"];
const PAGE_SIZE = 25n; // 一次读太多会超出 RPC 的 eth_call 限制
const OPEN = 0n;

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

const argValue = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
};

const readDeployment = (networkName: string, name: string) => {
  const file = `./deployments/${networkName}/${name}.json`;
  if (!fs.existsSync(file)) throw new Error(`找不到 ${file}，这个网络上还没部署 ${name}`);
  return JSON.parse(fs.readFileSync(file, "utf8")) as { address: string; abi: ethers.InterfaceAbi };
};

// 和 runHardhatDeployWithPK.ts 一样：已有 __RUNTIME_DEPLOYER_PRIVATE_KEY 就直接用，否则输密码解密部署者私钥
const loadDeployerWallet = async () => {
  if (process.env.__RUNTIME_DEPLOYER_PRIVATE_KEY) return new Wallet(process.env.__RUNTIME_DEPLOYER_PRIVATE_KEY);

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  if (!encryptedKey) throw new Error("没有部署者账户，先运行 `yarn generate` 或 `yarn account:import`");
  const pass = await password({ message: "Enter password to decrypt private key:" });
  return (await Wallet.fromEncryptedJson(encryptedKey, pass)) as Wallet;
};

async function main() {
  const networkName = argValue("--network") ?? "default";
  const execute = process.argv.includes("--yes");

  const network = config.networks[networkName];
  if (!network || !("url" in network)) throw new Error(`hardhat.config.ts 里没有 http 网络 ${networkName}`);
  // POTOS 的 RPC 网关会用 403 拒绝不带 User-Agent 的请求，而 ethers 在 node 里默认不带；
  // 它对只含 1 个请求的 batch 返回单个对象而不是数组，ethers 默认的批量请求会卡死，所以逐个发。
  // 关掉 ethers 250ms 的请求缓存，否则连续发交易时会读到上一笔之前的 nonce
  const rpc = new ethers.FetchRequest(await network.url.getUrl());
  rpc.setHeader("User-Agent", "potos-dex-fill-gr");
  const provider = new ethers.JsonRpcProvider(rpc, undefined, { batchMaxCount: 1, cacheTimeout: -1 });

  const dexDeployment = readDeployment(networkName, "PotosDEX");
  const dex = new ethers.Contract(dexDeployment.address, dexDeployment.abi, provider);
  const symbolOf = new Map(
    GR_SYMBOLS.map(symbol => [readDeployment(networkName, symbol).address.toLowerCase(), symbol]),
  );

  const orderCount: bigint = await dex.orderCount();
  const targets: { id: bigint; maker: string; token: string; amount: bigint }[] = [];
  for (let start = 0n; start < orderCount; start += PAGE_SIZE) {
    const page = await dex.getOrders(start, PAGE_SIZE);
    page.forEach((order: ethers.Result, i: number) => {
      if (order.status === OPEN && symbolOf.has(order.tokenWant.toLowerCase())) {
        targets.push({ id: start + BigInt(i), maker: order.maker, token: order.tokenWant, amount: order.amountWant });
      }
    });
  }

  const totals = new Map<string, bigint>();
  for (const t of targets) {
    totals.set(t.token, (totals.get(t.token) ?? 0n) + t.amount);
    console.log(`#${t.id}  ${t.maker}  要 ${ethers.formatUnits(t.amount, 18)} ${symbolOf.get(t.token.toLowerCase())}`);
  }
  console.log(`\n共 ${orderCount} 张单，其中 ${targets.length} 张开放且想要 GR`);
  for (const [token, total] of totals)
    console.log(`  ${symbolOf.get(token.toLowerCase())} 合计 ${ethers.formatUnits(total, 18)}`);

  if (targets.length === 0) return;
  if (!execute) {
    console.log("\n这是预演，没有发交易。确认无误后加 --yes 再运行一次。");
    return;
  }

  const taker = (await loadDeployerWallet()).connect(provider);
  console.log("\n吃单账户", taker.address);

  for (const [token, total] of totals) {
    const gr = new ethers.Contract(token, ERC20_ABI, taker);
    const symbol = symbolOf.get(token.toLowerCase());
    const balance: bigint = await gr.balanceOf(taker.address);
    if (balance < total)
      throw new Error(`${symbol} 余额 ${ethers.formatUnits(balance, 18)}，不够本批 ${ethers.formatUnits(total, 18)}`);
    if ((await gr.allowance(taker.address, dex.target)) < total) {
      await (await gr.approve(dex.target, total)).wait();
      console.log(`✅ ${symbol} approve ${ethers.formatUnits(total, 18)}`);
    }
  }

  const dexAsTaker = dex.connect(taker) as ethers.Contract;
  const failed: bigint[] = [];
  for (const t of targets) {
    try {
      await (await dexAsTaker.fillOrder(t.id)).wait();
      console.log(`✅ #${t.id} 已吃单`);
    } catch (e) {
      failed.push(t.id);
      console.log(`❌ #${t.id} 失败：${(e as { shortMessage?: string }).shortMessage ?? e}`);
    }
  }
  console.log(
    `\n完成：成功 ${targets.length - failed.length} 张，失败 ${failed.length} 张${failed.length ? `（${failed.join(", ")}）` : ""}`,
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
