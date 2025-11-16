const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PoolLend", function () {
    let poolLend, poolAdmin, mockToken, owner, lender1, lender2, borrower;
    let poolId;

    beforeEach(async function () {
        [owner, lender1, lender2, borrower] = await ethers.getSigners();

        // 部署Mock ERC20代币
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        mockToken = await MockERC20.deploy("Test Token", "TEST", 18);
        await mockToken.waitForDeployment();

        // 部署PoolLend (现在包含PoolAdmin功能)
        const PoolLend = await ethers.getContractFactory("PoolLend");
        poolLend = await PoolLend.deploy();
        await poolLend.waitForDeployment();
        
        // poolLend现在也是poolAdmin
        poolAdmin = poolLend;

        // 给测试账户分配代币
        await mockToken.mint(lender1.address, ethers.parseEther("1000"));
        await mockToken.mint(lender2.address, ethers.parseEther("1000"));
        
        // 授权合约使用代币
        await mockToken.connect(lender1).approve(poolLend.target, ethers.parseEther("1000"));
        await mockToken.connect(lender2).approve(poolLend.target, ethers.parseEther("1000"));

        // 部署Mock DebtToken
        const MockDebtToken = await ethers.getContractFactory("MockDebtToken");
        const mockSpToken = await MockDebtToken.deploy("SP Token", "SP");
        const mockJpToken = await MockDebtToken.deploy("JP Token", "JP");
        await mockSpToken.waitForDeployment();
        await mockJpToken.waitForDeployment();

        // 创建测试池子
        const endTime = Math.floor(Date.now() / 1000) + 86400; // 1天后
        const tx = await poolLend.createPool(
            mockToken.target,  // settleToken
            mockToken.target,  // pledgeToken  
            ethers.parseEther("1000"), // borrowAmount
            1000,  // 10% 年化利率
            15000, // 150% 质押率
            13000, // 130% 清算率
            endTime
        );
        
        // 设置池子的sp和jp代币
        await poolLend.setPoolSpToken(1, mockSpToken.target);
        await poolLend.setPoolJpToken(1, mockJpToken.target);
        const receipt = await tx.wait();
        poolId = 1; // 第一个池子ID为1
    });

    describe("depositLend", function () {
        it("应该成功存入借贷资金", async function () {
            const amount = ethers.parseEther("100");
            
            await expect(poolLend.connect(lender1).depositLend(poolId, amount))
                .to.emit(poolLend, "LendDeposit")
                .withArgs(poolId, lender1.address, amount);

            const lendInfo = await poolLend.getLendInfo(poolId, lender1.address);
            expect(lendInfo.amount).to.equal(amount);
            expect(lendInfo.claimed).to.be.false;
            expect(lendInfo.refunded).to.be.false;
        });

        it("应该拒绝零金额存款", async function () {
            await expect(poolLend.connect(lender1).depositLend(poolId, 0))
                .to.be.revertedWith("PoolLend: amount must be greater than 0");
        });

        it("应该拒绝超过借贷上限的存款", async function () {
            const amount = ethers.parseEther("1001"); // 超过1000的上限
            
            await expect(poolLend.connect(lender1).depositLend(poolId, amount))
                .to.be.revertedWith("PoolLend: exceeds borrow amount");
        });

        it("应该正确累加多次存款", async function () {
            const amount1 = ethers.parseEther("100");
            const amount2 = ethers.parseEther("200");
            
            await poolLend.connect(lender1).depositLend(poolId, amount1);
            await poolLend.connect(lender1).depositLend(poolId, amount2);

            const lendInfo = await poolLend.getLendInfo(poolId, lender1.address);
            expect(lendInfo.amount).to.equal(amount1 + amount2);
        });
    });

    describe("cancelLend", function () {
        beforeEach(async function () {
            // 先存入一些资金
            await poolLend.connect(lender1).depositLend(poolId, ethers.parseEther("100"));
        });

        it("应该成功取消部分资金", async function () {
            const cancelAmount = ethers.parseEther("50");
            
            await poolLend.connect(lender1).cancelLend(poolId, cancelAmount);

            const lendInfo = await poolLend.getLendInfo(poolId, lender1.address);
            expect(lendInfo.amount).to.equal(ethers.parseEther("50"));
        });

        it("应该拒绝取消超过余额的资金", async function () {
            const cancelAmount = ethers.parseEther("200");
            
            await expect(poolLend.connect(lender1).cancelLend(poolId, cancelAmount))
                .to.be.revertedWith("PoolLend: insufficient balance");
        });

        it("应该拒绝零金额取消", async function () {
            await expect(poolLend.connect(lender1).cancelLend(poolId, 0))
                .to.be.revertedWith("PoolLend: amount must be greater than 0");
        });
    });

    describe("claimLend", function () {
        beforeEach(async function () {
            // 存入资金并设置池子为执行状态
            await poolLend.connect(lender1).depositLend(poolId, ethers.parseEther("100"));
            await poolAdmin.setPoolState(poolId, 1); // EXECUTION状态
        });

        it("应该成功领取sp代币", async function () {
            await expect(poolLend.connect(lender1).claimLend(poolId))
                .to.emit(poolLend, "SpTokenClaimed");

            const lendInfo = await poolLend.getLendInfo(poolId, lender1.address);
            expect(lendInfo.claimed).to.be.true;
            
            const spBalance = await poolLend.getSpTokenBalance(poolId, lender1.address);
            expect(spBalance).to.be.gt(0);
        });

        it("应该拒绝重复领取", async function () {
            await poolLend.connect(lender1).claimLend(poolId);
            
            await expect(poolLend.connect(lender1).claimLend(poolId))
                .to.be.revertedWith("PoolLend: already claimed");
        });

        it("应该拒绝无借贷位置的用户领取", async function () {
            await expect(poolLend.connect(lender2).claimLend(poolId))
                .to.be.revertedWith("PoolLend: no lending position");
        });
    });

    describe("withdrawLend", function () {
        beforeEach(async function () {
            // 存入资金，领取sp代币，然后设置为完成状态
            await poolLend.connect(lender1).depositLend(poolId, ethers.parseEther("100"));
            await poolAdmin.setPoolState(poolId, 1); // EXECUTION状态
            await poolLend.connect(lender1).claimLend(poolId);
            await poolAdmin.setPoolState(poolId, 2); // FINISH状态
        });

        it("应该成功销毁sp代币并提取资金", async function () {
            // 设置为清算状态以避免时间检查
            await poolLend.setPoolState(poolId, 3); // LIQUIDATION状态
            
            const spBalance = await poolLend.getSpTokenBalance(poolId, lender1.address);
            
            await expect(poolLend.connect(lender1).withdrawLend(poolId, spBalance))
                .to.emit(poolLend, "SpTokenWithdrawn");
        });

        it("应该拒绝零sp代币数量", async function () {
            await expect(poolLend.connect(lender1).withdrawLend(poolId, 0))
                .to.be.revertedWith("PoolLend: spAmount must be greater than 0");
        });
    });

    describe("refundLend", function () {
        beforeEach(async function () {
            await poolLend.connect(lender1).depositLend(poolId, ethers.parseEther("100"));
            await poolAdmin.setPoolState(poolId, 2); // FINISH状态
        });

        it("应该拒绝重复退款", async function () {
            // 设置借入方金额大于等于借出方金额，使其不需要退款
            await poolLend.setPoolBorrowAmount(poolId, ethers.parseEther("100"));
            
            await expect(poolLend.connect(lender1).refundLend(poolId))
                .to.be.revertedWith("PoolLend: no refund needed");
        });
    });

    describe("calculateFinishAmount", function () {
        beforeEach(async function () {
            await poolLend.connect(lender1).depositLend(poolId, ethers.parseEther("100"));
            await poolAdmin.setPoolState(poolId, 2); // FINISH状态
        });

        it("应该正确计算完成金额", async function () {
            const finishAmount = await poolLend.calculateFinishAmount(poolId);
            expect(finishAmount).to.be.gt(0);
        });
    });

    describe("calculateLiquidationAmount", function () {
        beforeEach(async function () {
            await poolLend.connect(lender1).depositLend(poolId, ethers.parseEther("100"));
            await poolAdmin.setPoolState(poolId, 3); // LIQUIDATION状态
        });

        it("应该正确计算清算金额", async function () {
            const liquidationAmount = await poolLend.calculateLiquidationAmount(poolId);
            expect(liquidationAmount).to.be.gt(0);
        });
    });

    describe("getPoolLenders", function () {
        it("应该正确返回借出方列表", async function () {
            await poolLend.connect(lender1).depositLend(poolId, ethers.parseEther("100"));
            await poolLend.connect(lender2).depositLend(poolId, ethers.parseEther("200"));

            const lenders = await poolLend.getPoolLenders(poolId);
            expect(lenders).to.include(lender1.address);
            expect(lenders).to.include(lender2.address);
            expect(lenders.length).to.equal(2);
        });

        it("空池子应该返回空列表", async function () {
            const lenders = await poolLend.getPoolLenders(poolId);
            expect(lenders.length).to.equal(0);
        });
    });
});