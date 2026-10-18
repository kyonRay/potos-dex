import { artifacts, deployScript } from "../rocketh/deploy.js";
import { parseUnits } from "viem";

const LOCAL_CHAIN_IDS = [31337, 1337];

/**
 * 仅本地链：部署两个演示代币 ALC 和 BOB，给 Hardhat 前几个账户各发一些，方便在页面上挂单吃单。
 * 在测试网上会自动跳过，课堂上学生用自己实验 2 的代币。
 */
export default deployScript(
  async env => {
    const chainId = Number(env.network.chain?.id ?? 0);
    if (!LOCAL_CHAIN_IDS.includes(chainId)) {
      console.log(`⏭  DemoTokens 只部署到本地链，当前 chainId=${chainId}，跳过`);
      return;
    }

    const { deployer } = env.namedAccounts;
    const recipients = env.unnamedAccounts.slice(0, 3);

    const alc = await env.deploy("ALC", {
      account: deployer,
      artifact: artifacts.DemoToken,
      args: ["Alice Token", "ALC", deployer],
    });
    const bob = await env.deploy("BOB", {
      account: deployer,
      artifact: artifacts.DemoToken,
      args: ["Bob Token", "BOB", deployer],
    });

    for (const to of [deployer, ...recipients]) {
      await env.execute(alc, { account: deployer, functionName: "mint", args: [to, parseUnits("1000", 18)] });
      await env.execute(bob, { account: deployer, functionName: "mint", args: [to, parseUnits("1000", 18)] });
    }
    console.log("🪙 ALC", alc.address, "BOB", bob.address, "已给", 1 + recipients.length, "个账户各发 1000");
  },
  {
    tags: ["DemoTokens"],
  },
);
