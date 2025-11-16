// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interface/IDebtToken.sol";

contract MockDebtToken is ERC20, IDebtToken {
    address public minter;
    
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        minter = msg.sender;
    }
    
    function mint(address _to, uint256 _amount) external override returns (bool) {
        _mint(_to, _amount);
        return true;
    }
    
    function burn(address _from, uint256 _amount) external override returns (bool) {
        _burn(_from, _amount);
        return true;
    }
    
    function setMinter(address _minter) external {
        require(msg.sender == minter, "MockDebtToken: not authorized");
        minter = _minter;
    }
}