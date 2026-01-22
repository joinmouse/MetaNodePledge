// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @dev 用于测试的简单 ERC20 代币，包含水龙头功能
 */
contract MockERC20 is ERC20 {
    uint8 private _decimals;
    
    // 水龙头配置
    uint256 public constant FAUCET_AMOUNT = 1000 * 10**18; // 每次领取1000个代币
    uint256 public constant FAUCET_COOLDOWN = 24 hours;    // 24小时冷却时间
    
    // 记录每个地址上次领取时间
    mapping(address => uint256) public lastFaucetTime;
    
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
    }
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    // 简单的 mint 函数，用于测试
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    /**
     * @dev 水龙头函数 - 允许用户领取测试代币
     * 每个地址24小时内只能领取一次
     */
    function faucet_transfer() external {
        require(
            block.timestamp >= lastFaucetTime[msg.sender] + FAUCET_COOLDOWN,
            "Faucet: Please wait 24 hours between claims"
        );
        
        lastFaucetTime[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }
    
    /**
     * @dev 检查地址是否可以领取代币
     */
    function canClaim(address user) external view returns (bool) {
        return block.timestamp >= lastFaucetTime[user] + FAUCET_COOLDOWN;
    }
    
    /**
     * @dev 获取距离下次可领取的剩余时间（秒）
     */
    function timeUntilNextClaim(address user) external view returns (uint256) {
        if (block.timestamp >= lastFaucetTime[user] + FAUCET_COOLDOWN) {
            return 0;
        }
        return (lastFaucetTime[user] + FAUCET_COOLDOWN) - block.timestamp;
    }
}
