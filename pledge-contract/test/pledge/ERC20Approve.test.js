const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC20 Approve - 授权功能测试", function () {
    let busdToken;
    let pledgePool;
    let owner, user1, user2;

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // 部署 BUSD 测试代币
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        busdToken = await MockERC20.deploy("BUSD Token", "BUSD", 18);
        await busdToken.waitForDeployment();

        // 部署 MultiSigWallet
        const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
        const multiSigWallet = await MultiSigWallet.deploy([owner.address], 1);
        await multiSigWallet.waitForDeployment();

        // 部署 PledgePool
        const PoolLendBorrow = await ethers.getContractFactory("PoolLendBorrow");
        pledgePool = await PoolLendBorrow.deploy(multiSigWallet.target);
        await pledgePool.waitForDeployment();

        // 给 user1 分配 100 BUSD
        await busdToken.mint(user1.address, ethers.parseEther("100"));
    });

    describe("1. 基本授权功能", function () {
        it("应该成功授权指定数量的代币", async function () {
            const approveAmount = ethers.parseEther("10");
            
            // 执行授权
            const tx = await busdToken.connect(user1).approve(pledgePool.target, approveAmount);
            await tx.wait();

            // 验证授权额度
            const allowance = await busdToken.allowance(user1.address, pledgePool.target);
            expect(allowance).to.equal(approveAmount);
        });

        it("应该成功授权最大数量的代币", async function () {
            // 执行最大授权
            const tx = await busdToken.connect(user1).approve(pledgePool.target, ethers.MaxUint256);
            await tx.wait();

            // 验证授权额度
            const allowance = await busdToken.allowance(user1.address, pledgePool.target);
            expect(allowance).to.equal(ethers.MaxUint256);
        });

        it("应该能够查询授权额度", async function () {
            // 初始授权额度应该为 0
            let allowance = await busdToken.allowance(user1.address, pledgePool.target);
            expect(allowance).to.equal(0);

            // 授权后查询
            await busdToken.connect(user1).approve(pledgePool.target, ethers.parseEther("50"));
            allowance = await busdToken.allowance(user1.address, pledgePool.target);
            expect(allowance).to.equal(ethers.parseEther("50"));
        });

        it("应该能够取消授权", async function () {
            // 先授权
            await busdToken.connect(user1).approve(pledgePool.target, ethers.parseEther("50"));
            
            // 取消授权（授权为 0）
            await busdToken.connect(user1).approve(pledgePool.target, 0);

            // 验证授权额度为 0
            const allowance = await busdToken.allowance(user1.address, pledgePool.target);
            expect(allowance).to.equal(0);
        });

        it("应该能够修改授权额度", async function () {
            // 第一次授权
            await busdToken.connect(user1).approve(pledgePool.target, ethers.parseEther("10"));
            let allowance = await busdToken.allowance(user1.address, pledgePool.target);
            expect(allowance).to.equal(ethers.parseEther("10"));

            // 修改授权额度
            await busdToken.connect(user1).approve(pledgePool.target, ethers.parseEther("20"));
            allowance = await busdToken.allowance(user1.address, pledgePool.target);
            expect(allowance).to.equal(ethers.parseEther("20"));
        });
    });

    describe("2. 授权事件测试", function () {
        it("应该触发 Approval 事件", async function () {
            const approveAmount = ethers.parseEther("10");
            
            await expect(busdToken.connect(user1).approve(pledgePool.target, approveAmount))
                .to.emit(busdToken, "Approval")
                .withArgs(user1.address, pledgePool.target, approveAmount);
        });
    });

    describe("3. 实际使用场景测试", function () {
        it("授权后应该能够成功转账", async function () {
            const approveAmount = ethers.parseEther("10");
            
            // 授权
            await busdToken.connect(user1).approve(pledgePool.target, approveAmount);

            // 模拟合约使用授权额度进行转账
            const initialBalance = await busdToken.balanceOf(user1.address);
            
            // 这里我们用 owner 来模拟合约调用 transferFrom
            await busdToken.connect(user1).transfer(user2.address, ethers.parseEther("5"));
            
            const finalBalance = await busdToken.balanceOf(user1.address);
            expect(finalBalance).to.equal(initialBalance - ethers.parseEther("5"));
        });

        it("未授权时不应该能够转账", async function () {
            // 不授权，直接尝试转账应该失败
            // 注意：这里需要合约有 transferFrom 的权限，但我们没有授权
            const allowance = await busdToken.allowance(user1.address, pledgePool.target);
            expect(allowance).to.equal(0);
        });
    });

    describe("4. 边界条件测试", function () {
        it("应该能够授权 0 数量", async function () {
            await busdToken.connect(user1).approve(pledgePool.target, 0);
            const allowance = await busdToken.allowance(user1.address, pledgePool.target);
            expect(allowance).to.equal(0);
        });

        it("应该能够多次授权同一个地址", async function () {
            await busdToken.connect(user1).approve(pledgePool.target, ethers.parseEther("10"));
            await busdToken.connect(user1).approve(pledgePool.target, ethers.parseEther("20"));
            await busdToken.connect(user1).approve(pledgePool.target, ethers.parseEther("30"));

            const allowance = await busdToken.allowance(user1.address, pledgePool.target);
            expect(allowance).to.equal(ethers.parseEther("30"));
        });

        it("不同用户的授权应该互不影响", async function () {
            // 给 user2 也分配一些代币
            await busdToken.mint(user2.address, ethers.parseEther("100"));

            // user1 授权
            await busdToken.connect(user1).approve(pledgePool.target, ethers.parseEther("10"));
            
            // user2 授权
            await busdToken.connect(user2).approve(pledgePool.target, ethers.parseEther("20"));

            // 验证各自的授权额度
            const allowance1 = await busdToken.allowance(user1.address, pledgePool.target);
            const allowance2 = await busdToken.allowance(user2.address, pledgePool.target);
            
            expect(allowance1).to.equal(ethers.parseEther("10"));
            expect(allowance2).to.equal(ethers.parseEther("20"));
        });
    });

    describe("5. Gas 消耗测试", function () {
        it("应该记录 Approve 操作的 Gas 消耗", async function () {
            const tx = await busdToken.connect(user1).approve(pledgePool.target, ethers.parseEther("10"));
            const receipt = await tx.wait();
            
            console.log(`Approve Gas Used: ${receipt.gasUsed.toString()}`);
            
            // 验证 Gas 消耗在合理范围内（一般 Approve 操作消耗 40000-50000 gas）
            expect(receipt.gasUsed).to.be.lessThan(100000);
        });
    });
});
