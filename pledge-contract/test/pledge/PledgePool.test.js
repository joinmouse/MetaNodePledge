const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("PledgePool - 主合约集成测试", function () {
    let pledgePool;
    let oracle;
    let spToken, jpToken;
    let settleToken, pledgeToken;
    let owner, lender1, lender2, borrower1, borrower2;
    let poolId;

    beforeEach(async function () {
        [owner, lender1, lender2, borrower1, borrower2] = await ethers.getSigners();

        // 部署Oracle
        const Oracle = await ethers.getContractFactory("MockOracle");
        oracle = await Oracle.deploy();
        await oracle.waitForDeployment();

        // 部署测试代币
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        settleToken = await MockERC20.deploy("USDT", "USDT", 18);
        pledgeToken = await MockERC20.deploy("BTC", "BTC", 18);
        await settleToken.waitForDeployment();
        await pledgeToken.waitForDeployment();

        // 部署MockDebtToken
        const MockDebtToken = await ethers.getContractFactory("MockDebtToken");
        spToken = await MockDebtToken.deploy("SP Token", "SP");
        jpToken = await MockDebtToken.deploy("JP Token", "JP");
        await spToken.waitForDeployment();
        await jpToken.waitForDeployment();

        // 部署多签名钱包
        const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
        const multiSigWallet = await MultiSigWallet.deploy([owner.address], 1);
        await multiSigWallet.waitForDeployment();

        // 部署PledgePool主合约
        const PledgePool = await ethers.getContractFactory("PledgePool");
        pledgePool = await PledgePool.deploy(multiSigWallet.target);
        await pledgePool.waitForDeployment();

        // 设置PledgePool为minter
        await spToken.addMinter(pledgePool.getAddress());
        await jpToken.addMinter(pledgePool.getAddress());

        // 为所有需要多签的操作创建一次性签名（getValidSignature是view函数，可以重复使用）
        const msgHash = await multiSigWallet.getApplicationHash(owner.address, pledgePool.target);
        await multiSigWallet.createApplication(pledgePool.target);
        await multiSigWallet.signApplication(msgHash);

        // 设置Oracle
        await pledgePool.setOracle(oracle.getAddress());

        // 设置价格
        await oracle.setPrice(settleToken.target, ethers.parseEther("1")); // 1 USDT = $1
        await oracle.setPrice(pledgeToken.target, ethers.parseEther("50000")); // 1 BTC = $50000

        // 给测试账户分配代币
        await settleToken.mint(lender1.address, ethers.parseEther("100000"));
        await settleToken.mint(lender2.address, ethers.parseEther("100000"));
        await pledgeToken.mint(borrower1.address, ethers.parseEther("10"));
        await pledgeToken.mint(borrower2.address, ethers.parseEther("10"));

        // 授权
        await settleToken.connect(lender1).approve(pledgePool.target, ethers.MaxUint256);
        await settleToken.connect(lender2).approve(pledgePool.target, ethers.MaxUint256);
        await pledgeToken.connect(borrower1).approve(pledgePool.target, ethers.MaxUint256);
        await pledgeToken.connect(borrower2).approve(pledgePool.target, ethers.MaxUint256);
    });

    describe("1. 创建池子 - createPoolInfo", function () {
        it("应该成功创建池子", async function () {
            const settleTime = (await time.latest()) + 3600; // 1小时后结算
            const endTime = settleTime + 86400; // 结算后24小时结束
            const interestRate = 1000; // 10%
            const maxSupply = ethers.parseEther("100000");
            const martgageRate = 15000; // 150%
            const autoLiquidateThreshold = 13000; // 130%

            poolId = await pledgePool.createPoolInfo(
                settleTime,
                endTime,
                interestRate,
                maxSupply,
                martgageRate,
                settleToken.target,
                pledgeToken.target,
                spToken.target,
                jpToken.target,
                autoLiquidateThreshold
            );

            const poolLength = await pledgePool.poolLength();
            expect(poolLength).to.equal(1);
        });
    });

    describe("2. 完整流程测试", function () {
        beforeEach(async function () {
            const settleTime = (await time.latest()) + 3600;
            const endTime = settleTime + 86400;
            const interestRate = 1000;
            const maxSupply = ethers.parseEther("100000");
            const martgageRate = 15000;
            const autoLiquidateThreshold = 13000;

            await pledgePool.createPoolInfo(
                settleTime,
                endTime,
                interestRate,
                maxSupply,
                martgageRate,
                settleToken.target,
                pledgeToken.target,
                spToken.target,
                jpToken.target,
                autoLiquidateThreshold
            );
            poolId = 1;
        });

        it("应该完成完整的借贷流程", async function () {
            // 1. 借出方存款
            await pledgePool.connect(lender1).depositLend(poolId, ethers.parseEther("50000"));
            await pledgePool.connect(lender2).depositLend(poolId, ethers.parseEther("30000"));

            // 2. 借入方质押
            await pledgePool.connect(borrower1).depositBorrow(poolId, ethers.parseEther("1"));
            await pledgePool.connect(borrower2).depositBorrow(poolId, ethers.parseEther("0.5"));

            // 3. 等待结算时间
            const poolInfo = await pledgePool.poolBaseInfo(poolId);
            await time.increaseTo(poolInfo.settleTime);

            // 4. 执行结算
            await pledgePool.settle(poolId);

            // 验证状态变为EXECUTION
            const stateAfterSettle = await pledgePool.getPoolState(poolId);
            expect(stateAfterSettle).to.equal(1); // EXECUTION

            // 5. 借出方领取sp代币
            await pledgePool.connect(lender1).claimLend(poolId);
            const spBalance1 = await spToken.balanceOf(lender1.address);
            expect(spBalance1).to.be.gt(0);

            // 6. 借入方领取借款和jp代币
            await pledgePool.connect(borrower1).claimBorrow(poolId);
            const jpBalance1 = await jpToken.balanceOf(borrower1.address);
            expect(jpBalance1).to.be.gt(0);
        });

        it("应该正确处理退款", async function () {
            // 借出方存款
            await pledgePool.connect(lender1).depositLend(poolId, ethers.parseEther("50000"));
            
            // 借入方质押
            await pledgePool.connect(borrower1).depositBorrow(poolId, ethers.parseEther("1"));

            // 推进到结算时间并结算
            const poolInfo = await pledgePool.poolBaseInfo(poolId);
            await time.increaseTo(poolInfo.settleTime);
            await pledgePool.settle(poolId);

            // 调用退款（自动计算退款金额）
            const balanceBefore = await settleToken.balanceOf(lender1.address);
            await pledgePool.connect(lender1).refundLend(poolId);
            const balanceAfter = await settleToken.balanceOf(lender1.address);

            // 验证退款金额大于0
            expect(balanceAfter).to.be.gt(balanceBefore);
        });
    });

    describe("3. 查询方法测试", function () {
        beforeEach(async function () {
            const settleTime = (await time.latest()) + 3600;
            const endTime = settleTime + 86400;
            const interestRate = 1000;
            const maxSupply = ethers.parseEther("100000");
            const martgageRate = 15000;
            const autoLiquidateThreshold = 13000;

            await pledgePool.createPoolInfo(
                settleTime,
                endTime,
                interestRate,
                maxSupply,
                martgageRate,
                settleToken.target,
                pledgeToken.target,
                spToken.target,
                jpToken.target,
                autoLiquidateThreshold
            );
            poolId = 1;
        });

        it("应该正确返回poolBaseInfo", async function () {
            const info = await pledgePool.poolBaseInfo(poolId);
            expect(info.maxSupply).to.equal(ethers.parseEther("100000"));
            expect(info.interestRate).to.equal(1000);
        });

        it("应该正确返回poolDataInfo", async function () {
            const info = await pledgePool.poolDataInfo(poolId);
            expect(info.settleAmountLend).to.equal(0);
        });

        it("应该正确返回getPoolState", async function () {
            const state = await pledgePool.getPoolState(poolId);
            expect(state).to.equal(0); // MATCH
        });

        it("应该正确返回getUnderlyingPriceView", async function () {
            const prices = await pledgePool.getUnderlyingPriceView(poolId);
            expect(prices[0]).to.equal(ethers.parseEther("1")); // USDT价格
            expect(prices[1]).to.equal(ethers.parseEther("50000")); // BTC价格
        });
    });

    describe("4. 管理方法测试", function () {
        it("应该正确设置费率", async function () {
            await pledgePool.setFee(100, 200); // 1% lendFee, 2% borrowFee
            const lendFee = await pledgePool.lendFee();
            const borrowFee = await pledgePool.borrowFee();
            expect(lendFee).to.equal(100);
            expect(borrowFee).to.equal(200);
        });

        it("应该正确设置暂停", async function () {
            await pledgePool.setPause();
            const paused = await pledgePool.globalPaused();
            expect(paused).to.equal(true);
        });

        it("应该正确设置最小金额", async function () {
            await pledgePool.setMinAmount(ethers.parseEther("100"));
            const minAmount = await pledgePool.minAmount();
            expect(minAmount).to.equal(ethers.parseEther("100"));
        });

        it("应该正确设置费用地址", async function () {
            await pledgePool.setFeeAddress(lender1.address);
            const feeAddress = await pledgePool.feeAddress();
            expect(feeAddress).to.equal(lender1.address);
        });
    });

    describe("5. 结算和清算测试", function () {
        beforeEach(async function () {
            const settleTime = (await time.latest()) + 3600;
            const endTime = settleTime + 86400;
            const interestRate = 1000;
            const maxSupply = ethers.parseEther("100000");
            const martgageRate = 15000;
            const autoLiquidateThreshold = 13000;

            await pledgePool.createPoolInfo(
                settleTime,
                endTime,
                interestRate,
                maxSupply,
                martgageRate,
                settleToken.target,
                pledgeToken.target,
                spToken.target,
                jpToken.target,
                autoLiquidateThreshold
            );
            poolId = 1;
        });

        it("应该正确检查结算条件", async function () {
            const canSettle = await pledgePool.checkoutSettle(poolId);
            expect(canSettle).to.equal(false); // 未到结算时间

            const poolInfo = await pledgePool.poolBaseInfo(poolId);
            await time.increaseTo(poolInfo.settleTime);
            
            const canSettleNow = await pledgePool.checkoutSettle(poolId);
            expect(canSettleNow).to.equal(true);
        });

        it("应该正确检查完成条件", async function () {
            // 先存款和质押
            await pledgePool.connect(lender1).depositLend(poolId, ethers.parseEther("50000"));
            await pledgePool.connect(borrower1).depositBorrow(poolId, ethers.parseEther("1"));

            const poolInfo = await pledgePool.poolBaseInfo(poolId);
            await time.increaseTo(poolInfo.settleTime);
            await pledgePool.settle(poolId);

            const canFinish = await pledgePool.checkoutFinish(poolId);
            expect(canFinish).to.equal(false); // 未到结束时间

            await time.increaseTo(poolInfo.endTime);
            const canFinishNow = await pledgePool.checkoutFinish(poolId);
            expect(canFinishNow).to.equal(true);
        });

        it("应该正确计算健康因子", async function () {
            await pledgePool.connect(lender1).depositLend(poolId, ethers.parseEther("50000"));
            await pledgePool.connect(borrower1).depositBorrow(poolId, ethers.parseEther("1"));

            const poolInfo = await pledgePool.poolBaseInfo(poolId);
            await time.increaseTo(poolInfo.settleTime);
            await pledgePool.settle(poolId);

            const healthFactor = await pledgePool.calculateHealthFactor(poolId);
            expect(healthFactor).to.be.gt(0);
        });

        it("应该正确获取清算信息", async function () {
            await pledgePool.connect(lender1).depositLend(poolId, ethers.parseEther("50000"));
            await pledgePool.connect(borrower1).depositBorrow(poolId, ethers.parseEther("1"));

            const poolInfo = await pledgePool.poolBaseInfo(poolId);
            await time.increaseTo(poolInfo.settleTime);
            await pledgePool.settle(poolId);

            const liquidationInfo = await pledgePool.getLiquidationInfo(poolId);
            expect(liquidationInfo.healthFactor).to.be.gt(0);
            expect(liquidationInfo.liquidationThreshold).to.equal(13000);
        });
    });

    describe("6. 优化功能测试", function () {
        beforeEach(async function () {
            const settleTime = (await time.latest()) + 3600;
            const endTime = settleTime + 86400;
            const interestRate = 1000;
            const maxSupply = ethers.parseEther("100000");
            const martgageRate = 15000;
            const autoLiquidateThreshold = 13000;

            await pledgePool.createPoolInfo(
                settleTime,
                endTime,
                interestRate,
                maxSupply,
                martgageRate,
                settleToken.target,
                pledgeToken.target,
                spToken.target,
                jpToken.target,
                autoLiquidateThreshold
            );
            poolId = 1;
        });

        it("应该正确返回池子数量", async function () {
            const length = await pledgePool.poolLength();
            expect(length).to.equal(1);
        });

        it("应该正确返回用户借出信息", async function () {
            await pledgePool.connect(lender1).depositLend(poolId, ethers.parseEther("10000"));
            
            const userInfo = await pledgePool.userLendInfo(lender1.address, poolId);
            expect(userInfo.stakeAmount).to.equal(ethers.parseEther("10000"));
        });

        it("应该正确返回用户借入信息", async function () {
            await pledgePool.connect(borrower1).depositBorrow(poolId, ethers.parseEther("1"));
            
            const userInfo = await pledgePool.userBorrowInfo(borrower1.address, poolId);
            expect(userInfo.stakeAmount).to.equal(ethers.parseEther("1"));
        });
    });
});
