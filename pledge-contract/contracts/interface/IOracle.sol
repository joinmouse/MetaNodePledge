// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IOracle
 * @notice Oracle预言机接口
 */
interface IOracle {
    /**
     * @notice 获取资产价格（通过地址）
     * @param asset 资产地址
     * @return 价格（18位精度）
     */
    function getPrice(address asset) external view returns (uint256);
    
    /**
     * @notice 获取资产价格（通过索引）
     * @param underlying 资产索引
     * @return 价格（18位精度）
     */
    function getUnderlyingPrice(uint256 underlying) external view returns (uint256);
    
    /**
     * @notice 批量获取资产价格
     * @param assets 资产索引数组
     * @return 价格数组
     */
    function getPrices(uint256[] calldata assets) external view returns (uint256[] memory);
}
