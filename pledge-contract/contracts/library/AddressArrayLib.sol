// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title AddressArrayLib - 地址数组工具库
 * @notice 提供地址数组的增删查功能
 */
library AddressArrayLib {
    /// @notice 添加地址到数组（去重）
    function addAddress(address[] storage list, address addr) internal {
        if (!contains(list, addr)) {
            list.push(addr);
        }
    }
    
    /// @notice 从数组中移除地址
    function removeAddress(address[] storage list, address addr) internal returns (bool) {
        uint256 len = list.length;
        uint256 i = 0;
        
        // 查找地址位置
        for (; i < len; i++) {
            if (list[i] == addr) break;
        }
        
        // 找到则删除（用最后一个元素替换）
        if (i < len) {
            if (i != len - 1) {
                list[i] = list[len - 1];
            }
            list.pop();
            return true;
        }
        return false;
    }
    
    /// @notice 检查地址是否在数组中
    function contains(address[] memory list, address addr) internal pure returns (bool) {
        uint256 len = list.length;
        for (uint256 i = 0; i < len; i++) {
            if (list[i] == addr) return true;
        }
        return false;
    }
}