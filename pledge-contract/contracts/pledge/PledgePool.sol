// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./PoolLiquidation.sol";

/**
 * @title PledgePool
 * @dev 主合约，整合所有功能模块，对外暴露V2对齐的方法
 * @notice 继承链：PoolLiquidation → PoolSettle → PoolFee → PoolSwap → PoolAdmin → PoolStorage
 */
contract PledgePool is PoolLiquidation {
    
    constructor() {
        admin = msg.sender;
    }
    
    /**
     * @dev 创建池子 - 对齐V2的createPoolInfo方法
     */
    function createPoolInfo(
        uint256 _settleTime,
        uint256 _endTime,
        uint64 _interestRate,
        uint256 _maxSupply,
        uint256 _martgageRate,
        address _lendToken,
        address _borrowToken,
        address _spToken,
        address _jpToken,
        uint256 _autoLiquidateThreshold
    ) external onlyAdmin returns (uint256) {
        require(_endTime > _settleTime, "PledgePool: end time must be greater than settle time");
        require(_jpToken != address(0), "PledgePool: jpToken is zero address");
        require(_spToken != address(0), "PledgePool: spToken is zero address");
        
        uint256 poolId = createPool(
            _lendToken,
            _borrowToken,
            _maxSupply,
            _interestRate,
            _martgageRate,
            _autoLiquidateThreshold,
            _endTime
        );
        
        // 设置结算时间
        pools[poolId].settleTime = _settleTime;
        
        // 设置sp和jp代币
        setPoolSpToken(poolId, _spToken);
        setPoolJpToken(poolId, _jpToken);
        
        return poolId;
    }
    
    /**
     * @dev 获取池子数量 - 对齐V2
     */
    function poolLength() external view returns (uint256) {
        return getPoolsLength();
    }
    
    /**
     * @dev 获取池子基础信息 - 对齐V2
     */
    function poolBaseInfo(uint256 poolId) external view poolExists(poolId) returns (
        uint256 settleTime,
        uint256 endTime,
        uint256 interestRate,
        uint256 maxSupply,
        uint256 lendSupply,
        uint256 borrowSupply,
        uint256 martgageRate,
        address lendToken,
        address borrowToken,
        PoolState state,
        address spCoin,
        address jpCoin,
        uint256 autoLiquidateThreshold
    ) {
        Pool storage pool = pools[poolId];
        return (
            pool.settleTime,
            pool.endTime,
            pool.interestRate,
            pool.maxSupply,
            pool.lendSupply,
            pool.borrowSupply,
            pool.pledgeRate,
            pool.settleToken,
            pool.pledgeToken,
            pool.state,
            pool.spToken,
            pool.jpToken,
            pool.autoLiquidateThreshold
        );
    }
    
    /**
     * @dev 获取池子数据信息 - 对齐V2
     */
    function poolDataInfo(uint256 poolId) external view poolExists(poolId) returns (
        uint256 settleAmountLend,
        uint256 settleAmountBorrow,
        uint256 finishAmountLend,
        uint256 finishAmountBorrow,
        uint256 liquidationAmounLend,
        uint256 liquidationAmounBorrow
    ) {
        Pool storage pool = pools[poolId];
        return (
            pool.settleAmountLend,
            pool.settleAmountBorrow,
            pool.finishAmountLend,
            pool.finishAmountBorrow,
            pool.liquidationAmountLend,
            pool.liquidationAmountBorrow
        );
    }
    
    /**
     * @dev 获取用户借出信息 - 对齐V2
     */
    function userLendInfo(address user, uint256 poolId) external view poolExists(poolId) returns (
        uint256 stakeAmount,
        uint256 refundAmount,
        bool hasNoRefund,
        bool hasNoClaim
    ) {
        LendInfo storage info = lendInfos[poolId][user];
        return (
            info.amount,
            0, // refundAmount在当前实现中未单独存储
            info.refunded,
            info.claimed
        );
    }
    
    /**
     * @dev 获取用户借入信息 - 对齐V2
     */
    function userBorrowInfo(address user, uint256 poolId) external view poolExists(poolId) returns (
        uint256 stakeAmount,
        uint256 refundAmount,
        bool hasNoRefund,
        bool hasNoClaim
    ) {
        BorrowInfo storage info = borrowInfos[poolId][user];
        return (
            info.pledgeAmount,
            0, // refundAmount在当前实现中未单独存储
            info.settled,
            info.settled
        );
    }
    
    /**
     * @dev 检查是否可以清算 - 对齐V2
     */
    function checkoutLiquidate(uint256 poolId) external view poolExists(poolId) returns (bool) {
        return canLiquidate(poolId);
    }
    
    /**
     * @dev 执行清算 - 对齐V2
     */
    function liquidate(uint256 poolId) external {
        liquidatePool(poolId);
    }
}
