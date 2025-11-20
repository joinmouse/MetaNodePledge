// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./PoolSettle.sol";
import "../interface/IOracle.sol";

contract PoolLiquidation is PoolSettle {
    using SafeERC20 for IERC20;

    uint256 public constant LIQUIDATION_PENALTY = 1000; // 10%
    uint256 public constant LIQUIDATION_REWARD = 500;   // 5%

    event LiquidationTriggered(uint256 indexed poolId, uint256 timestamp, uint256 healthFactor);
    event PoolLiquidated(uint256 indexed poolId, uint256 borrowTokenAmount, uint256 settleTokenAmount);
    event WithdrawBorrow(address indexed user, uint256 indexed poolId, address indexed token, uint256 amount, uint256 fee);

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

        // 计算时间比率和利息
        uint256 duration = block.timestamp - pool.settleTime;
        uint256 timeRatio = (duration * RATE_BASE) / SECONDS_PER_YEAR;
        uint256 interest = (timeRatio * pool.interestRate * pool.settleAmountLend) / (RATE_BASE * RATE_BASE);
        
        // 计算需要的总金额（本金 + 利息）
        uint256 lendAmount = pool.settleAmountLend + interest;
        
        // 计算需要卖出的金额（包含借出费用）
        uint256 sellAmount = (lendAmount * (RATE_BASE + lendFee)) / RATE_BASE;

        // 执行swap：质押代币 -> 结算代币
        (uint256 amountSell, uint256 amountIn) = _sellExactAmount(pool.pledgeToken, pool.settleToken, sellAmount);

        // 处理借出方费用
        if (amountIn > lendAmount) {
            uint256 feeAmount = amountIn - lendAmount;
            if (feeAmount > 0 && feeAddress != address(0)) {
                _transferToken(pool.settleToken, feeAddress, feeAmount);
            }
            pool.liquidationAmountLend = amountIn - feeAmount;
        } else {
            pool.liquidationAmountLend = amountIn;
        }

        // 计算剩余质押金额并扣除借入费用
        uint256 remainAmount = pool.settleAmountBorrow - amountSell;
        pool.liquidationAmountBorrow = _redeemFees(borrowFee, pool.pledgeToken, remainAmount);

        // 更新状态
        pool.state = PoolState.LIQUIDATION;
        emit LiquidationTriggered(poolId, block.timestamp, healthFactor);

        // 标记所有借入方为已清算
        address[] memory borrowerList = borrowers[poolId];
        for (uint256 i = 0; i < borrowerList.length; i++) {
            BorrowInfo storage info = borrowInfos[poolId][borrowerList[i]];
            if (info.settled && !info.liquidated) {
                info.liquidated = true;
            }
        }

        emit PoolLiquidated(poolId, amountSell, amountIn);
    }

    // 借出方清算后提取
    function withdrawLendAfterLiquidation(uint256 poolId) external nonReentrant poolExists(poolId) {
        Pool storage pool = pools[poolId];
        LendInfo storage lendInfo = lendInfos[poolId][msg.sender];

        require(pool.state == PoolState.LIQUIDATION && lendInfo.claimed && lendInfo.amount > 0, "PoolLiquidation: invalid withdraw");

        uint256 withdrawAmount = (pool.liquidationAmountLend * lendInfo.amount) / pool.settleAmountLend;
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
        require(oracle != address(0), "PoolLiquidation: oracle not set");
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

}
