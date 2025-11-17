// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interface/IDebtToken.sol";

contract MockDebtToken is ERC20, IDebtToken {
    mapping(address => bool) public minters;
    address public owner;
    
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        owner = msg.sender;
        minters[msg.sender] = true;
    }
    
    modifier onlyMinter() {
        require(minters[msg.sender], "MockDebtToken: Caller is not a minter");
        _;
    }
    
    function mint(address _to, uint256 _amount) external override onlyMinter returns (bool) {
        _mint(_to, _amount);
        return true;
    }
    
    function burn(address _from, uint256 _amount) external override onlyMinter returns (bool) {
        _burn(_from, _amount);
        return true;
    }
    
    function addMinter(address _addMinter) external returns (bool) {
        require(msg.sender == owner, "MockDebtToken: not authorized");
        require(_addMinter != address(0), "MockDebtToken: Minter is the zero address");
        minters[_addMinter] = true;
        return true;
    }
    
    function delMinter(address _delMinter) external returns (bool) {
        require(msg.sender == owner, "MockDebtToken: not authorized");
        require(_delMinter != address(0), "MockDebtToken: Minter is the zero address");
        minters[_delMinter] = false;
        return true;
    }
    
    function isMinter(address account) public view returns (bool) {
        return minters[account];
    }
    
    // 兼容旧的setMinter方法
    function setMinter(address _minter, bool _status) external {
        require(msg.sender == owner, "MockDebtToken: not authorized");
        minters[_minter] = _status;
    }
}