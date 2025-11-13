const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSigClient", function () {
  let mockMultiSig;
  let testContract;
  let owner, user1, user2;
  
  // 部署 Mock 多签钱包
  async function deployMockMultiSig() {
    const MockMultiSig = await ethers.getContractFactory("MockMultiSigWallet");
    return await MockMultiSig.deploy();
  }
  
  // 部署测试合约（继承 MultiSigClient）
  async function deployTestContract(multiSigAddress) {
    const TestContract = await ethers.getContractFactory("TestMultiSigClient");
    return await TestContract.deploy(multiSigAddress);
  }

  beforeEach(async function () {
    // 获取测试账户
    [owner, user1, user2] = await ethers.getSigners();
    
    // 部署 Mock 多签钱包
    mockMultiSig = await deployMockMultiSig();
    
    // 部署测试合约
    testContract = await deployTestContract(mockMultiSig.target);
  });

  // ============ 构造函数测试 ============
  describe("构造函数", function () {
    it("✅ 应该正确设置多签钱包地址", async function () {
      expect(await testContract.getMultiSignatureAddress()).to.equal(mockMultiSig.target);
    });

    it("❌ 不能使用零地址初始化", async function () {
      const TestContract = await ethers.getContractFactory("TestMultiSigClient");
      await expect(
        TestContract.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("MultiSigClient: MultiSignature address cannot be zero");
    });
  });

  // ============ validCall 修饰器测试 ============
  describe("validCall 修饰器", function () {
    it("✅ 多签通过时，应该允许调用", async function () {
      // 设置 Mock：返回索引 > 0（表示已通过多签）
      await mockMultiSig.setValidSignature(1);
      
      // 调用受保护的函数
      await expect(testContract.connect(owner).protectedFunction())
        .to.emit(testContract, "ProtectedFunctionCalled")
        .withArgs(owner.address);
    });

    it("❌ 多签未通过时，应该拒绝调用", async function () {
      // 设置 Mock：返回索引 = 0（表示未通过多签）
      await mockMultiSig.setValidSignature(0);
      
      // 调用受保护的函数应该失败
      await expect(
        testContract.connect(owner).protectedFunction()
      ).to.be.revertedWith("MultiSigClient: Transaction not approved by multi-signature");
    });

    it("✅ 不同调用者应该有不同的交易哈希", async function () {
      // 设置 Mock：所有调用都通过
      await mockMultiSig.setValidSignature(1);
      
      // 计算不同调用者的哈希
      const hash1 = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "address"],
          [owner.address, testContract.target]
        )
      );
      
      const hash2 = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "address"],
          [user1.address, testContract.target]
        )
      );
      
      // 两个哈希应该不同
      expect(hash1).to.not.equal(hash2);
      
      // 验证两个调用者都能成功调用
      await testContract.connect(owner).protectedFunction();
      await testContract.connect(user1).protectedFunction();
      expect(await testContract.callCount()).to.equal(2);
    });
  });

  // ============ 多签验证逻辑测试 ============
  describe("多签验证逻辑", function () {
    it("✅ 应该正确计算交易哈希", async function () {
      // 计算预期的交易哈希
      const expectedHash = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "address"],
          [owner.address, testContract.target]
        )
      );
      
      // 只为这个特定的 hash 设置通过
      await mockMultiSig.setValidSignatureForHash(expectedHash, 1);
      
      // 应该能成功调用
      await expect(testContract.connect(owner).protectedFunction())
        .to.not.be.reverted;
      
      // 使用错误的调用者应该失败（因为 hash 不同）
      await expect(
        testContract.connect(user1).protectedFunction()
      ).to.be.reverted;
    });

    it("✅ 应该使用默认索引 0 查询", async function () {
      // 这个测试验证 getValidSignature 被正确调用
      // 通过设置默认索引并验证行为来间接测试
      await mockMultiSig.setValidSignature(1);
      
      // 应该能成功调用（说明查询了签名索引）
      await expect(testContract.connect(owner).protectedFunction())
        .to.not.be.reverted;
      
      // 设置为 0 后应该失败
      await mockMultiSig.setValidSignature(0);
      await expect(
        testContract.connect(owner).protectedFunction()
      ).to.be.reverted;
    });
  });

  // ============ 存储槽位测试 ============
  describe("存储槽位", function () {
    it("✅ 应该使用正确的存储位置", async function () {
      // 计算预期的存储位置
      const expectedPosition = BigInt(ethers.keccak256(ethers.toUtf8Bytes("org.multiSignature.storage")));
      
      // 读取存储槽位的值
      const storageValue = await ethers.provider.getStorage(
        testContract.target,
        expectedPosition
      );
      
      // 转换为地址并验证
      const storedAddress = ethers.getAddress("0x" + storageValue.slice(-40));
      expect(storedAddress).to.equal(mockMultiSig.target);
    });
  });

  // ============ 边界情况测试 ============
  describe("边界情况", function () {
    it("✅ 签名索引刚好为 1 时应该通过", async function () {
      await mockMultiSig.setValidSignature(1);
      await expect(testContract.connect(owner).protectedFunction())
        .to.not.be.reverted;
    });

    it("❌ 签名索引为 0 时应该失败", async function () {
      await mockMultiSig.setValidSignature(0);
      await expect(
        testContract.connect(owner).protectedFunction()
      ).to.be.revertedWith("MultiSigClient: Transaction not approved by multi-signature");
    });

    it("✅ 签名索引很大时应该通过", async function () {
      await mockMultiSig.setValidSignature(999999);
      await expect(testContract.connect(owner).protectedFunction())
        .to.not.be.reverted;
    });
  });

  // ============ 多次调用测试 ============
  describe("多次调用", function () {
    it("✅ 同一用户可以多次调用（如果每次都通过多签）", async function () {
      await mockMultiSig.setValidSignature(1);
      
      await testContract.connect(owner).protectedFunction();
      await testContract.connect(owner).protectedFunction();
      await testContract.connect(owner).protectedFunction();
      
      // 应该成功调用 3 次
      expect(await testContract.callCount()).to.equal(3);
    });

    it("✅ 不同用户可以分别调用", async function () {
      await mockMultiSig.setValidSignature(1);
      
      await testContract.connect(owner).protectedFunction();
      await testContract.connect(user1).protectedFunction();
      await testContract.connect(user2).protectedFunction();
      
      expect(await testContract.callCount()).to.equal(3);
    });
  });

  // ============ 集成场景测试 ============
  describe("集成场景", function () {
    it("✅ 模拟真实多签流程", async function () {
      // 场景：owner 想调用受保护的函数
      
      // 1. 初始状态：未通过多签
      await mockMultiSig.setValidSignature(0);
      await expect(
        testContract.connect(owner).protectedFunction()
      ).to.be.reverted;
      
      // 2. 多签钱包中获得足够签名
      await mockMultiSig.setValidSignature(1);
      
      // 3. 现在可以成功调用
      await expect(testContract.connect(owner).protectedFunction())
        .to.emit(testContract, "ProtectedFunctionCalled");
    });

    it("✅ 模拟多签撤销场景", async function () {
      // 1. 初始通过多签
      await mockMultiSig.setValidSignature(1);
      await testContract.connect(owner).protectedFunction();
      
      // 2. 多签被撤销
      await mockMultiSig.setValidSignature(0);
      
      // 3. 再次调用应该失败
      await expect(
        testContract.connect(owner).protectedFunction()
      ).to.be.reverted;
    });
  });

  // ============ Gas 优化测试 ============
  describe("Gas 消耗", function () {
    it("📊 记录 validCall 的 gas 消耗", async function () {
      await mockMultiSig.setValidSignature(1);
      
      const tx = await testContract.connect(owner).protectedFunction();
      const receipt = await tx.wait();
      
      console.log(`      ⛽ Gas used: ${receipt.gasUsed.toString()}`);
      
      // 验证 gas 消耗在合理范围内（< 100k）
      expect(receipt.gasUsed).to.be.lessThan(100000);
    });
  });
});
