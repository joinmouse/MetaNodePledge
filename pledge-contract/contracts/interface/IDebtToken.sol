// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IDebtToken
 * @dev 债务代币接口
 */
interface IDebtToken {
    
    /// @notice 铸造债务代币
    function mint(address _to, uint256 _amount) external returns (bool);
    
    /// @notice 销毁债务代币
    function burn(address _from, uint256 _amount) external returns (bool);
}
