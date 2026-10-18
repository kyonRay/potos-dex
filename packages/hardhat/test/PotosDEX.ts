import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

const units = (n: string) => ethers.parseUnits(n, 18);

/**
 * alice 持有 ALC，bob 持有 BOB。alice 挂单：卖 10 ALC 换 25 BOB。
 */
async function deployFixture() {
  const [deployer, alice, bob, carol] = await ethers.getSigners();

  const dex = await ethers.deployContract("PotosDEX");
  const alc = await ethers.deployContract("DemoToken", ["Alice Token", "ALC", deployer.address]);
  const bobToken = await ethers.deployContract("DemoToken", ["Bob Token", "BOB", deployer.address]);

  await alc.mint(alice.address, units("100"));
  await bobToken.mint(bob.address, units("100"));

  const dexAddress = await dex.getAddress();
  const alcAddress = await alc.getAddress();
  const bobAddress = await bobToken.getAddress();

  return { dex, dexAddress, alc, alcAddress, bobToken, bobAddress, deployer, alice, bob, carol };
}

async function postedFixture() {
  const f = await deployFixture();
  await f.alc.connect(f.alice).approve(f.dexAddress, units("10"));
  await f.dex.connect(f.alice).postOrder(f.alcAddress, units("10"), f.bobAddress, units("25"));
  return f;
}

describe("PotosDEX", function () {
  describe("postOrder", function () {
    it("托管 maker 的代币并发出 OrderPosted", async function () {
      const { dex, dexAddress, alc, alcAddress, bobAddress, alice } = await networkHelpers.loadFixture(deployFixture);
      await alc.connect(alice).approve(dexAddress, units("10"));

      await expect(dex.connect(alice).postOrder(alcAddress, units("10"), bobAddress, units("25")))
        .to.emit(dex, "OrderPosted")
        .withArgs(0, alice.address, alcAddress, units("10"), bobAddress, units("25"));

      expect(await alc.balanceOf(dexAddress)).to.equal(units("10"));
      expect(await alc.balanceOf(alice.address)).to.equal(units("90"));
      expect(await dex.orderCount()).to.equal(1);

      const order = await dex.getOrder(0);
      expect(order.maker).to.equal(alice.address);
      expect(order.status).to.equal(0);
    });

    it("未 approve 时挂单失败，什么都不改变", async function () {
      const { dex, alcAddress, bobAddress, alice } = await networkHelpers.loadFixture(deployFixture);
      await expect(dex.connect(alice).postOrder(alcAddress, units("10"), bobAddress, units("25"))).to.be.revert(ethers);
      expect(await dex.orderCount()).to.equal(0);
    });

    it("拒绝零金额、零地址和同一种代币", async function () {
      const { dex, alcAddress, bobAddress, alice } = await networkHelpers.loadFixture(deployFixture);
      await expect(dex.connect(alice).postOrder(alcAddress, 0, bobAddress, units("1"))).to.be.revertedWithCustomError(
        dex,
        "InvalidAmount",
      );
      await expect(
        dex.connect(alice).postOrder(alcAddress, units("1"), ethers.ZeroAddress, units("1")),
      ).to.be.revertedWithCustomError(dex, "InvalidToken");
      await expect(
        dex.connect(alice).postOrder(alcAddress, units("1"), alcAddress, units("1")),
      ).to.be.revertedWithCustomError(dex, "InvalidToken");
    });
  });

  describe("fillOrder", function () {
    it("一笔交易内完成原子互换", async function () {
      const { dex, dexAddress, alc, bobToken, bobAddress, alice, bob } =
        await networkHelpers.loadFixture(postedFixture);
      await bobToken.connect(bob).approve(dexAddress, units("25"));

      await expect(dex.connect(bob).fillOrder(0)).to.emit(dex, "OrderFilled").withArgs(0, bob.address, alice.address);

      // maker 收到 25 BOB，taker 收到 10 ALC，DEX 清空
      expect(await bobToken.balanceOf(alice.address)).to.equal(units("25"));
      expect(await bobToken.balanceOf(bob.address)).to.equal(units("75"));
      expect(await alc.balanceOf(bob.address)).to.equal(units("10"));
      expect(await alc.balanceOf(dexAddress)).to.equal(0);
      expect(await bobToken.balanceOf(dexAddress)).to.equal(0);

      const order = await dex.getOrder(0);
      expect(order.status).to.equal(1);
      expect(order.taker).to.equal(bob.address);
      expect(bobAddress).to.equal(order.tokenWant);
    });

    it("taker 未 approve 时整笔回滚，托管的代币仍在 DEX", async function () {
      const { dex, dexAddress, alc, alice, bob } = await networkHelpers.loadFixture(postedFixture);
      await expect(dex.connect(bob).fillOrder(0)).to.be.revert(ethers);
      expect(await alc.balanceOf(dexAddress)).to.equal(units("10"));
      expect((await dex.getOrder(0)).status).to.equal(0);
      expect(await alc.balanceOf(alice.address)).to.equal(units("90"));
    });

    it("同一订单不能被吃两次", async function () {
      const { dex, dexAddress, bobToken, bob, carol } = await networkHelpers.loadFixture(postedFixture);
      await bobToken.connect(bob).approve(dexAddress, units("25"));
      await dex.connect(bob).fillOrder(0);
      await expect(dex.connect(carol).fillOrder(0)).to.be.revertedWithCustomError(dex, "OrderNotOpen").withArgs(0);
    });

    it("不存在的订单", async function () {
      const { dex, bob } = await networkHelpers.loadFixture(postedFixture);
      await expect(dex.connect(bob).fillOrder(99)).to.be.revertedWithCustomError(dex, "OrderDoesNotExist").withArgs(99);
    });
  });

  describe("cancelOrder", function () {
    it("maker 撤单后代币原路退回", async function () {
      const { dex, dexAddress, alc, alice } = await networkHelpers.loadFixture(postedFixture);
      await expect(dex.connect(alice).cancelOrder(0)).to.emit(dex, "OrderCancelled").withArgs(0, alice.address);
      expect(await alc.balanceOf(alice.address)).to.equal(units("100"));
      expect(await alc.balanceOf(dexAddress)).to.equal(0);
      expect((await dex.getOrder(0)).status).to.equal(2);
    });

    it("非 maker 不能撤单，撤过的单不能再吃", async function () {
      const { dex, dexAddress, bobToken, alice, bob } = await networkHelpers.loadFixture(postedFixture);
      await expect(dex.connect(bob).cancelOrder(0)).to.be.revertedWithCustomError(dex, "NotMaker").withArgs(0);
      await dex.connect(alice).cancelOrder(0);
      await bobToken.connect(bob).approve(dexAddress, units("25"));
      await expect(dex.connect(bob).fillOrder(0)).to.be.revertedWithCustomError(dex, "OrderNotOpen").withArgs(0);
    });
  });

  describe("getOrders", function () {
    it("分页读取，越界返回空数组", async function () {
      const { dex, dexAddress, alc, alcAddress, bobAddress, alice } = await networkHelpers.loadFixture(postedFixture);
      await alc.connect(alice).approve(dexAddress, units("20"));
      await dex.connect(alice).postOrder(alcAddress, units("5"), bobAddress, units("1"));
      await dex.connect(alice).postOrder(alcAddress, units("5"), bobAddress, units("2"));

      const all = await dex.getOrders(0, 100);
      expect(all.length).to.equal(3);
      expect(all[2].amountWant).to.equal(units("2"));

      const page = await dex.getOrders(1, 1);
      expect(page.length).to.equal(1);
      expect(page[0].amountWant).to.equal(units("1"));

      expect((await dex.getOrders(3, 10)).length).to.equal(0);
    });
  });
});
