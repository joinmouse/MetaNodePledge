const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSignature", function () {
  let multiSig;
  let owner1, owner2, owner3, addr1;
  
  beforeEach(async function () {
    // 获取测试账户
    [owner1, owner2, owner3, addr1] = await ethers.getSigners();
    
    // 部署合约：3个所有者，需要2个确认
    const MultiSignature = await ethers.getContractFactory("MultiSignature");
    multiSig = await MultiSignature.deploy(
      [owner1.address, owner2.address, owner3.address],
      2
    );
  });

  describe("部署", function () {
    it("应该正确设置所有者", async function () {
      expect(await multiSig.owners(0)).to.equal(owner1.address);
      expect(await multiSig.owners(1)).to.equal(owner2.address);
      expect(await multiSig.owners(2)).to.equal(owner3.address);
    });

    it("应该正确设置所需确认数", async function () {
      expect(await multiSig.required()).to.equal(2);
    });
  });

  describe("提交交易", function () {
    it("所有者可以提交交易", async function () {
      await expect(
        multiSig.connect(owner1).submit(addr1.address, ethers.parseEther("1"), "0x")
      ).to.emit(multiSig, "Submit").withArgs(0);
      
      expect(await multiSig.getTransactionCount()).to.equal(1);
    });

    it("非所有者不能提交交易", async function () {
      await expect(
        multiSig.connect(addr1).submit(addr1.address, ethers.parseEther("1"), "0x")
      ).to.be.revertedWith("not owner");
    });
  });

  describe("确认交易", function () {
    beforeEach(async function () {
      // 先提交一个交易
      await multiSig.connect(owner1).submit(addr1.address, ethers.parseEther("1"), "0x");
    });

    it("所有者可以确认交易", async function () {
      await expect(multiSig.connect(owner1).confirm(0))
        .to.emit(multiSig, "Confirm")
        .withArgs(owner1.address, 0);
      
      const tx = await multiSig.transactions(0);
      expect(tx.numConfirmations).to.equal(1);
    });

    it("不能重复确认", async function () {
      await multiSig.connect(owner1).confirm(0);
      await expect(
        multiSig.connect(owner1).confirm(0)
      ).to.be.revertedWith("tx confirmed");
    });
  });

  describe("执行交易", function () {
    beforeEach(async function () {
      // 给合约转入ETH
      await owner1.sendTransaction({
        to: multiSig.target,
        value: ethers.parseEther("10")
      });
      
      // 提交交易
      await multiSig.connect(owner1).submit(addr1.address, ethers.parseEther("1"), "0x");
    });

    it("确认数足够时可以执行", async function () {
      // owner1 和 owner2 确认
      await multiSig.connect(owner1).confirm(0);
      await multiSig.connect(owner2).confirm(0);
      
      const balanceBefore = await ethers.provider.getBalance(addr1.address);
      
      await expect(multiSig.connect(owner1).execute(0))
        .to.emit(multiSig, "Execute")
        .withArgs(0);
      
      const balanceAfter = await ethers.provider.getBalance(addr1.address);
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("1"));
    });

    it("确认数不足时不能执行", async function () {
      // 只有 owner1 确认
      await multiSig.connect(owner1).confirm(0);
      
      await expect(
        multiSig.connect(owner1).execute(0)
      ).to.be.revertedWith("not enough confirmations");
    });

    it("不能重复执行", async function () {
      await multiSig.connect(owner1).confirm(0);
      await multiSig.connect(owner2).confirm(0);
      await multiSig.connect(owner1).execute(0);
      
      await expect(
        multiSig.connect(owner1).execute(0)
      ).to.be.revertedWith("tx executed");
    });
  });

  describe("撤销确认", function () {
    beforeEach(async function () {
      await multiSig.connect(owner1).submit(addr1.address, ethers.parseEther("1"), "0x");
      await multiSig.connect(owner1).confirm(0);
    });

    it("可以撤销自己的确认", async function () {
      await expect(multiSig.connect(owner1).revoke(0))
        .to.emit(multiSig, "Revoke")
        .withArgs(owner1.address, 0);
      
      const tx = await multiSig.transactions(0);
      expect(tx.numConfirmations).to.equal(0);
    });

    it("不能撤销未确认的交易", async function () {
      await expect(
        multiSig.connect(owner2).revoke(0)
      ).to.be.revertedWith("tx not confirmed");
    });
  });

  describe("完整流程", function () {
    it("演示完整的多签流程", async function () {
      // 1. 给合约转入ETH
      await owner1.sendTransaction({
        to: multiSig.target,
        value: ethers.parseEther("10")
      });
      
      // 2. owner1 提交交易
      await multiSig.connect(owner1).submit(addr1.address, ethers.parseEther("5"), "0x");
      
      // 3. owner1 和 owner2 确认
      await multiSig.connect(owner1).confirm(0);
      await multiSig.connect(owner2).confirm(0);
      
      // 4. 执行交易
      const balanceBefore = await ethers.provider.getBalance(addr1.address);
      await multiSig.connect(owner3).execute(0);
      const balanceAfter = await ethers.provider.getBalance(addr1.address);
      
      // 5. 验证结果
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("5"));
      const tx = await multiSig.transactions(0);
      expect(tx.executed).to.be.true;
    });
  });
});
