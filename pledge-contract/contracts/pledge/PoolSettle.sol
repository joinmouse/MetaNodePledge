// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./PoolFee.sol";
import "../interface/IOracle.sol";

/**
 * @title PoolSettle
 * @dev 结算和完成功能实现
 */
contract PoolSettle is PoolFee {
    using SafeERC20 for IERC20;

    /**
     * @dev 检查是否可以结算
     */
    function checkoutSettle(uint256 poolId) public view poolExists(poolId) returns (bool) {
        Pool storage pool = pools[poolId];
        return block.timestamp >= pool.settleTime && pool.state == PoolState.MATCH;
    }

    /**
     * @dev 执行结算
     */
    function settle(uint256 poolId) external onlyAdmin poolExists(poolId) {
        Pool storage pool = pools[poolId];
        require(block.timestamp >= pool.settleTime, "PoolSettle: before settle time");
        require(pool.state == PoolState.MATCH, "PoolSettle: invalid state");

        // 检查是否有借出和借入
        if (pool.lendSupply > 0 && pool.borrowSupply > 0) {
            // 获取价格
            uint256 pledgePrice = IOracle(oracle).getPrice(pool.pledgeToken);
            uint256 settlePrice = IOracle(oracle).getPrice(pool.settleToken);
            require(pledgePrice > 0 && settlePrice > 0, "PoolSettle: invalid price");

            // 计算总质押价值（转换为结算代币单位）
            uint256 totalPledgeValue = (pool.borrowSupply * pledgePrice) / settlePrice;
            
            // 计算实际可借价值（考虑质押率）
            uint256 actualBorrowValue = (totalPledgeValue * RATE_BASE) / pool.pledgeRate;

            // 比较借出供应和实际可借价值
            if (pool.lendSupply > actualBorrowValue) {
                // 借出方供应过多，按实际可借价值结算
                pool.settleAmountLend = actualBorrowValue;
                pool.settleAmountBorrow = pool.borrowSupply;
            } else {
                // 借入方供应充足，按借出方供应结算
                pool.settleAmountLend = pool.lendSupply;
                // 计算需要的质押金额
                pool.settleAmountBorrow = (pool.lendSupply * pool.pledgeRate * settlePrice) / (RATE_BASE * pledgePrice);
            }

            // 更新状态为执行中
            PoolState oldState = pool.state;
            pool.state = PoolState.EXECUTION;
            emit PoolStateChanged(poolId, oldState, PoolState.EXECUTION);
            emit PoolSettled(poolId, pool.settleAmountLend, pool.settleAmountBorrow);
        } else {
            // 极端情况：借出或借入任一为0
            pool.settleAmountLend = pool.lendSupply;
            pool.settleAmountBorrow = pool.borrowSupply;
            PoolState oldState = pool.state;
            pool.state = PoolState.UNDONE;
            emit PoolStateChanged(poolId, oldState, PoolState.UNDONE);
        }
    }

    /**
     * @dev 检查是否可以完成
     */
    function checkoutFinish(uint256 poolId) public view poolExists(poolId) returns (bool) {
        Pool storage pool = pools[poolId];
        return block.timestamp >= pool.endTime && pool.state == PoolState.EXECUTION;
    }

    /**
     * @dev 执行完成
     */
    function finish(uint256 poolId) external onlyAdmin poolExists(poolId) {
        Pool storage pool = pools[poolId];
        require(block.timestamp >= pool.endTime, "PoolSettle: before end time");
        require(pool.state == PoolState.EXECUTION, "PoolSettle: invalid state");

        // 计算时间比率
        uint256 duration = pool.endTime - pool.settleTime;
        uint256 timeRatio = (duration * RATE_BASE) / SECONDS_PER_YEAR;

        // 计算利息
        uint256 interest = (timeRatio * pool.interestRate * pool.settleAmountLend) / (RATE_BASE * RATE_BASE);
        
        // 计算需要的总金额（本金 + 利息）
        uint256 lendAmount = pool.settleAmountLend + interest;
        
        // 计算需要卖出的金额（包含借出费用）
        uint256 sellAmount = (lendAmount * (RATE_BASE + lendFee)) / RATE_BASE;

        // 执行swap：质押代币 -> 结算代币
        (uint256 amountSell, uint256 amountIn) = _sellExactAmount(pool.pledgeToken, pool.settleToken, sellAmount);
        
        // 验证滑点
        require(amountIn >= lendAmount, "PoolSettle: slippage too high");

        // 处理借出方费用
        if (amountIn > lendAmount) {
            uint256 feeAmount = amountIn - lendAmount;
            if (feeAmount > 0 && feeAddress != address(0)) {
                _transferToken(pool.settleToken, feeAddress, feeAmount);
            }
            pool.finishAmountLend = amountIn - feeAmount;
        } else {
            pool.finishAmountLend = amountIn;
        }

        // 计算剩余质押金额并扣除借入费用
        uint256 remainAmount = pool.settleAmountBorrow - amountSell;
        pool.finishAmountBorrow = _redeemFees(borrowFee, pool.pledgeToken, remainAmount);

        // 更新状态
        PoolState oldState = pool.state;
        pool.state = PoolState.FINISH;
        emit PoolStateChanged(poolId, oldState, PoolState.FINISH);
    }

    /**
     * @dev 紧急提取（借出方）
     */
    function emergencyLendWithdrawal(uint256 poolId) external notPaused poolExists(poolId) {
        Pool storage pool = pools[poolId];
        require(pool.state == PoolState.UNDONE, "PoolSettle: not undone state");
        
        LendInfo storage lendInfo = lendInfos[poolId][msg.sender];
        require(lendInfo.amount > 0, "PoolSettle: no deposit");
        require(!lendInfo.refunded, "PoolSettle: already refunded");

        uint256 refundAmount = lendInfo.amount;
        lendInfo.refunded = true;
        lendInfo.amount = 0;

        _transferToken(pool.settleToken, msg.sender, refundAmount);
        emit EmergencyLendWithdrawal(msg.sender, poolId, refundAmount);
    }

    /**
     * @dev 紧急提取（借入方）
     */
    function emergencyBorrowWithdrawal(uint256 poolId) external notPaused poolExists(poolId) {
        Pool storage pool = pools[poolId];
        require(pool.state == PoolState.UNDONE, "PoolSettle: not undone state");
        
        BorrowInfo storage borrowInfo = borrowInfos[poolId][msg.sender];
        require(borrowInfo.pledgeAmount > 0, "PoolSettle: no pledge");
        require(!borrowInfo.settled, "PoolSettle: already settled");

        uint256 refundAmount = borrowInfo.pledgeAmount;
        borrowInfo.settled = true;
        borrowInfo.pledgeAmount = 0;

        _transferToken(pool.pledgeToken, msg.sender, refundAmount);
        emit EmergencyBorrowWithdrawal(msg.sender, poolId, refundAmount);
    }
}
