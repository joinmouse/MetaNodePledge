const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PoolAdmin", function () {
    let poolAdmin;
    let mockToken1, mockToken2;
    let owner, alice, bob;

    beforeEach(async function () {
        [owner, alice, bob] = await ethers.getSigners();
        
        // 部署 Mock ERC20 代币
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        mockToken1 = await MockERC20.deploy("USDT", "USDT", 18);
        mockToken2 = await MockERC20.deploy("BTC", "BTC", 18);
        await mockToken1.waitForDeployment();
        await mockToken2.waitForDeployment();
        
        // 部署 PoolAdmin
        const PoolAdmin = await ethers.getContractFactory("PoolAdmin");
        poolAdmin = await PoolAdmin.deploy();
        await poolAdmin.waitForDeployment();
    });

    describe("初始化", function () {
        it("管理员应为部署者", async function () {
            expect(await poolAdmin.admin()).to.equal(owner.address);
        });

        it("池子计数器应为 0", async function () {
            expect(await poolAdmin.poolCounter()).to.equal(0);
        });
    });

    describe("创建池子", function () {
        const borrowAmount = ethers.parseEther("1000");
        const interestRate = 500; // 5%
        const pledgeRate = 15000; // 150%
        const liquidationRate = 13000; // 130%
        const endTime = Math.floor(Date.now() / 1000) + 86400; // 1天后

        it("管理员可以创建池子", async function () {
            const tx = await poolAdmin.createPool(
                await mockToken1.getAddress(),
                await mockToken2.getAddress(),
                borrowAmount,
                interestRate,
                pledgeRate,
                liquidationRate,
                endTime
            );

            await expect(tx)
                .to.emit(poolAdmin, "PoolCreated")
                .withArgs(1, owner.address, await mockToken1.getAddress(), await mockToken2.getAddress());

            expect(await poolAdmin.poolCounter()).to.equal(1);
        });

        it("非管理员不能创建池子", async function () {
            await expect(
                poolAdmin.connect(alice).createPool(
                    await mockToken1.getAddress(),
                    await mockToken2.getAddress(),
                    borrowAmount,
                    interestRate,
                    pledgeRate,
                    liquidationRate,
                    endTime
                )
            ).to.be.revertedWith("PoolStorage: caller is not admin");
        });

        it("无效参数应失败", async function () {
            // 零地址
            await expect(
                poolAdmin.createPool(
                    ethers.ZeroAddress,
                    await mockToken2.getAddress(),
                    borrowAmount,
                    interestRate,
                    pledgeRate,
                    liquidationRate,
                    endTime
                )
            ).to.be.revertedWith("PoolAdmin: invalid settle token");

            // 无效利率
            await expect(
                poolAdmin.createPool(
                    await mockToken1.getAddress(),
                    await mockToken2.getAddress(),
                    borrowAmount,
                    0,
                    pledgeRate,
                    liquidationRate,
                    endTime
                )
            ).to.be.revertedWith("PoolAdmin: invalid interest rate");

            // 过期时间
            await expect(
                poolAdmin.createPool(
                    await mockToken1.getAddress(),
                    await mockToken2.getAddress(),
                    borrowAmount,
                    interestRate,
                    pledgeRate,
                    liquidationRate,
                    Math.floor(Date.now() / 1000) - 1
                )
            ).to.be.revertedWith("PoolAdmin: invalid end time");
        });

        it("创建的池子信息应正确", async function () {
            await poolAdmin.createPool(
                await mockToken1.getAddress(),
                await mockToken2.getAddress(),
                borrowAmount,
                interestRate,
                pledgeRate,
                liquidationRate,
                endTime
            );

            const pool = await poolAdmin.getPoolInfo(1);
            expect(pool.settleToken).to.equal(await mockToken1.getAddress());
            expect(pool.pledgeToken).to.equal(await mockToken2.getAddress());
            expect(pool.borrowAmount).to.equal(borrowAmount);
            expect(pool.interestRate).to.equal(interestRate);
            expect(pool.state).to.equal(0); // MATCH
            expect(pool.creator).to.equal(owner.address);
        });
    });

    describe("池子状态管理", function () {
        beforeEach(async function () {
            await poolAdmin.createPool(
                await mockToken1.getAddress(),
                await mockToken2.getAddress(),
                ethers.parseEther("1000"),
                500,
                15000,
                13000,
                Math.floor(Date.now() / 1000) + 86400
            );
        });

        it("管理员可以设置池子状态", async function () {
            const tx = await poolAdmin.setPoolState(1, 1); // EXECUTION
            await expect(tx)
                .to.emit(poolAdmin, "PoolStateChanged")
                .withArgs(1, 0, 1);

            const pool = await poolAdmin.getPoolInfo(1);
            expect(pool.state).to.equal(1);
        });

        it("非管理员不能设置状态", async function () {
            await expect(
                poolAdmin.connect(alice).setPoolState(1, 1)
            ).to.be.revertedWith("PoolStorage: caller is not admin");
        });

        it("暂停池子功能", async function () {
            const tx = await poolAdmin.pausePool(1);
            await expect(tx)
                .to.emit(poolAdmin, "PoolStateChanged")
                .withArgs(1, 0, 2);

            const pool = await poolAdmin.getPoolInfo(1);
            expect(pool.state).to.equal(2); // FINISH
        });
    });

    describe("系统设置", function () {
        it("设置预言机地址", async function () {
            await poolAdmin.setOracle(alice.address);
            expect(await poolAdmin.oracle()).to.equal(alice.address);
        });

        it("设置债务代币地址", async function () {
            await poolAdmin.setDebtToken(alice.address);
            expect(await poolAdmin.debtToken()).to.equal(alice.address);
        });

        it("非管理员不能设置系统参数", async function () {
            await expect(
                poolAdmin.connect(alice).setOracle(alice.address)
            ).to.be.revertedWith("PoolStorage: caller is not admin");
        });
    });

    describe("查询功能", function () {
        it("获取池子数量", async function () {
            expect(await poolAdmin.getPoolsLength()).to.equal(0);
            
            await poolAdmin.createPool(
                await mockToken1.getAddress(),
                await mockToken2.getAddress(),
                ethers.parseEther("1000"),
                500,
                15000,
                13000,
                Math.floor(Date.now() / 1000) + 86400
            );
            
            expect(await poolAdmin.getPoolsLength()).to.equal(1);
        });

        it("查询不存在的池子应失败", async function () {
            await expect(
                poolAdmin.getPoolInfo(999)
            ).to.be.revertedWith("PoolStorage: pool does not exist");
        });
    });
});