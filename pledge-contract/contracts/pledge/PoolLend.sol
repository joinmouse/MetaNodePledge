// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./PoolAdmin.sol";
import "../interface/IDebtToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PoolLend is PoolAdmin, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // 借出方存款
    function depositLend(uint256 poolId, uint256 amount) external 
        nonReentrant poolExists(poolId) validState(poolId, PoolState.MATCH) 
    {
        require(amount > 0, "PoolLend: amount must be greater than 0");
        require(block.timestamp < pools[poolId].endTime, "PoolLend: pool has ended");
        Pool storage pool = pools[poolId];
        require(pool.settleAmountLend + amount <= pool.borrowAmount, "PoolLend: exceeds borrow amount");
        
        // 检查用户是否已经有借出方存款，如果没有，则添加到lenders列表中
        IERC20(pool.settleToken).safeTransferFrom(msg.sender, address(this), amount);
        LendInfo storage lendInfo = lendInfos[poolId][msg.sender];
        if (lendInfo.amount == 0) {
            lenders[poolId].push(msg.sender);
        }
        // 更新借出方存款信息
        lendInfo.amount += amount;
        pool.settleAmountLend += amount;
        emit LendDeposit(poolId, msg.sender, amount);
    }

    // 借出方取款（仅在MATCH状态下可取消）
    function cancelLend(uint256 poolId, uint256 amount) external nonReentrant poolExists(poolId) validState(poolId, PoolState.MATCH) {
        require(amount > 0, "PoolLend: amount must be greater than 0");
        LendInfo storage lendInfo = lendInfos[poolId][msg.sender];
        require(lendInfo.amount >= amount, "PoolLend: insufficient balance");
        Pool storage pool = pools[poolId];
         
        lendInfo.amount -= amount;
        pool.settleAmountLend -= amount;
        IERC20(pool.settleToken).safeTransfer(msg.sender, amount);
        emit LendDeposit(poolId, msg.sender, amount);
    }

    // 第一阶段：领取sp代币（债权凭证）
    function claimLend(uint256 poolId) external nonReentrant poolExists(poolId) {
        require(pools[poolId].state == PoolState.EXECUTION || pools[poolId].state == PoolState.FINISH, "PoolLend: invalid state");
        LendInfo storage lendInfo = lendInfos[poolId][msg.sender];
        require(lendInfo.amount > 0, "PoolLend: no lending position");
        require(!lendInfo.claimed, "PoolLend: already claimed");
        
        Pool storage pool = pools[poolId];
        require(pool.spToken != address(0), "PoolLend: spToken not set");
        
        // 计算用户份额：用户质押金额 / 总质押金额
        uint256 userShare = (lendInfo.amount * 1e18) / pool.settleAmountLend;
        // sp代币数量 = 总结算金额 * 用户份额
        uint256 spAmount = (pool.settleAmountLend * userShare) / 1e18;
        
        // 铸造sp代币给用户
        IDebtToken(pool.spToken).mint(msg.sender, spAmount);
        lendInfo.claimed = true;
        
        emit SpTokenClaimed(poolId, msg.sender, spAmount);
    }

    // 第二阶段：销毁sp代币，提取本金+利息
    function withdrawLend(uint256 poolId, uint256 spAmount) external nonReentrant poolExists(poolId) {
        require(spAmount > 0, "PoolLend: spAmount must be greater than 0");
        Pool storage pool = pools[poolId];
        require(pool.state == PoolState.FINISH || pool.state == PoolState.LIQUIDATION, "PoolLend: invalid state");
        require(pool.spToken != address(0), "PoolLend: spToken not set");
        
        // 销毁用户的sp代币
        IDebtToken(pool.spToken).burn(msg.sender, spAmount);
        
        // 计算赎回金额
        uint256 redeemAmount;
        if (pool.state == PoolState.FINISH) {
            require(block.timestamp > pool.endTime, "PoolLend: pool not ended");
            // 完成状态：本金 + 利息
            uint256 totalFinishAmount = calculateFinishAmount(poolId);
            uint256 spShare = (spAmount * 1e18) / pool.settleAmountLend;
            redeemAmount = (totalFinishAmount * spShare) / 1e18;
        } else if (pool.state == PoolState.LIQUIDATION) {
            // 清算状态：根据清算结果计算
            uint256 totalLiquidationAmount = calculateLiquidationAmount(poolId);
            uint256 spShare = (spAmount * 1e18) / pool.settleAmountLend;
            redeemAmount = (totalLiquidationAmount * spShare) / 1e18;
        }
        
        require(redeemAmount > 0, "PoolLend: no amount to redeem");
        IERC20(pool.settleToken).safeTransfer(msg.sender, redeemAmount);
        
        emit SpTokenWithdrawn(poolId, msg.sender, spAmount, redeemAmount);
    }

    // 退款（池子未成功匹配时）
    function refundLend(uint256 poolId) external nonReentrant poolExists(poolId) {
        require(pools[poolId].state == PoolState.FINISH, "PoolLend: invalid state for refund");
        LendInfo storage lendInfo = lendInfos[poolId][msg.sender];
        require(lendInfo.amount > 0, "PoolLend: no lending position");
        require(!lendInfo.refunded, "PoolLend: already refunded");
        
        Pool storage pool = pools[poolId];
        bool needRefund = pool.settleAmountBorrow < pool.settleAmountLend;
        require(needRefund, "PoolLend: no refund needed");
        lendInfo.refunded = true;
        IERC20(pool.settleToken).safeTransfer(msg.sender, lendInfo.amount);
        emit LendDeposit(poolId, msg.sender, lendInfo.amount);
    }

    // 计算完成状态下的总金额（本金+利息）
    function calculateFinishAmount(uint256 poolId) public view poolExists(poolId) returns (uint256) {
        Pool memory pool = pools[poolId];
        if (pool.state != PoolState.FINISH) return 0;
        
        uint256 duration = pool.endTime - block.timestamp;
        if (duration > SECONDS_PER_YEAR) duration = SECONDS_PER_YEAR;
        
        uint256 interest = (pool.settleAmountLend * pool.interestRate * duration) / (RATE_BASE * SECONDS_PER_YEAR);
        return pool.settleAmountLend + interest;
    }

    // 计算清算状态下的总金额
    function calculateLiquidationAmount(uint256 poolId) public view poolExists(poolId) returns (uint256) {
        Pool memory pool = pools[poolId];
        if (pool.state != PoolState.LIQUIDATION) return 0;
        
        // 简化计算：返回原始金额的90%（模拟清算损失）
        return (pool.settleAmountLend * 9000) / RATE_BASE;
    }

    // 获取借出方信息
    function getLendInfo(uint256 poolId, address lender) external view poolExists(poolId) returns (LendInfo memory) {
        return lendInfos[poolId][lender];
    }

    // 获取池子借出方列表
    function getPoolLenders(uint256 poolId) external view poolExists(poolId) returns (address[] memory) {
        return lenders[poolId];
    }

    // 获取用户的sp代币余额
    function getSpTokenBalance(uint256 poolId, address user) external view poolExists(poolId) returns (uint256) {
        Pool memory pool = pools[poolId];
        if (pool.spToken == address(0)) return 0;
        return IERC20(pool.spToken).balanceOf(user);
    }
    
    // 测试辅助方法：设置池子的借入金额（仅用于测试）
    function setPoolBorrowAmount(uint256 poolId, uint256 amount) external onlyAdmin poolExists(poolId) {
        pools[poolId].settleAmountBorrow = amount;
    }
}