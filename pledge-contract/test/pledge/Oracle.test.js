const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Oracle", function () {
    let oracle;
    let multiSigWallet;
    let mockToken1, mockToken2;
    let mockAggregator1, mockAggregator2;
    let owner, signer1, signer2, alice, bob;
    
    // 辅助函数：创建多签申请并获得足够签名（需要2个签名）
    async function createAndSignMultiSig() {
        const msgHash = await multiSigWallet.getApplicationHash(
            owner.address,
            oracle.target
        );
        // owner 创建申请
        await multiSigWallet.connect(owner).createApplication(oracle.target);
        // owner 和 signer1 都签名（达到阈值2）
        await multiSigWallet.connect(owner).signApplication(msgHash);
        await multiSigWallet.connect(signer1).signApplication(msgHash);
    }
    
    beforeEach(async function () {
        [owner, signer1, signer2, alice, bob] = await ethers.getSigners();
        
        // 部署多签钱包
        const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
        multiSigWallet = await MultiSigWallet.deploy([owner.address, signer1.address, signer2.address], 2);
        
        // 部署Oracle
        const Oracle = await ethers.getContractFactory("Oracle");
        oracle = await Oracle.deploy(multiSigWallet.target);
        
        // 部署测试代币
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        mockToken1 = await MockERC20.deploy("Token1", "TK1", 18);
        mockToken2 = await MockERC20.deploy("Token2", "TK2", 6);
        
        // 部署Mock Chainlink聚合器
        const MockAggregator = await ethers.getContractFactory("MockAggregator");
        // 价格: $2000, 8位精度
        mockAggregator1 = await MockAggregator.deploy(8, 200000000000, "ETH/USD");
        // 价格: $1, 8位精度
        mockAggregator2 = await MockAggregator.deploy(8, 100000000, "USDC/USD");
    });
    
    describe("部署", function () {
        it("应该正确设置多签钱包地址", async function () {
            expect(await oracle.getMultiSignatureAddress()).to.equal(multiSigWallet.target);
        });
        
        it("应该初始化decimals为1", async function () {
            // decimals是internal，通过价格计算验证
            const price = ethers.parseUnits("100", 18);
            
            await createAndSignMultiSig();
            
            await oracle.connect(owner).setPrice(mockToken1.target, price);
            expect(await oracle.getPrice(mockToken1.target)).to.equal(price);
        });
    });
    
    describe("手动价格设置", function () {
        it("应该允许通过多签设置资产价格", async function () {
            const price = ethers.parseUnits("100", 18);
            
            await createAndSignMultiSig();
            
            await oracle.connect(owner).setPrice(mockToken1.target, price);
            expect(await oracle.getPrice(mockToken1.target)).to.equal(price);
        });
        
        it("应该拒绝非多签调用setPrice", async function () {
            const price = ethers.parseUnits("100", 18);
            await expect(
                oracle.connect(alice).setPrice(mockToken1.target, price)
            ).to.be.revertedWith("MultiSigClient: Transaction not approved by multi-signature");
        });
        
        it("应该允许通过索引设置价格", async function () {
            const underlying = BigInt(mockToken1.target);
            const price = ethers.parseUnits("200", 18);
            
            await createAndSignMultiSig();
            
            await oracle.connect(owner).setUnderlyingPrice(underlying, price);
            expect(await oracle.getUnderlyingPrice(underlying)).to.equal(price);
            expect(await oracle.getPrice(mockToken1.target)).to.equal(price);
        });
        
        it("应该拒绝underlying为0", async function () {
            const price = ethers.parseUnits("100", 18);
            
            await createAndSignMultiSig();
            
            await expect(
                oracle.connect(owner).setUnderlyingPrice(0, price)
            ).to.be.revertedWith("Oracle: underlying cannot be zero");
        });
        
        it("应该支持批量设置价格", async function () {
            const underlying1 = BigInt(mockToken1.target);
            const underlying2 = BigInt(mockToken2.target);
            const price1 = ethers.parseUnits("100", 18);
            const price2 = ethers.parseUnits("200", 18);
            
            await createAndSignMultiSig();
            
            await oracle.connect(owner).setPrices(
                [underlying1, underlying2],
                [price1, price2]
            );
            
            expect(await oracle.getPrice(mockToken1.target)).to.equal(price1);
            expect(await oracle.getPrice(mockToken2.target)).to.equal(price2);
        });
        
        it("应该拒绝数组长度不匹配", async function () {
            await createAndSignMultiSig();
            
            await expect(
                oracle.connect(owner).setPrices(
                    [1, 2],
                    [ethers.parseUnits("100", 18)]
                )
            ).to.be.revertedWith("Oracle: arrays length mismatch");
        });
    });
    
    describe("Chainlink聚合器", function () {
        it("应该允许设置资产聚合器", async function () {
            await createAndSignMultiSig();
            
            await oracle.connect(owner).setAssetsAggregator(
                mockToken1.target,
                mockAggregator1.target,
                18
            );
            
            const [aggregator, decimals] = await oracle.getAssetsAggregator(mockToken1.target);
            expect(aggregator).to.equal(mockAggregator1.target);
            expect(decimals).to.equal(18);
        });
        
        it("应该从Chainlink获取价格（18位精度）", async function () {
            // 设置聚合器
            await createAndSignMultiSig();
            
            await oracle.connect(owner).setAssetsAggregator(
                mockToken1.target,
                mockAggregator1.target,
                18
            );
            
            // Chainlink价格: 200000000000 (8位精度) = $2000
            // 转换为18位精度: 2000 * 10^18
            const expectedPrice = ethers.parseUnits("2000", 18);
            expect(await oracle.getPrice(mockToken1.target)).to.equal(expectedPrice);
        });
        
        it("应该从Chainlink获取价格（6位精度代币）", async function () {
            // 设置聚合器（USDC是6位精度）
            await createAndSignMultiSig();
            
            await oracle.connect(owner).setAssetsAggregator(
                mockToken2.target,
                mockAggregator2.target,
                6
            );
            
            // Chainlink价格: 100000000 (8位精度) = $1
            // 转换为18位精度，考虑代币6位精度: 1 * 10^18 * 10^(18-6) = 1 * 10^30
            const expectedPrice = ethers.parseUnits("1", 30);
            expect(await oracle.getPrice(mockToken2.target)).to.equal(expectedPrice);
        });
        
        it("应该允许通过索引设置聚合器", async function () {
            const underlying = BigInt(mockToken1.target);
            
            await createAndSignMultiSig();
            
            await oracle.connect(owner).setUnderlyingAggregator(
                underlying,
                mockAggregator1.target,
                18
            );
            
            const [aggregator, decimals] = await oracle.getUnderlyingAggregator(underlying);
            expect(aggregator).to.equal(mockAggregator1.target);
            expect(decimals).to.equal(18);
        });
        
        it("应该拒绝underlying为0设置聚合器", async function () {
            await createAndSignMultiSig();
            
            await expect(
                oracle.connect(owner).setUnderlyingAggregator(
                    0,
                    mockAggregator1.target,
                    18
                )
            ).to.be.revertedWith("Oracle: underlying cannot be zero");
        });
    });
    
    describe("批量查询", function () {
        it("应该支持批量获取价格", async function () {
            const underlying1 = BigInt(mockToken1.target);
            const underlying2 = BigInt(mockToken2.target);
            const price1 = ethers.parseUnits("100", 18);
            const price2 = ethers.parseUnits("200", 18);
            
            // 设置价格
            await createAndSignMultiSig();
            
            await oracle.connect(owner).setPrices(
                [underlying1, underlying2],
                [price1, price2]
            );
            
            // 批量查询
            const prices = await oracle.getPrices([underlying1, underlying2]);
            expect(prices[0]).to.equal(price1);
            expect(prices[1]).to.equal(price2);
        });
        
        it("应该返回空数组当输入为空", async function () {
            const prices = await oracle.getPrices([]);
            expect(prices.length).to.equal(0);
        });
    });
    
    describe("精度设置", function () {
        it("应该允许设置decimals", async function () {
            const newDecimals = 100;
            
            await createAndSignMultiSig();
            
            await oracle.connect(owner).setDecimals(newDecimals);
            
            // 通过价格计算验证decimals已更改
            // 设置聚合器
            await oracle.connect(owner).setAssetsAggregator(
                mockToken1.target,
                mockAggregator1.target,
                18
            );
            
            // Chainlink价格: 200000000000 / 100 = 2000000000
            // 转换为18位精度: 2000000000 * 10^10 = 20 * 10^18
            const expectedPrice = ethers.parseUnits("20", 18);
            expect(await oracle.getPrice(mockToken1.target)).to.equal(expectedPrice);
        });
    });
    
    describe("事件", function () {
        it("应该在设置价格时触发事件", async function () {
            const price = ethers.parseUnits("100", 18);
            
            await createAndSignMultiSig();
            
            await expect(oracle.connect(owner).setPrice(mockToken1.target, price))
                .to.emit(oracle, "PriceSet")
                .withArgs(mockToken1.target, price);
        });
        
        it("应该在设置聚合器时触发事件", async function () {
            await createAndSignMultiSig();
            
            await expect(
                oracle.connect(owner).setAssetsAggregator(
                    mockToken1.target,
                    mockAggregator1.target,
                    18
                )
            ).to.emit(oracle, "AggregatorSet")
             .withArgs(mockToken1.target, mockAggregator1.target, 18);
        });
    });
});
