// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./AddressPrivileges.sol";

/**
 * @title DebtToken
 * @dev 债务代币合约 - 用于表示用户在借贷协议中的债务
 * 只有具有 Minter 权限的地址（如借贷池合约）才能铸造和销毁代币
 */
contract DebtToken is ERC20, AddressPrivileges {
    
    // ============ 构造函数 ============
    
    /**
     * @notice 构造函数
     * @param _name 代币名称
     * @param _symbol 代币符号
     * @param multiSignature 多签钱包地址
     */
    constructor(
        string memory _name, 
        string memory _symbol, 
        address multiSignature
    ) ERC20(_name, _symbol) AddressPrivileges(multiSignature) {}
    
    // ============ 外部函数 ============
    
    /**
     * @notice 铸造代币
     * @dev 只有 Minter 可以调用
     * @param _to 接收地址
     * @param _amount 铸造数量
     * @return 是否成功
     */
    function mint(address _to, uint256 _amount) external onlyMinter returns (bool) {
        _mint(_to, _amount);
        return true;
    }
    
    /**
     * @notice 销毁代币
     * @dev 只有 Minter 可以调用
     * @param _from 销毁地址
     * @param _amount 销毁数量
     * @return 是否成功
     */
    function burn(address _from, uint256 _amount) external onlyMinter returns (bool) {
        _burn(_from, _amount);
        return true;
    }
}
