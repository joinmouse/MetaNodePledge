// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../multiSignatureV2/MultiSigClient.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title Oracle
 * @notice 价格预言机，支持Chainlink和手动价格
 */
contract Oracle is MultiSigClient {
    
    // 状态变量
    mapping(uint256 => AggregatorV3Interface) internal assetsMap;  // Chainlink聚合器
    mapping(uint256 => uint256) internal decimalsMap;              // 代币精度
    mapping(uint256 => uint256) internal priceMap;                 // 手动价格
    uint256 internal decimals = 1;                                 // 价格精度除数
    
    // 事件
    event PriceSet(address indexed asset, uint256 price);
    event UnderlyingPriceSet(uint256 indexed underlying, uint256 price);
    event PricesSet(uint256[] assets, uint256[] prices);
    event DecimalsSet(uint256 newDecimals);
    event AggregatorSet(address indexed asset, address aggregator, uint256 decimals);
    event UnderlyingAggregatorSet(uint256 indexed underlying, address aggregator, uint256 decimals);
    
    constructor(address multiSigWallet) MultiSigClient(multiSigWallet) {}
    
    // 管理函数
    
    /// @notice 设置价格精度除数
    function setDecimals(uint256 newDecimals) external validCall {
        decimals = newDecimals;
        emit DecimalsSet(newDecimals);
    }
    
    /// @notice 批量设置价格
    function setPrices(uint256[] memory assets, uint256[] memory prices) external validCall {
        require(assets.length == prices.length, "Oracle: arrays length mismatch");
        uint256 len = assets.length;
        for (uint256 i = 0; i < len; i++) {
            priceMap[assets[i]] = prices[i];
        }
        emit PricesSet(assets, prices);
    }
    
    /// @notice 设置资产价格
    function setPrice(address asset, uint256 price) external validCall {
        priceMap[uint256(uint160(asset))] = price;
        emit PriceSet(asset, price);
    }
    
    /// @notice 通过索引设置价格
    function setUnderlyingPrice(uint256 underlying, uint256 price) external validCall {
        require(underlying > 0, "Oracle: underlying cannot be zero");
        priceMap[underlying] = price;
        emit UnderlyingPriceSet(underlying, price);
    }
    
    /// @notice 设置Chainlink聚合器
    function setAssetsAggregator(
        address asset,
        address aggregator,
        uint256 _decimals
    ) external validCall {
        assetsMap[uint256(uint160(asset))] = AggregatorV3Interface(aggregator);
        decimalsMap[uint256(uint160(asset))] = _decimals;
        emit AggregatorSet(asset, aggregator, _decimals);
    }
    
    /// @notice 通过索引设置聚合器
    function setUnderlyingAggregator(
        uint256 underlying,
        address aggregator,
        uint256 _decimals
    ) external validCall {
        require(underlying > 0, "Oracle: underlying cannot be zero");
        assetsMap[underlying] = AggregatorV3Interface(aggregator);
        decimalsMap[underlying] = _decimals;
        emit UnderlyingAggregatorSet(underlying, aggregator, _decimals);
    }
    
    
    /// @notice 获取资产价格
    function getPrice(address asset) external view returns (uint256) {
        return getUnderlyingPrice(uint256(uint160(asset)));
    }
    
    /// @notice 批量获取价格
    function getPrices(uint256[] memory assets) external view returns (uint256[] memory prices) {
        uint256 len = assets.length;
        prices = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            prices[i] = getUnderlyingPrice(assets[i]);
        }
        return prices;
    }
    
    /// @notice 通过索引获取价格（优先Chainlink）
    function getUnderlyingPrice(uint256 underlying) public view returns (uint256) {
        AggregatorV3Interface assetsPrice = assetsMap[underlying];
        
        if (address(assetsPrice) != address(0)) {
            (, int256 price, , , ) = assetsPrice.latestRoundData();
            uint8 aggregatorDecimals = assetsPrice.decimals();
            uint256 tokenDecimals = decimalsMap[underlying];
            
            // 先将Chainlink价格转换为18位精度
            uint256 price18 = uint256(price) * (10 ** (18 - aggregatorDecimals)) / decimals;
            
            // 再根据代币精度调整
            if (tokenDecimals < 18) {
                return price18 * (10 ** (18 - tokenDecimals));
            } else if (tokenDecimals > 18) {
                return price18 / (10 ** (tokenDecimals - 18));
            } else {
                return price18;
            }
        } else {
            return priceMap[underlying];
        }
    }
    
    /// @notice 获取聚合器信息
    function getAssetsAggregator(address asset) external view returns (address aggregator, uint256 _decimals) {
        uint256 key = uint256(uint160(asset));
        return (address(assetsMap[key]), decimalsMap[key]);
    }
    
    /// @notice 通过索引获取聚合器信息
    function getUnderlyingAggregator(uint256 underlying) external view returns (address aggregator, uint256 _decimals) {
        return (address(assetsMap[underlying]), decimalsMap[underlying]);
    }
}
