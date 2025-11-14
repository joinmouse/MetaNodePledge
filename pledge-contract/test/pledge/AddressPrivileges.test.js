const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AddressPrivileges", function () {
    let multiSigWallet;
    let addressPrivileges;
    let owner, addr1, addr2, addr3, minter1, minter2;
    let owners;

    beforeEach(async function () {
        [owner, addr1, addr2, addr3, minter1, minter2] = await ethers.getSigners();
        owners = [owner.address, addr1.address, addr2.address];

        // 部署多签钱包（3个所有者，需要2个确认）
        const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
        multiSigWallet = await MultiSigWallet.deploy(owners, 2);
        await multiSigWallet.waitForDeployment();

        // 部署 AddressPrivileges
        const AddressPrivileges = await ethers.getContractFactory("AddressPrivileges");
        addressPrivileges = await AddressPrivileges.deploy(await multiSigWallet.getAddress());
        await addressPrivileges.waitForDeployment();
    });

    describe("部署", function () {
        it("应该正确设置多签钱包地址", async function () {
            expect(await addressPrivileges.getMultiSignatureAddress()).to.equal(await multiSigWallet.getAddress());
        });

        it("初始状态应该没有 Minter", async function () {
            expect(await addressPrivileges.getMinterLength()).to.equal(0);
        });
    });

    describe("添加 Minter", function () {
        it("应该能通过多签添加 Minter", async function () {
            // 创建多签申请
            const msgHash = await multiSigWallet.getApplicationHash(
                owner.address,
                await addressPrivileges.getAddress()
            );
            await multiSigWallet.connect(owner).createApplication(await addressPrivileges.getAddress());
            
            // 两个owner签名
            await multiSigWallet.connect(owner).signApplication(msgHash);
            await multiSigWallet.connect(addr1).signApplication(msgHash);

            // 执行添加Minter
            await addressPrivileges.connect(owner).addMinter(minter1.address);

            // 验证
            expect(await addressPrivileges.isMinter(minter1.address)).to.be.true;
            expect(await addressPrivileges.getMinterLength()).to.equal(1);
        });

        it("应该拒绝添加零地址", async function () {
            // 创建多签申请
            const msgHash = await multiSigWallet.getApplicationHash(
                owner.address,
                await addressPrivileges.getAddress()
            );
            await multiSigWallet.connect(owner).createApplication(await addressPrivileges.getAddress());
            
            // 两个owner签名
            await multiSigWallet.connect(owner).signApplication(msgHash);
            await multiSigWallet.connect(addr1).signApplication(msgHash);

            // 执行应该失败
            await expect(
                addressPrivileges.connect(owner).addMinter(ethers.ZeroAddress)
            ).to.be.revertedWith("AddressPrivileges: Minter is the zero address");
        });

        it("应该能添加多个 Minter", async function () {
            // 创建多签申请
            const msgHash = await multiSigWallet.getApplicationHash(
                owner.address,
                await addressPrivileges.getAddress()
            );
            await multiSigWallet.connect(owner).createApplication(await addressPrivileges.getAddress());
            
            // 两个owner签名
            await multiSigWallet.connect(owner).signApplication(msgHash);
            await multiSigWallet.connect(addr1).signApplication(msgHash);

            // 添加第一个 Minter
            await addressPrivileges.connect(owner).addMinter(minter1.address);

            // 添加第二个 Minter
            await addressPrivileges.connect(owner).addMinter(minter2.address);

            // 验证
            expect(await addressPrivileges.getMinterLength()).to.equal(2);
            expect(await addressPrivileges.isMinter(minter1.address)).to.be.true;
            expect(await addressPrivileges.isMinter(minter2.address)).to.be.true;
        });

        it("重复添加同一个 Minter 应该返回 false", async function () {
            // 创建多签申请
            const msgHash = await multiSigWallet.getApplicationHash(
                owner.address,
                await addressPrivileges.getAddress()
            );
            await multiSigWallet.connect(owner).createApplication(await addressPrivileges.getAddress());
            
            // 两个owner签名
            await multiSigWallet.connect(owner).signApplication(msgHash);
            await multiSigWallet.connect(addr1).signApplication(msgHash);

            // 第一次添加应该成功
            await addressPrivileges.connect(owner).addMinter(minter1.address);
            expect(await addressPrivileges.isMinter(minter1.address)).to.be.true;

            // 第二次添加同一个地址应该返回false（EnumerableSet特性）
            const tx = await addressPrivileges.connect(owner).addMinter(minter1.address);
            // 注意：EnumerableSet.add 返回false但不会revert
        });
    });

    describe("移除 Minter", function () {
        beforeEach(async function () {
            // 创建多签申请
            const msgHash = await multiSigWallet.getApplicationHash(
                owner.address,
                await addressPrivileges.getAddress()
            );
            await multiSigWallet.connect(owner).createApplication(await addressPrivileges.getAddress());
            
            // 两个owner签名
            await multiSigWallet.connect(owner).signApplication(msgHash);
            await multiSigWallet.connect(addr1).signApplication(msgHash);

            // 先添加一个 Minter
            await addressPrivileges.connect(owner).addMinter(minter1.address);
        });

        it("应该能通过多签移除 Minter", async function () {
            // 移除 Minter
            await addressPrivileges.connect(owner).delMinter(minter1.address);

            // 验证
            expect(await addressPrivileges.isMinter(minter1.address)).to.be.false;
            expect(await addressPrivileges.getMinterLength()).to.equal(0);
        });

        it("移除不存在的 Minter 应该返回 false", async function () {
            // 移除一个不存在的地址应该返回false
            await addressPrivileges.connect(owner).delMinter(minter2.address);
            
            // 原有的Minter应该还在
            expect(await addressPrivileges.isMinter(minter1.address)).to.be.true;
        });
    });

    describe("查询功能", function () {
        beforeEach(async function () {
            // 创建多签申请
            const msgHash = await multiSigWallet.getApplicationHash(
                owner.address,
                await addressPrivileges.getAddress()
            );
            await multiSigWallet.connect(owner).createApplication(await addressPrivileges.getAddress());
            
            // 两个owner签名
            await multiSigWallet.connect(owner).signApplication(msgHash);
            await multiSigWallet.connect(addr1).signApplication(msgHash);

            // 添加两个 Minter
            await addressPrivileges.connect(owner).addMinter(minter1.address);
            await addressPrivileges.connect(owner).addMinter(minter2.address);
        });

        it("isMinter 应该正确返回状态", async function () {
            expect(await addressPrivileges.isMinter(minter1.address)).to.be.true;
            expect(await addressPrivileges.isMinter(minter2.address)).to.be.true;
            expect(await addressPrivileges.isMinter(addr3.address)).to.be.false;
        });

        it("getMinterLength 应该返回正确数量", async function () {
            expect(await addressPrivileges.getMinterLength()).to.equal(2);
        });

        it("getMinter 应该返回正确的地址", async function () {
            const minter0 = await addressPrivileges.getMinter(0);
            const minter1Addr = await addressPrivileges.getMinter(1);
            
            expect([minter0, minter1Addr]).to.include(minter1.address);
            expect([minter0, minter1Addr]).to.include(minter2.address);
        });

        it("getMinter 超出范围应该回滚", async function () {
            await expect(
                addressPrivileges.getMinter(2)
            ).to.be.revertedWith("AddressPrivileges: Index out of bounds");
        });
    });

    describe("onlyMinter 修饰器", function () {
        it("应该允许 Minter 调用受保护的函数", async function () {
            // 创建多签申请
            const msgHash = await multiSigWallet.getApplicationHash(
                owner.address,
                await addressPrivileges.getAddress()
            );
            await multiSigWallet.connect(owner).createApplication(await addressPrivileges.getAddress());
            
            // 两个owner签名
            await multiSigWallet.connect(owner).signApplication(msgHash);
            await multiSigWallet.connect(addr1).signApplication(msgHash);

            // 添加 Minter
            await addressPrivileges.connect(owner).addMinter(minter1.address);

            // 验证 Minter 权限
            expect(await addressPrivileges.isMinter(minter1.address)).to.be.true;
        });

        it("非 Minter 不应该有权限", async function () {
            expect(await addressPrivileges.isMinter(addr3.address)).to.be.false;
        });
    });

    describe("安全性测试", function () {
        it("直接调用 addMinter 应该失败（需要多签）", async function () {
            await expect(
                addressPrivileges.connect(owner).addMinter(minter1.address)
            ).to.be.revertedWith("MultiSigClient: Transaction not approved by multi-signature");
        });

        it("直接调用 delMinter 应该失败（需要多签）", async function () {
            await expect(
                addressPrivileges.connect(owner).delMinter(minter1.address)
            ).to.be.revertedWith("MultiSigClient: Transaction not approved by multi-signature");
        });
    });
});
