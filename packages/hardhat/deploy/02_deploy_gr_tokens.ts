import { artifacts, deployScript } from "../rocketh/deploy.js";
import { parseUnits } from "viem";

const GR_SYMBOLS = ["GR001", "GR002", "GR003", "GR004", "GR005"];
const INITIAL_SUPPLY = parseUnits("1000000", 18);
// 老师吃单用的地址：全部 GR 铸给它，owner 也转给它
const TEACHER = "0x2b4Cad722C461CE6b26601a0638B3a3f19DeE8CC";

/**
 * 老师的代币 GR001 ~ GR005。
 * 不好意思找同学成交的学生，可以挂单"卖出自己的代币，想要 GR00x"，由老师统一吃单。
 * 库存不够时，TEACHER 作为 owner 可以继续调用 mint。
 *
 *   yarn deploy --network potosTestnet --tags GRTokens
 */
export default deployScript(
  async env => {
    const { deployer } = env.namedAccounts;

    for (const symbol of GR_SYMBOLS) {
      const token = await env.deploy(symbol, {
        account: deployer,
        artifact: artifacts.DemoToken,
        args: [symbol, symbol, deployer],
      });
      if (token.newlyDeployed) {
        await env.execute(token, { account: deployer, functionName: "mint", args: [TEACHER, INITIAL_SUPPLY] });
        await env.execute(token, { account: deployer, functionName: "transferOwnership", args: [TEACHER] });
      }
      console.log(`🪙 ${symbol}`, token.address);
    }
  },
  {
    tags: ["GRTokens"],
  },
);
