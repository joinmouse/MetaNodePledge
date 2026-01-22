const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DebtToken", function () {
    let debtToken;
    let multiSigWallet;
    let owner, alice, bob, carol;

    // 辅助函数：创建多签申请并签名
    async function createAndSignMultiSig(signer) {
        const msgHash = await multiSigWallet.getApplicationHash(
            signer.address,
            await debtToken.getAddress()
        );
        await multiSigWallet.connect(signer).createApplication(await debtToken.getAddress());
        await multiSigWallet.connect(signer).signApplication(msgHash);
    }

    beforeEach(async function () {
        [owner, alice, bob, carol] = await ethers.getSigners();
        
        // 部署多签钱包（1个所有者，需要1个确认）
        const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
        multiSigWallet = await MultiSigWallet.deploy([owner.address], 1);
        await multiSigWallet.waitForDeployment();
        
        // 部署 DebtToken
        const DebtToken = await ethers.getContractFactory("DebtToken");
        debtToken = await DebtToken.deploy("Debt BUSD", "dBUSD", await multiSigWallet.getAddress());
        await debtToken.waitForDeployment();
    });

    describe("基础功能", function () {
        it("初始总供应量应为 0", async function () {
            expect(await debtToken.totalSupply()).to.equal(0);
        });

        it("代币名称和符号应正确", async function () {
            expect(await debtToken.name()).to.equal("Debt BUSD");
            expect(await debtToken.symbol()).to.equal("dBUSD");
        });
    });

    describe("铸造功能", function () {
        it("未授权地址不能铸造", async function () {
            await expect(
                debtToken.connect(alice).mint(bob.address, 100000)
            ).to.be.revertedWith("AddressPrivileges: Caller is not a minter");
        });

        it("添加 Minter 后可以铸造", async function () {
            // 创建多签申请并签名
            await createAndSignMultiSig(owner);

            // 添加 Minter
            await debtToken.connect(owner).addMinter(alice.address);

            expect(await debtToken.balanceOf(bob.address)).to.equal(0);

            // Alice 铸造代币给 Bob
            await debtToken.connect(alice).mint(bob.address, 100000);
            expect(await debtToken.balanceOf(bob.address)).to.equal(100000);

            // 再次铸造
            await debtToken.connect(alice).mint(bob.address, 10000);
            expect(await debtToken.balanceOf(bob.address)).to.equal(110000);
        });

        it("铸造后总供应量应正确", async function () {
            // 创建多签申请并签名
            await createAndSignMultiSig(owner);

            // 添加 Minter
            await debtToken.connect(owner).addMinter(alice.address);

            await debtToken.connect(alice).mint(bob.address, 200);
            expect(await debtToken.totalSupply()).to.equal(200);
        });
    });

    describe("销毁功能", function () {
        beforeEach(async function () {
            // 创建多签申请并签名
            await createAndSignMultiSig(owner);

            // 添加 Minter 并铸造一些代币
            await debtToken.connect(owner).addMinter(alice.address);
            await debtToken.connect(alice).mint(bob.address, 100000);
        });

        it("Minter 可以销毁代币", async function () {
            expect(await debtToken.balanceOf(bob.address)).to.equal(100000);
            
            await debtToken.connect(alice).burn(bob.address, 30000);
            expect(await debtToken.balanceOf(bob.address)).to.equal(70000);
        });

        it("未授权地址不能销毁", async function () {
            await expect(
                debtToken.connect(carol).burn(bob.address, 10000)
            ).to.be.revertedWith("AddressPrivileges: Caller is not a minter");
        });
    });

    describe("Minter 权限管理", function () {
        it("未经多签批准不能添加 Minter", async function () {
            await expect(
                debtToken.connect(alice).addMinter(alice.address)
            ).to.be.revertedWith("MultiSigClient: Transaction not approved by multi-signature");
        });

        it("移除 Minter 后不能再铸造", async function () {
            // 创建多签申请并签名
            await createAndSignMultiSig(owner);

            // 添加 Minter
            await debtToken.connect(owner).addMinter(alice.address);

            await debtToken.connect(alice).mint(bob.address, 100000);
            expect(await debtToken.balanceOf(bob.address)).to.equal(100000);

            // 移除 Minter
            await debtToken.connect(owner).delMinter(alice.address);

            await expect(
                debtToken.connect(alice).mint(bob.address, 100000)
            ).to.be.revertedWith("AddressPrivileges: Caller is not a minter");
        });

        it("isMinter 和 getMinterLength 应正常工作", async function () {
            expect(await debtToken.getMinterLength()).to.equal(0);

            // 创建多签申请并签名
            await createAndSignMultiSig(owner);

            // 添加两个 Minter
            await debtToken.connect(owner).addMinter(alice.address);
            await debtToken.connect(owner).addMinter(bob.address);

            expect(await debtToken.getMinterLength()).to.equal(2);
            expect(await debtToken.isMinter(alice.address)).to.equal(true);
            expect(await debtToken.isMinter(bob.address)).to.equal(true);
            expect(await debtToken.isMinter(owner.address)).to.equal(false);

            // 移除一个 Minter
            await debtToken.connect(owner).delMinter(bob.address);

            expect(await debtToken.getMinterLength()).to.equal(1);
            expect(await debtToken.isMinter(bob.address)).to.equal(false);
        });

        it("getMinter 应正常工作", async function () {
            // 创建多签申请并签名
            await createAndSignMultiSig(owner);

            // 添加两个 Minter
            await debtToken.connect(owner).addMinter(alice.address);
            await debtToken.connect(owner).addMinter(bob.address);

            expect(await debtToken.getMinter(0)).to.equal(alice.address);
            expect(await debtToken.getMinter(1)).to.equal(bob.address);
            
            await expect(
                debtToken.getMinter(2)
            ).to.be.revertedWith("AddressPrivileges: Index out of bounds");

            // 移除 Alice
            await debtToken.connect(owner).delMinter(alice.address);

            expect(await debtToken.getMinter(0)).to.equal(bob.address);
            await expect(
                debtToken.getMinter(1)
            ).to.be.revertedWith("AddressPrivileges: Index out of bounds");
        });
    });
});
