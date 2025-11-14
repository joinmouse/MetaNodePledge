// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../multiSignatureV2/MultiSigClient.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title AddressPrivileges
 * @dev 地址权限管理合约 - 管理 Minter 角色
 * Minter = 有权限铸造和销毁代币的合约地址，通常是借贷池等核心业务合约
 */
contract AddressPrivileges is MultiSigClient {
    using EnumerableSet for EnumerableSet.AddressSet;
    
    // Minter 权限集合
    EnumerableSet.AddressSet private _minters;
    
    // ============ 构造函数 ============
    
    constructor(address multiSignature) MultiSigClient(multiSignature) {}
    
    // ============ 修饰器 ============
    
    modifier onlyMinter() {
        require(_minters.contains(msg.sender), "AddressPrivileges: Caller is not a minter");
        _;
    }
    
    // ============ 外部函数 ============
    
    /**
     * @notice 添加 Minter 权限
     * @param _addMinter 要添加的地址
     * @return 是否添加成功
     */
    function addMinter(address _addMinter) external validCall returns (bool) {
        require(_addMinter != address(0), "AddressPrivileges: Minter is the zero address");
        return _minters.add(_addMinter);
    }
    
    /**
     * @notice 移除 Minter 权限
     * @param _delMinter 要移除的地址
     * @return 是否移除成功
     */
    function delMinter(address _delMinter) external validCall returns (bool) {
        require(_delMinter != address(0), "AddressPrivileges: Minter is the zero address");
        return _minters.remove(_delMinter);
    }
    
    /**
     * @notice 检查地址是否是 Minter
     * @param account 要检查的地址
     * @return 是否是 Minter
     */
    function isMinter(address account) public view returns (bool) {
        return _minters.contains(account);
    }
    
    /**
     * @notice 获取 Minter 列表长度
     * @return Minter 数量
     */
    function getMinterLength() public view returns (uint256) {
        return _minters.length();
    }
    
    /**
     * @notice 根据索引获取 Minter 地址
     * @param _index 索引位置
     * @return Minter 地址
     */
    function getMinter(uint256 _index) public view returns (address) {
        require(_index < _minters.length(), "AddressPrivileges: Index out of bounds");
        return _minters.at(_index);
    }
}
