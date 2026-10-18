import { artifacts, deployScript } from "../rocketh/deploy.js";

/**
 * 部署课堂挂单簿 PotosDEX。没有构造函数参数，没有管理员。
 *
 * 部署到 POTOS 测试网：
 *   export __RUNTIME_DEPLOYER_PRIVATE_KEY=0x...
 *   yarn deploy --network potosTestnet --tags PotosDEX
 */
export default deployScript(
  async env => {
    const { deployer } = env.namedAccounts;

    const dex = await env.deploy("PotosDEX", {
      account: deployer,
      artifact: artifacts.PotosDEX,
      args: [],
    });

    const orderCount = await env.read(dex, { functionName: "orderCount" });
    console.log("🏪 PotosDEX deployed at", dex.address, "orderCount =", orderCount.toString());
  },
  {
    tags: ["PotosDEX"],
  },
);
