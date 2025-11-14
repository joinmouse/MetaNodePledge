// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./PoolStorage.sol";
import "../interface/IDebtToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PoolAdmin is PoolStorage {
    
    constructor() {
        admin = msg.sender;
    }
    
    // 创建质押借贷池子
    function createPool(
        address _settleToken,
        address _pledgeToken,
        uint256 _borrowAmount,
        uint256 _interestRate,
        uint256 _pledgeRate,
        uint256 _liquidationRate,
        uint256 _endTime
    ) external onlyAdmin returns (uint256) {
        require(_settleToken != address(0), "PoolAdmin: invalid settle token");
        require(_pledgeToken != address(0), "PoolAdmin: invalid pledge token");
        require(_borrowAmount > 0, "PoolAdmin: invalid borrow amount");
        require(_interestRate > 0 && _interestRate <= RATE_BASE, "PoolAdmin: invalid interest rate");
        require(_pledgeRate > RATE_BASE, "PoolAdmin: pledge rate must > 100%");
        require(_liquidationRate > RATE_BASE && _liquidationRate < _pledgeRate, "PoolAdmin: invalid liquidation rate");
        require(_endTime > block.timestamp, "PoolAdmin: invalid end time");
        
        uint256 poolId = ++poolCounter;
        
        pools[poolId] = Pool({
            settleToken: _settleToken,
            pledgeToken: _pledgeToken,
            borrowAmount: _borrowAmount,
            interestRate: _interestRate,
            pledgeRate: _pledgeRate,
            liquidationRate: _liquidationRate,
            endTime: _endTime,
            settleAmountLend: 0,
            settleAmountBorrow: 0,
            state: PoolState.MATCH,
            creator: msg.sender
        });
        
        emit PoolCreated(poolId, msg.sender, _settleToken, _pledgeToken);
        return poolId;
    }
    
    // 设置池子状态
    function setPoolState(uint256 poolId, PoolState newState) external onlyAdmin poolExists(poolId) {
        PoolState oldState = pools[poolId].state;
        pools[poolId].state = newState;
        emit PoolStateChanged(poolId, oldState, newState);
    }
    
    // 设置预言机
    function setOracle(address _oracle) external onlyAdmin {
        require(_oracle != address(0), "PoolAdmin: invalid oracle address");
        oracle = _oracle;
    }
    
    // 设置债务代币
    function setDebtToken(address _debtToken) external onlyAdmin {
        require(_debtToken != address(0), "PoolAdmin: invalid debt token address");
        debtToken = _debtToken;
    }
    
    // 暂停池子
    function pausePool(uint256 poolId) external onlyAdmin poolExists(poolId) {
        require(pools[poolId].state == PoolState.MATCH, "PoolAdmin: can only pause MATCH state");
        pools[poolId].state = PoolState.FINISH;
        emit PoolStateChanged(poolId, PoolState.MATCH, PoolState.FINISH);
    }
    
    // 获取池子信息
    function getPoolInfo(uint256 poolId) external view poolExists(poolId) returns (Pool memory) {
        return pools[poolId];
    }
    
    // 获取池子数量
    function getPoolsLength() external view returns (uint256) {
        return poolCounter;
    }
}