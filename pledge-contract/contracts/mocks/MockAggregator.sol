// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title MockAggregator
 * @notice 用于测试的Chainlink聚合器模拟合约
 */
contract MockAggregator is AggregatorV3Interface {
    
    uint8 private _decimals;
    int256 private _price;
    string private _description;
    uint256 private _version;
    
    constructor(uint8 decimals_, int256 initialPrice, string memory description_) {
        _decimals = decimals_;
        _price = initialPrice;
        _description = description_;
        _version = 1;
    }
    
    function decimals() external view override returns (uint8) {
        return _decimals;
    }
    
    function description() external view override returns (string memory) {
        return _description;
    }
    
    function version() external view override returns (uint256) {
        return _version;
    }
    
    function getRoundData(uint80 _roundId) external view override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ){
        return (_roundId, _price, block.timestamp, block.timestamp, _roundId);
    }
    
    function latestRoundData() external view override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ){
        return (1, _price, block.timestamp, block.timestamp, 1);
    }
    
    // 测试辅助函数
    function setPrice(int256 newPrice) external {
        _price = newPrice;
    }
}
