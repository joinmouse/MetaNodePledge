const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("PledgePool - V2对齐集成测试", function () {
    let pledgePool;
    let oracle;
    let debtTokenFactory;
    let spToken, jpToken;
    let settleToken, pledgeToken;
    let owner, lender1, lender2, borrower1, borrower2;
    let poolId;

    const RATE_BASE = 10000;
    const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

    beforeEach(async function () {
        [owner, lender1, lender2, borrower1, borrower2] = await ethers.getSigners();

        // 部署Oracle
        const Oracle = await ethers.getContractFactory("Oracle");
        oracle = await Oracle.deploy();
        await oracle.waitForDeployment();

        // 部署测试代币
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        settleToken = await MockERC20.deploy("USDT", "USDT", 18);
        pledgeToken = await MockERC20.deploy("BTC", "BTC", 18);
        await settleToken.waitForDeployment();
        await pledgeToken.waitForDeployment();

        // 部署DebtToken
        const DebtToken = await ethers.getContractFactory("DebtToken");
        spToken = await DebtToken.deploy("SP Token", "SP");
        jpToken = await DebtToken.deploy("JP Token", "JP");
        await spToken.waitForDeployment();
        await jpToken.waitForDeployment();

        // 部署PledgePool主合约
        const PledgePool = await ethers.getContractFactory("PledgePool");
        pledgePool = await PledgePool.deploy();
        await pledgePool.waitForDeployment();

        // 设置Oracle
        await pledgePool.setOracle(await oracle.getAddress());

        // 设置价格
        await oracle.setPrice(await settleToken.getAddress(), ethers.parseEther("1")); // 1 USDT = $1
        await oracle.setPrice(await pledgeToken.getAddress(), ethers.parseEther("50000")); // 1 BTC = $50000

        // 给测试账户分配代币
        await settleToken.mint(lender1.address, ethers.parseEther("100000"));
        await settleToken.mint(lender2.address, ethers.parseEther("100000"));
        await pledgeToken.mint(borrower1.address, ethers.parseEther("10"));
        await pledgeToken.mint(borrower2.address, ethers.parseEther("10"));

        // 授权
        await settleToken.connect(lender1).approve(await pledgePool.getAddress(), ethers.MaxUint256);
        await settleToken.connect(lender2).approve(await pledgePool.getAddress(), ethers.MaxUint256);
        await pledgeToken.connect(borrower1).approve(await pledgePool.getAddress(), ethers.MaxUint256);
        await pledgeToken.connect(borrower2).approve(await pledgePool.getAddress(), ethers.MaxUint256);

        // 设置DebtToken的minter
        await spToken.setMinter(await pledgePool.getAddress());
        await jpToken.setMinter(await pledgePool.getAddress());
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
                await settleToken.getAddress(),
                await pledgeToken.getAddress(),
                await spToken.getAddress(),
                await jpToken.getAddress(),
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
                await settleToken.getAddress(),
                await pledgeToken.getAddress(),
                await spToken.getAddress(),
                await jpToken.getAddress(),
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

            console.log("✅ 完整流程测试通过");
        });

        it("应该正确处理退款", async function () {
            // 借出方存款
            await pledgePool.connect(lender1).depositLend(poolId, ethers.parseEther("50000"));

            // 在MATCH状态下取消
            const balanceBefore = await settleToken.balanceOf(lender1.address);
            await pledgePool.connect(lender1).refundLend(poolId, ethers.parseEther("10000"));
            const balanceAfter = await settleToken.balanceOf(lender1.address);

            expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("10000"));
            console.log("✅ 退款测试通过");
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
                await settleToken.getAddress(),
                await pledgeToken.getAddress(),
                await spToken.getAddress(),
                await jpToken.getAddress(),
                autoLiquidateThreshold
            );
            poolId = 1;
        });

        it("应该正确返回poolBaseInfo", async function () {
            const info = await pledgePool.poolBaseInfo(poolId);
            expect(info.maxSupply).to.equal(ethers.parseEther("100000"));
            expect(info.interestRate).to.equal(1000);
            console.log("✅ poolBaseInfo查询测试通过");
        });

        it("应该正确返回poolDataInfo", async function () {
            const info = await pledgePool.poolDataInfo(poolId);
            expect(info.settleAmountLend).to.equal(0);
            console.log("✅ poolDataInfo查询测试通过");
        });

        it("应该正确返回getPoolState", async function () {
            const state = await pledgePool.getPoolState(poolId);
            expect(state).to.equal(0); // MATCH
            console.log("✅ getPoolState查询测试通过");
        });

        it("应该正确返回getUnderlyingPriceView", async function () {
            const prices = await pledgePool.getUnderlyingPriceView(poolId);
            expect(prices[0]).to.equal(ethers.parseEther("1")); // USDT价格
            expect(prices[1]).to.equal(ethers.parseEther("50000")); // BTC价格
            console.log("✅ getUnderlyingPriceView查询测试通过");
        });
    });

    describe("4. 管理方法测试", function () {
        it("应该正确设置费率", async function () {
            await pledgePool.setFee(100, 200); // 1% lendFee, 2% borrowFee
            const config = await pledgePool.getFeeConfig();
            expect(config._lendFee).to.equal(100);
            expect(config._borrowFee).to.equal(200);
            console.log("✅ setFee测试通过");
        });

        it("应该正确设置暂停", async function () {
            await pledgePool.setPause(true);
            const config = await pledgePool.getFeeConfig();
            expect(config._globalPaused).to.equal(true);
            console.log("✅ setPause测试通过");
        });

        it("应该正确设置最小金额", async function () {
            await pledgePool.setMinAmount(ethers.parseEther("100"));
            const config = await pledgePool.getFeeConfig();
            expect(config._minAmount).to.equal(ethers.parseEther("100"));
            console.log("✅ setMinAmount测试通过");
        });
    });
});
