const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("PoolLendBorrow - 借贷核心逻辑测试", function () {
    let poolLendBorrow;
    let oracle;
    let spToken, jpToken;
    let settleToken, pledgeToken;
    let owner, lender1, borrower1;
    let poolId;
    let multiSigWallet;

    beforeEach(async function () {
        [owner, lender1, borrower1] = await ethers.getSigners();

        // 部署MultiSigWallet
        const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
        multiSigWallet = await MultiSigWallet.deploy([owner.address], 1);
        await multiSigWallet.waitForDeployment();

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

        // 部署债权代币
        const MockDebtToken = await ethers.getContractFactory("MockDebtToken");
        spToken = await MockDebtToken.deploy("SP Token", "SP");
        jpToken = await MockDebtToken.deploy("JP Token", "JP");
        await spToken.waitForDeployment();
        await jpToken.waitForDeployment();

        // 部署PoolLendBorrow
        const PoolLendBorrow = await ethers.getContractFactory("PoolLendBorrow");
        poolLendBorrow = await PoolLendBorrow.deploy(multiSigWallet.target);
        await poolLendBorrow.waitForDeployment();

        // 设置权限
        await spToken.addMinter(poolLendBorrow.target);
        await jpToken.addMinter(poolLendBorrow.target);

        // 为所有需要多签的操作创建一次性签名（getValidSignature是view函数，可以重复使用）
        const msgHash = await multiSigWallet.getApplicationHash(owner.address, poolLendBorrow.target);
        await multiSigWallet.createApplication(poolLendBorrow.target);
        await multiSigWallet.signApplication(msgHash);

        // 设置Oracle
        await poolLendBorrow.setOracle(oracle.target);

        // 设置价格
        await oracle.setPrice(settleToken.target, ethers.parseEther("1"));
        await oracle.setPrice(pledgeToken.target, ethers.parseEther("50000"));

        // 分配代币
        await settleToken.mint(lender1.address, ethers.parseEther("100000"));
        await pledgeToken.mint(borrower1.address, ethers.parseEther("10"));

        // 授权
        await settleToken.connect(lender1).approve(poolLendBorrow.target, ethers.MaxUint256);
        await pledgeToken.connect(borrower1).approve(poolLendBorrow.target, ethers.MaxUint256);
    });

    describe("1. Admin功能测试", function () {
        it("应该成功创建池子", async function () {
            const endTime = (await time.latest()) + 86400;
            poolId = await poolLendBorrow.createPool(
                settleToken.target,
                pledgeToken.target,
                ethers.parseEther("100000"),
                1000, // 10% 年化利率
                15000, // 150% 质押率
                13000, // 130% 清算率
                endTime
            );

            const poolLength = await poolLendBorrow.getPoolsLength();
            expect(poolLength).to.equal(1);
        });

        it("应该正确设置Oracle", async function () {
            await poolLendBorrow.setOracle(oracle.target);
            expect(await poolLendBorrow.oracle()).to.equal(oracle.target);
        });

        it("应该正确设置sp和jp代币", async function () {
            const endTime = (await time.latest()) + 86400;
            await poolLendBorrow.createPool(
                settleToken.target, pledgeToken.target,
                ethers.parseEther("100000"), 1000, 15000, 13000, endTime
            );
            poolId = 1;

            await poolLendBorrow.setPoolSpToken(poolId, spToken.target);
            await poolLendBorrow.setPoolJpToken(poolId, jpToken.target);

            const poolInfo = await poolLendBorrow.getPoolInfo(poolId);
            expect(poolInfo.spToken).to.equal(spToken.target);
            expect(poolInfo.jpToken).to.equal(jpToken.target);
        });

        it("应该正确获取价格", async function () {
            const endTime = (await time.latest()) + 86400;
            await poolLendBorrow.createPool(
                settleToken.target, pledgeToken.target,
                ethers.parseEther("100000"), 1000, 15000, 13000, endTime
            );
            poolId = 1;

            const prices = await poolLendBorrow.getUnderlyingPriceView(poolId);
            expect(prices[0]).to.equal(ethers.parseEther("1"));
            expect(prices[1]).to.equal(ethers.parseEther("50000"));
        });
    });

    describe("2. Lend功能测试", function () {
        beforeEach(async function () {
            const endTime = (await time.latest()) + 86400;
            await poolLendBorrow.createPool(
                settleToken.target, pledgeToken.target,
                ethers.parseEther("100000"), 1000, 15000, 13000, endTime
            );
            poolId = 1;
            await poolLendBorrow.setPoolSpToken(poolId, spToken.target);
        });

        it("应该成功存入借出资金", async function () {
            const amount = ethers.parseEther("10000");
            await poolLendBorrow.connect(lender1).depositLend(poolId, amount);

            const lendInfo = await poolLendBorrow.getLendInfo(poolId, lender1.address);
            expect(lendInfo.amount).to.equal(amount);

            const poolInfo = await poolLendBorrow.getPoolInfo(poolId);
            expect(poolInfo.lendSupply).to.equal(amount);
        });

        it("应该正确获取借出方列表", async function () {
            const amount = ethers.parseEther("10000");
            await poolLendBorrow.connect(lender1).depositLend(poolId, amount);

            const lendersList = await poolLendBorrow.getPoolLenders(poolId);
            expect(lendersList.length).to.equal(1);
            expect(lendersList[0]).to.equal(lender1.address);
        });
    });

    describe("3. Borrow功能测试", function () {
        beforeEach(async function () {
            const settleTime = (await time.latest()) + 3600;
            const endTime = settleTime + 86400;
            await poolLendBorrow.createPool(
                settleToken.target, pledgeToken.target,
                ethers.parseEther("100000"), 1000, 15000, 13000, endTime
            );
            poolId = 1;
            await poolLendBorrow.setPoolJpToken(poolId, jpToken.target);
        });

        it("应该成功存入质押资产", async function () {
            const amount = ethers.parseEther("1");
            await poolLendBorrow.connect(borrower1).depositBorrow(poolId, amount);

            const borrowInfo = await poolLendBorrow.getUserBorrowInfo(borrower1.address, poolId);
            expect(borrowInfo.pledgeAmount).to.equal(amount);

            const poolInfo = await poolLendBorrow.getPoolInfo(poolId);
            expect(poolInfo.borrowSupply).to.equal(amount);
        });

        it("应该正确获取借入方列表", async function () {
            const amount = ethers.parseEther("1");
            await poolLendBorrow.connect(borrower1).depositBorrow(poolId, amount);

            const borrowers = await poolLendBorrow.getPoolBorrowers(poolId);
            expect(borrowers.length).to.equal(1);
            expect(borrowers[0]).to.equal(borrower1.address);
        });
    });
});
