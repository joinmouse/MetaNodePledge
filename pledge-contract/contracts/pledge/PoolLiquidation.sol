// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./PoolBorrow.sol";
import "./PoolLend.sol";
import "../interface/IOracle.sol";

contract PoolLiquidation is PoolBorrow, PoolLend {
    using SafeERC20 for IERC20;

    uint256 public constant LIQUIDATION_PENALTY = 1000; // 10%
    uint256 public constant LIQUIDATION_REWARD = 500;   // 5%

    event LiquidationTriggered(uint256 indexed poolId, uint256 timestamp, uint256 healthFactor);
    event PoolLiquidated(uint256 indexed poolId, uint256 borrowTokenAmount, uint256 settleTokenAmount);
    event LiquidationReward(address indexed liquidator, uint256 indexed poolId, uint256 rewardAmount);

    // 计算健康因子
    function calculateHealthFactor(uint256 poolId) public view poolExists(poolId) returns (uint256) {
        Pool storage pool = pools[poolId];
        if (pool.state != PoolState.EXECUTION) return RATE_BASE;

        (uint256 pledgePrice, uint256 settlePrice) = _getPrices(pool);
        require(pledgePrice > 0 && settlePrice > 0, "PoolLiquidation: invalid price");

        (uint256 totalPledgeValue, uint256 totalBorrowAmount) = _calculateTotals(poolId, pledgePrice, settlePrice);
        return totalBorrowAmount == 0 ? RATE_BASE : (totalPledgeValue * RATE_BASE) / totalBorrowAmount;
    }

    // 执行清算
    function liquidatePool(uint256 poolId) external nonReentrant poolExists(poolId) {
        Pool storage pool = pools[poolId];
        require(pool.state == PoolState.EXECUTION && block.timestamp >= pool.settleTime, "PoolLiquidation: invalid state");

        uint256 healthFactor = calculateHealthFactor(poolId);
        require(healthFactor < pool.liquidationRate, "PoolLiquidation: health factor above threshold");

        pool.state = PoolState.LIQUIDATION;
        emit LiquidationTriggered(poolId, block.timestamp, healthFactor);

        (uint256 totalPledge, uint256 totalBorrow) = _calculateLiquidationAmounts(poolId);
        _executeLiquidation(poolId, totalPledge);
        _rewardLiquidator(pool, msg.sender, totalPledge);

        emit PoolLiquidated(poolId, totalPledge, totalBorrow);
    }

    // 借出方清算后提取
    function withdrawLendAfterLiquidation(uint256 poolId) external nonReentrant poolExists(poolId) {
        Pool storage pool = pools[poolId];
        LendInfo storage lendInfo = lendInfos[poolId][msg.sender];

        require(pool.state == PoolState.LIQUIDATION && lendInfo.claimed && lendInfo.amount > 0, "PoolLiquidation: invalid withdraw");

        uint256 withdrawAmount = (pool.liquidationAmount * lendInfo.amount) / pool.settleAmountLend;
        require(withdrawAmount > 0, "PoolLiquidation: no withdraw amount");

        lendInfo.amount = 0;
        _transferToken(pool.settleToken, msg.sender, withdrawAmount);
        emit WithdrawLend(msg.sender, poolId, pool.settleToken, withdrawAmount);
    }

    // 借入方清算后赎回
    function withdrawBorrowAfterLiquidation(uint256 poolId) external nonReentrant poolExists(poolId) {
        Pool storage pool = pools[poolId];
        BorrowInfo storage borrowInfo = borrowInfos[poolId][msg.sender];

        require(pool.state == PoolState.LIQUIDATION && borrowInfo.liquidated && borrowInfo.pledgeAmount > 0, "PoolLiquidation: invalid withdraw");

        uint256 remainingAmount = (borrowInfo.pledgeAmount * (RATE_BASE - LIQUIDATION_PENALTY - LIQUIDATION_REWARD)) / RATE_BASE;
        require(remainingAmount > 0, "PoolLiquidation: no remaining amount");

        borrowInfo.pledgeAmount = 0;
        _transferToken(pool.pledgeToken, msg.sender, remainingAmount);
        emit WithdrawBorrow(msg.sender, poolId, pool.pledgeToken, remainingAmount, 0);
    }

    // 检查是否可清算
    function canLiquidate(uint256 poolId) external view poolExists(poolId) returns (bool) {
        Pool storage pool = pools[poolId];
        return pool.state == PoolState.EXECUTION && 
               block.timestamp >= pool.settleTime && 
               calculateHealthFactor(poolId) < pool.liquidationRate;
    }

    // 获取清算信息
    function getLiquidationInfo(uint256 poolId) external view poolExists(poolId) returns (
        uint256 healthFactor,
        uint256 liquidationThreshold,
        bool canLiquidatePool,
        uint256 totalPledgeAmount,
        uint256 totalBorrowAmount
    ) {
        Pool storage pool = pools[poolId];
        healthFactor = calculateHealthFactor(poolId);
        liquidationThreshold = pool.liquidationRate;
        canLiquidatePool = pool.state == PoolState.EXECUTION && 
                          block.timestamp >= pool.settleTime && 
                          healthFactor < liquidationThreshold;
        (totalPledgeAmount, totalBorrowAmount) = _calculateLiquidationAmounts(poolId);
    }

    // 内部函数：获取价格
    function _getPrices(Pool storage pool) internal view returns (uint256 pledgePrice, uint256 settlePrice) {
        pledgePrice = IOracle(oracle).getPrice(pool.pledgeToken);
        settlePrice = IOracle(oracle).getPrice(pool.settleToken);
    }

    // 内部函数：计算总量（合并两个循环）
    function _calculateTotals(uint256 poolId, uint256 pledgePrice, uint256 settlePrice) internal view returns (uint256 totalPledgeValue, uint256 totalBorrowAmount) {
        address[] memory borrowerList = borrowers[poolId];
        for (uint256 i = 0; i < borrowerList.length; i++) {
            BorrowInfo storage info = borrowInfos[poolId][borrowerList[i]];
            if (info.settled && !info.liquidated) {
                totalPledgeValue += (info.pledgeAmount * pledgePrice) / settlePrice;
                totalBorrowAmount += info.borrowAmount;
            }
        }
    }

    // 内部函数：计算清算金额
    function _calculateLiquidationAmounts(uint256 poolId) internal view returns (uint256 totalPledge, uint256 totalBorrow) {
        address[] memory borrowerList = borrowers[poolId];
        for (uint256 i = 0; i < borrowerList.length; i++) {
            BorrowInfo storage info = borrowInfos[poolId][borrowerList[i]];
            if (info.settled && !info.liquidated) {
                totalPledge += info.pledgeAmount;
                totalBorrow += info.borrowAmount;
            }
        }
    }

    // 内部函数：执行清算
    function _executeLiquidation(uint256 poolId, uint256 totalPledgeAmount) internal {
        Pool storage pool = pools[poolId];
        (uint256 pledgePrice, uint256 settlePrice) = _getPrices(pool);
        
        uint256 pledgeValue = (totalPledgeAmount * pledgePrice) / settlePrice;
        pool.liquidationAmount = pledgeValue - (pledgeValue * LIQUIDATION_PENALTY) / RATE_BASE;

        address[] memory borrowerList = borrowers[poolId];
        for (uint256 i = 0; i < borrowerList.length; i++) {
            BorrowInfo storage info = borrowInfos[poolId][borrowerList[i]];
            if (info.settled && !info.liquidated) info.liquidated = true;
        }
    }

    // 内部函数：奖励清算者
    function _rewardLiquidator(Pool storage pool, address liquidator, uint256 totalPledgeAmount) internal {
        uint256 rewardAmount = (totalPledgeAmount * LIQUIDATION_REWARD) / RATE_BASE;
        if (rewardAmount > 0) {
            _transferToken(pool.pledgeToken, liquidator, rewardAmount);
            emit LiquidationReward(liquidator, pool.liquidationAmount, rewardAmount);
        }
    }

    // 内部函数：转账
    function _transferToken(address token, address to, uint256 amount) internal {
        if (token == address(0)) {
            payable(to).transfer(amount);
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }
}
