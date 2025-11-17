const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("PoolBorrow", function () {
    async function deployPoolBorrowFixture() {
        const [owner, user1, user2] = await ethers.getSigners();

        // 部署Mock合约
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const settleToken = await MockERC20.deploy("Settle Token", "SETTLE", 18);
        const pledgeToken = await MockERC20.deploy("Pledge Token", "PLEDGE", 18);

        const MockDebtToken = await ethers.getContractFactory("MockDebtToken");
        const spToken = await MockDebtToken.deploy("SP Token", "SP");
        const jpToken = await MockDebtToken.deploy("JP Token", "JP");

        const MockOracle = await ethers.getContractFactory("MockOracle");
        const oracle = await MockOracle.deploy();

        // 部署PoolBorrow合约
        const PoolBorrow = await ethers.getContractFactory("PoolBorrow");
        const poolBorrow = await PoolBorrow.deploy();

        // 设置预言机
        await poolBorrow.setOracle(oracle.target);

        // 给用户分发代币
        const mintAmount = ethers.parseEther("10000");
        await settleToken.mint(user1.address, mintAmount);
        await pledgeToken.mint(user1.address, mintAmount);
        await settleToken.mint(poolBorrow.target, ethers.parseEther("5000"));

        // 设置权限
        await spToken.setMinter(poolBorrow.target, true);
        await jpToken.setMinter(poolBorrow.target, true);

        return {
            poolBorrow,
            settleToken,
            pledgeToken,
            spToken,
            jpToken,
            oracle,
            owner,
            user1,
            user2
        };
    }

    describe("基本功能", function () {
        it("应该正确部署合约", async function () {
            const { poolBorrow, oracle } = await loadFixture(deployPoolBorrowFixture);
            
            expect(await poolBorrow.oracle()).to.equal(oracle.target);
            expect(await poolBorrow.getPoolsLength()).to.equal(0);
        });

        it("应该能创建池子", async function () {
            const { poolBorrow, settleToken, pledgeToken } = await loadFixture(deployPoolBorrowFixture);

            const endTime = Math.floor(Date.now() / 1000) + 86400;
            const interestRate = 500;
            const borrowAmount = ethers.parseEther("1000");
            const pledgeRate = 15000;
            const liquidationRate = 13000;

            await expect(
                poolBorrow.createPool(
                    settleToken.target,
                    pledgeToken.target,
                    borrowAmount,
                    interestRate,
                    pledgeRate,
                    liquidationRate,
                    endTime
                )
            ).to.emit(poolBorrow, "PoolCreated");

            expect(await poolBorrow.getPoolsLength()).to.equal(1);
        });

        it("应该允许用户质押", async function () {
            const { poolBorrow, settleToken, pledgeToken, spToken, jpToken, user1 } = 
                await loadFixture(deployPoolBorrowFixture);

            // 创建池子
            const endTime = Math.floor(Date.now() / 1000) + 86400;
            await poolBorrow.createPool(
                settleToken.target,
                pledgeToken.target,
                ethers.parseEther("1000"),
                500,
                15000,
                13000,
                endTime
            );

            const poolId = 1;
            await poolBorrow.setPoolSpToken(poolId, spToken.target);
            await poolBorrow.setPoolJpToken(poolId, jpToken.target);

            const pledgeAmount = ethers.parseEther("100");
            await pledgeToken.connect(user1).approve(poolBorrow.target, pledgeAmount);

            await expect(
                poolBorrow.connect(user1).depositBorrow(poolId, pledgeAmount)
            ).to.emit(poolBorrow, "DepositBorrow");

            const borrowInfo = await poolBorrow.getUserBorrowInfo(user1.address, poolId);
            expect(borrowInfo.pledgeAmount).to.equal(pledgeAmount);
        });

        it("应该允许用户领取借入资金", async function () {
            const { poolBorrow, settleToken, pledgeToken, spToken, jpToken, user1 } = 
                await loadFixture(deployPoolBorrowFixture);

            // 创建池子并质押
            const endTime = Math.floor(Date.now() / 1000) + 86400;
            await poolBorrow.createPool(
                settleToken.target,
                pledgeToken.target,
                ethers.parseEther("1000"),
                500,
                15000,
                13000,
                endTime
            );

            const poolId = 1;
            await poolBorrow.setPoolSpToken(poolId, spToken.target);
            await poolBorrow.setPoolJpToken(poolId, jpToken.target);

            const pledgeAmount = ethers.parseEther("150");
            await pledgeToken.connect(user1).approve(poolBorrow.target, pledgeAmount);
            await poolBorrow.connect(user1).depositBorrow(poolId, pledgeAmount);

            // 设置池子状态为EXECUTION
            await poolBorrow.setPoolState(poolId, 1); // EXECUTION

            await expect(
                poolBorrow.connect(user1).claimBorrow(poolId)
            ).to.emit(poolBorrow, "ClaimBorrow");

            const borrowInfo = await poolBorrow.getUserBorrowInfo(user1.address, poolId);
            expect(borrowInfo.settled).to.be.true;
            expect(borrowInfo.borrowAmount).to.be.gt(0);
        });

        it("应该正确计算借入金额", async function () {
            const { poolBorrow, settleToken, pledgeToken, spToken, jpToken, user1 } = 
                await loadFixture(deployPoolBorrowFixture);

            // 创建池子
            const endTime = Math.floor(Date.now() / 1000) + 86400;
            await poolBorrow.createPool(
                settleToken.target,
                pledgeToken.target,
                ethers.parseEther("1000"),
                500,
                15000, // 150% 质押率
                13000,
                endTime
            );

            const poolId = 1;
            await poolBorrow.setPoolSpToken(poolId, spToken.target);
            await poolBorrow.setPoolJpToken(poolId, jpToken.target);

            const pledgeAmount = ethers.parseEther("150");
            await pledgeToken.connect(user1).approve(poolBorrow.target, pledgeAmount);
            await poolBorrow.connect(user1).depositBorrow(poolId, pledgeAmount);

            const borrowAmount = await poolBorrow.calculateBorrowAmount(user1.address, poolId);
            // 150 ETH * 10000 / 15000 = 100 ETH
            expect(borrowAmount).to.equal(ethers.parseEther("100"));
        });
    });
});