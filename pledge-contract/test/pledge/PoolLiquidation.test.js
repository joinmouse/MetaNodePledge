const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("PoolLiquidation", function () {
    async function deployPoolLiquidationFixture() {
        const [owner, user1, user2, liquidator] = await ethers.getSigners();

        // 部署Mock合约
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const settleToken = await MockERC20.deploy("Settle Token", "SETTLE", 18);
        const pledgeToken = await MockERC20.deploy("Pledge Token", "PLEDGE", 18);

        const MockDebtToken = await ethers.getContractFactory("MockDebtToken");
        const spToken = await MockDebtToken.deploy("SP Token", "SP");
        const jpToken = await MockDebtToken.deploy("JP Token", "JP");

        const MockOracle = await ethers.getContractFactory("MockOracle");
        const oracle = await MockOracle.deploy();

        // 部署PoolLiquidation合约
        const PoolLiquidation = await ethers.getContractFactory("PoolLiquidation");
        const poolLiquidation = await PoolLiquidation.deploy();

        // 设置预言机
        await poolLiquidation.setOracle(oracle.target);

        // 给用户分发代币
        const mintAmount = ethers.parseEther("10000");
        await settleToken.mint(user1.address, mintAmount);
        await pledgeToken.mint(user1.address, mintAmount);
        await settleToken.mint(user2.address, mintAmount);
        await pledgeToken.mint(user2.address, mintAmount);
        await settleToken.mint(poolLiquidation.target, ethers.parseEther("5000"));
        await pledgeToken.mint(poolLiquidation.target, ethers.parseEther("5000"));

        // 设置权限
        await spToken.setMinter(poolLiquidation.target, true);
        await jpToken.setMinter(poolLiquidation.target, true);

        // 设置价格（1 PLEDGE = 1 SETTLE）
        await oracle.setPrice(pledgeToken.target, ethers.parseEther("1"));
        await oracle.setPrice(settleToken.target, ethers.parseEther("1"));

        return {
            poolLiquidation,
            settleToken,
            pledgeToken,
            spToken,
            jpToken,
            oracle,
            owner,
            user1,
            user2,
            liquidator
        };
    }

    describe("清算机制", function () {
        it("应该正确计算健康因子", async function () {
            const { poolLiquidation, settleToken, pledgeToken, spToken, jpToken, user1 } = 
                await loadFixture(deployPoolLiquidationFixture);

            // 创建池子
            const endTime = Math.floor(Date.now() / 1000) + 86400;
            const settleTime = Math.floor(Date.now() / 1000) + 3600;
            await poolLiquidation.createPool(
                settleToken.target,
                pledgeToken.target,
                ethers.parseEther("1000"),
                500,
                15000, // 150% 质押率
                13000, // 130% 清算率
                endTime
            );

            const poolId = 1;
            await poolLiquidation.setPoolSpToken(poolId, spToken.target);
            await poolLiquidation.setPoolJpToken(poolId, jpToken.target);
            await poolLiquidation.setPoolSettleTime(poolId, settleTime);

            // 用户质押
            const pledgeAmount = ethers.parseEther("150");
            await pledgeToken.connect(user1).approve(poolLiquidation.target, pledgeAmount);
            await poolLiquidation.connect(user1).depositBorrow(poolId, pledgeAmount);

            // 设置池子状态为EXECUTION
            await poolLiquidation.setPoolState(poolId, 1); // EXECUTION

            // 用户领取借款
            await poolLiquidation.connect(user1).claimBorrow(poolId);

            // 计算健康因子
            const healthFactor = await poolLiquidation.calculateHealthFactor(poolId);
            
            // 健康因子应该是150%（质押150，借100）
            expect(healthFactor).to.equal(15000);
        });

        it("应该在健康因子低于清算阈值时触发清算", async function () {
            const { poolLiquidation, settleToken, pledgeToken, spToken, jpToken, oracle, user1, liquidator } = 
                await loadFixture(deployPoolLiquidationFixture);

            // 创建池子
            const endTime = Math.floor(Date.now() / 1000) + 86400;
            const settleTime = Math.floor(Date.now() / 1000) + 3600;
            await poolLiquidation.createPool(
                settleToken.target,
                pledgeToken.target,
                ethers.parseEther("1000"),
                500,
                15000,
                13000,
                endTime
            );

            const poolId = 1;
            await poolLiquidation.setPoolSpToken(poolId, spToken.target);
            await poolLiquidation.setPoolJpToken(poolId, jpToken.target);
            await poolLiquidation.setPoolSettleTime(poolId, settleTime);

            // 用户质押
            const pledgeAmount = ethers.parseEther("150");
            await pledgeToken.connect(user1).approve(poolLiquidation.target, pledgeAmount);
            await poolLiquidation.connect(user1).depositBorrow(poolId, pledgeAmount);

            // 设置池子状态为EXECUTION
            await poolLiquidation.setPoolState(poolId, 1);
            await poolLiquidation.connect(user1).claimBorrow(poolId);

            // 模拟价格下跌，质押资产价值降低
            // 将质押代币价格降低到0.8，健康因子变为120%，低于清算阈值130%
            await oracle.setPrice(pledgeToken.target, ethers.parseEther("0.8"));

            // 快进时间到settleTime之后
            await time.increaseTo(settleTime + 1);

            // 检查是否可以清算
            const canLiquidate = await poolLiquidation.canLiquidate(poolId);
            expect(canLiquidate).to.be.true;

            // 执行清算
            await expect(
                poolLiquidation.connect(liquidator).liquidatePool(poolId)
            ).to.emit(poolLiquidation, "LiquidationTriggered");

            // 检查池子状态
            const pool = await poolLiquidation.getPool(poolId);
            expect(pool.state).to.equal(3); // LIQUIDATION
        });

        it("应该给清算者奖励", async function () {
            const { poolLiquidation, settleToken, pledgeToken, spToken, jpToken, oracle, user1, liquidator } = 
                await loadFixture(deployPoolLiquidationFixture);

            // 创建池子并触发清算
            const endTime = Math.floor(Date.now() / 1000) + 86400;
            const settleTime = Math.floor(Date.now() / 1000) + 3600;
            await poolLiquidation.createPool(
                settleToken.target,
                pledgeToken.target,
                ethers.parseEther("1000"),
                500,
                15000,
                13000,
                endTime
            );

            const poolId = 1;
            await poolLiquidation.setPoolSpToken(poolId, spToken.target);
            await poolLiquidation.setPoolJpToken(poolId, jpToken.target);
            await poolLiquidation.setPoolSettleTime(poolId, settleTime);

            const pledgeAmount = ethers.parseEther("150");
            await pledgeToken.connect(user1).approve(poolLiquidation.target, pledgeAmount);
            await poolLiquidation.connect(user1).depositBorrow(poolId, pledgeAmount);

            await poolLiquidation.setPoolState(poolId, 1);
            await poolLiquidation.connect(user1).claimBorrow(poolId);

            // 降低价格触发清算
            await oracle.setPrice(pledgeToken.target, ethers.parseEther("0.8"));

            // 快进时间到settleTime之后
            await time.increaseTo(settleTime + 1);

            const liquidatorBalanceBefore = await pledgeToken.balanceOf(liquidator.address);

            // 执行清算
            await poolLiquidation.connect(liquidator).liquidatePool(poolId);

            const liquidatorBalanceAfter = await pledgeToken.balanceOf(liquidator.address);
            
            // 清算者应该获得5%的奖励
            const expectedReward = pledgeAmount * 500n / 10000n;
            expect(liquidatorBalanceAfter - liquidatorBalanceBefore).to.equal(expectedReward);
        });

        it("应该允许借出方在清算后提取资金", async function () {
            const { poolLiquidation, settleToken, pledgeToken, spToken, jpToken, oracle, user1, user2, liquidator } = 
                await loadFixture(deployPoolLiquidationFixture);

            // 创建池子
            const endTime = Math.floor(Date.now() / 1000) + 86400;
            const settleTime = Math.floor(Date.now() / 1000) + 3600;
            await poolLiquidation.createPool(
                settleToken.target,
                pledgeToken.target,
                ethers.parseEther("1000"),
                500,
                15000,
                13000,
                endTime
            );

            const poolId = 1;
            await poolLiquidation.setPoolSpToken(poolId, spToken.target);
            await poolLiquidation.setPoolJpToken(poolId, jpToken.target);
            await poolLiquidation.setPoolSettleTime(poolId, settleTime);

            // user2作为借出方存款
            const lendAmount = ethers.parseEther("100");
            await settleToken.connect(user2).approve(poolLiquidation.target, lendAmount);
            await poolLiquidation.connect(user2).depositLend(poolId, lendAmount);

            // user1作为借入方质押
            const pledgeAmount = ethers.parseEther("150");
            await pledgeToken.connect(user1).approve(poolLiquidation.target, pledgeAmount);
            await poolLiquidation.connect(user1).depositBorrow(poolId, pledgeAmount);

            // 设置池子状态并领取
            await poolLiquidation.setPoolState(poolId, 1);
            await poolLiquidation.setPoolLendAmount(poolId, lendAmount);
            await poolLiquidation.connect(user1).claimBorrow(poolId);
            await poolLiquidation.connect(user2).claimLend(poolId);

            // 触发清算
            await oracle.setPrice(pledgeToken.target, ethers.parseEther("0.8"));
            
            // 快进时间到settleTime之后
            await time.increaseTo(settleTime + 1);
            
            await poolLiquidation.connect(liquidator).liquidatePool(poolId);

            // 借出方提取资金
            const user2BalanceBefore = await settleToken.balanceOf(user2.address);
            await poolLiquidation.connect(user2).withdrawLendAfterLiquidation(poolId);
            const user2BalanceAfter = await settleToken.balanceOf(user2.address);

            // 借出方应该能取回部分资金（扣除清算损失）
            expect(user2BalanceAfter).to.be.gt(user2BalanceBefore);
        });

        it("应该允许借入方在清算后赎回剩余质押资产", async function () {
            const { poolLiquidation, settleToken, pledgeToken, spToken, jpToken, oracle, user1, liquidator } = 
                await loadFixture(deployPoolLiquidationFixture);

            // 创建池子并触发清算
            const endTime = Math.floor(Date.now() / 1000) + 86400;
            const settleTime = Math.floor(Date.now() / 1000) + 3600;
            await poolLiquidation.createPool(
                settleToken.target,
                pledgeToken.target,
                ethers.parseEther("1000"),
                500,
                15000,
                13000,
                endTime
            );

            const poolId = 1;
            await poolLiquidation.setPoolSpToken(poolId, spToken.target);
            await poolLiquidation.setPoolJpToken(poolId, jpToken.target);
            await poolLiquidation.setPoolSettleTime(poolId, settleTime);

            const pledgeAmount = ethers.parseEther("150");
            await pledgeToken.connect(user1).approve(poolLiquidation.target, pledgeAmount);
            await poolLiquidation.connect(user1).depositBorrow(poolId, pledgeAmount);

            await poolLiquidation.setPoolState(poolId, 1);
            await poolLiquidation.connect(user1).claimBorrow(poolId);

            // 触发清算
            await oracle.setPrice(pledgeToken.target, ethers.parseEther("0.8"));
            
            // 快进时间到settleTime之后
            await time.increaseTo(settleTime + 1);
            
            await poolLiquidation.connect(liquidator).liquidatePool(poolId);

            // 借入方赎回剩余质押资产
            const user1BalanceBefore = await pledgeToken.balanceOf(user1.address);
            await poolLiquidation.connect(user1).withdrawBorrowAfterLiquidation(poolId);
            const user1BalanceAfter = await pledgeToken.balanceOf(user1.address);

            // 借入方应该能取回85%的质押资产（扣除10%惩罚+5%奖励）
            const expectedAmount = pledgeAmount * 8500n / 10000n;
            expect(user1BalanceAfter - user1BalanceBefore).to.equal(expectedAmount);
        });

        it("应该正确获取清算信息", async function () {
            const { poolLiquidation, settleToken, pledgeToken, spToken, jpToken, user1 } = 
                await loadFixture(deployPoolLiquidationFixture);

            // 创建池子
            const endTime = Math.floor(Date.now() / 1000) + 86400;
            const settleTime = Math.floor(Date.now() / 1000) + 3600;
            await poolLiquidation.createPool(
                settleToken.target,
                pledgeToken.target,
                ethers.parseEther("1000"),
                500,
                15000,
                13000,
                endTime
            );

            const poolId = 1;
            await poolLiquidation.setPoolSpToken(poolId, spToken.target);
            await poolLiquidation.setPoolJpToken(poolId, jpToken.target);
            await poolLiquidation.setPoolSettleTime(poolId, settleTime);

            const pledgeAmount = ethers.parseEther("150");
            await pledgeToken.connect(user1).approve(poolLiquidation.target, pledgeAmount);
            await poolLiquidation.connect(user1).depositBorrow(poolId, pledgeAmount);

            await poolLiquidation.setPoolState(poolId, 1);
            await poolLiquidation.connect(user1).claimBorrow(poolId);

            // 获取清算信息
            const liquidationInfo = await poolLiquidation.getLiquidationInfo(poolId);
            
            expect(liquidationInfo.healthFactor).to.equal(15000);
            expect(liquidationInfo.liquidationThreshold).to.equal(13000);
            expect(liquidationInfo.canLiquidatePool).to.be.false;
            expect(liquidationInfo.totalPledgeAmount).to.equal(pledgeAmount);
        });
    });
});
