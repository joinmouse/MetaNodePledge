// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./PoolStorage.sol";
import "../interface/IDebtToken.sol";
import "../interface/IOracle.sol";
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
        require(_interestRate > 0 && _interestRate <= MAX_INTEREST_RATE, "PoolAdmin: invalid interest rate");
        require(_pledgeRate >= MIN_PLEDGE_RATE && _pledgeRate <= MAX_PLEDGE_RATE, "PoolAdmin: invalid pledge rate");
        require(_liquidationRate > RATE_BASE && _liquidationRate < _pledgeRate, "PoolAdmin: invalid liquidation rate");
        require(_endTime > block.timestamp, "PoolAdmin: invalid end time");
        
        uint256 poolId = ++poolCounter;
        
        pools[poolId] = Pool({
            settleToken: _settleToken,
            pledgeToken: _pledgeToken,
            maxSupply: _borrowAmount,
            lendSupply: 0,
            borrowSupply: 0,
            borrowAmount: _borrowAmount,
            interestRate: _interestRate,
            pledgeRate: _pledgeRate,
            liquidationRate: _liquidationRate,
            autoLiquidateThreshold: _liquidationRate,
            endTime: _endTime,
            settleTime: 0,
            lendAmount: 0,
            settleAmountLend: 0,
            settleAmountBorrow: 0,
            finishAmountLend: 0,
            finishAmountBorrow: 0,
            liquidationAmountLend: 0,
            liquidationAmountBorrow: 0,
            state: PoolState.MATCH,
            creator: msg.sender,
            spToken: address(0),
            jpToken: address(0)
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
    
    // 设置债务代币地址
    function setDebtToken(address _debtToken) external onlyAdmin {
        require(_debtToken != address(0), "PoolAdmin: invalid debt token address");
        debtToken = _debtToken;
    }
    
    // 设置池子的sp代币
    function setPoolSpToken(uint256 poolId, address _spToken) external onlyAdmin poolExists(poolId) {
        require(_spToken != address(0), "PoolAdmin: invalid sp token address");
        pools[poolId].spToken = _spToken;
    }
    
    // 设置池子的jp代币
    function setPoolJpToken(uint256 poolId, address _jpToken) external onlyAdmin poolExists(poolId) {
        require(_jpToken != address(0), "PoolAdmin: invalid jp token address");
        pools[poolId].jpToken = _jpToken;
    }
    
    // 获取池子信息
    function getPoolInfo(uint256 poolId) external view poolExists(poolId) returns (Pool memory) {
        return pools[poolId];
    }
    
    // 获取池子数量
    function getPoolsLength() external view returns (uint256) {
        return poolCounter;
    }
    
    // 获取池子状态 - 对齐V2
    function getPoolState(uint256 poolId) external view poolExists(poolId) returns (uint256) {
        return uint256(pools[poolId].state);
    }
    
    // 获取标的价格 - 对齐V2
    function getUnderlyingPriceView(uint256 poolId) external view poolExists(poolId) returns (uint256[2] memory) {
        require(oracle != address(0), "PoolAdmin: oracle not set");
        Pool storage pool = pools[poolId];
        
        // 调用Oracle获取价格
        uint256 settlePrice = IOracle(oracle).getPrice(pool.settleToken);
        uint256 pledgePrice = IOracle(oracle).getPrice(pool.pledgeToken);
        
        return [settlePrice, pledgePrice];
    }
}