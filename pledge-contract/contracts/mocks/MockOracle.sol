// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MockOracle
 * @dev Mock Oracle for testing
 */
contract MockOracle {
    mapping(address => uint256) private prices;
    mapping(uint256 => uint256) private underlyingPrices;
    
    function setPrice(address asset, uint256 price) external {
        prices[asset] = price;
    }
    
    function getPrice(address asset) external view returns (uint256) {
        return prices[asset];
    }
    
    function setUnderlyingPrice(uint256 underlying, uint256 price) external {
        underlyingPrices[underlying] = price;
    }
    
    function getUnderlyingPrice(uint256 underlying) external view returns (uint256) {
        return underlyingPrices[underlying];
    }
    
    function getPrices(uint256[] memory assets) external view returns (uint256[] memory) {
        uint256[] memory result = new uint256[](assets.length);
        for (uint256 i = 0; i < assets.length; i++) {
            result[i] = underlyingPrices[assets[i]];
        }
        return result;
    }
}