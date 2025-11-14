// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./AddressPrivileges.sol";

/**
 * @title DebtToken
 * @dev 债务代币合约，只有Minter可以铸造和销毁
 */
contract DebtToken is ERC20, AddressPrivileges {
    
    /// @notice 构造函数
    constructor(
        string memory _name, 
        string memory _symbol, 
        address multiSignature
    ) ERC20(_name, _symbol) AddressPrivileges(multiSignature) {}
    
    /// @notice 铸造代币，只有Minter可调用
    function mint(address _to, uint256 _amount) external onlyMinter returns (bool) {
        _mint(_to, _amount);
        return true;
    }
    
    /// @notice 销毁代币，只有Minter可调用
    function burn(address _from, uint256 _amount) external onlyMinter returns (bool) {
        _burn(_from, _amount);
        return true;
    }
}
