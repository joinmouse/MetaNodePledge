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
        nonReentrant notPaused poolExists(poolId) validState(poolId, PoolState.MATCH) 
    {
        require(amount > 0, "PoolLend: amount must be greater than 0");
        require(amount >= minAmount, "PoolLend: less than min amount");
        require(block.timestamp < pools[poolId].endTime, "PoolLend: pool has ended");
        Pool storage pool = pools[poolId];
        require(pool.lendSupply + amount <= pool.maxSupply, "PoolLend: exceeds max supply");
        
        // 检查用户是否已经有借出方存款，如果没有，则添加到lenders列表中
        IERC20(pool.settleToken).safeTransferFrom(msg.sender, address(this), amount);
        LendInfo storage lendInfo = lendInfos[poolId][msg.sender];
        if (lendInfo.amount == 0) {
            lenders[poolId].push(msg.sender);
        }
        // 更新借出方存款信息
        lendInfo.amount += amount;
        pool.lendSupply += amount;
        emit LendDeposit(poolId, msg.sender, amount);
    }

    // 借出方取款（仅在MATCH状态下可取消）- 对齐V2的refundLend方法名
    function refundLend(uint256 poolId, uint256 amount) external nonReentrant notPaused poolExists(poolId) validState(poolId, PoolState.MATCH) {
        require(amount > 0, "PoolLend: amount must be greater than 0");
        LendInfo storage lendInfo = lendInfos[poolId][msg.sender];
        require(lendInfo.amount >= amount, "PoolLend: insufficient balance");
        Pool storage pool = pools[poolId];
         
        lendInfo.amount -= amount;
        pool.lendSupply -= amount;
        IERC20(pool.settleToken).safeTransfer(msg.sender, amount);
        emit LendDeposit(poolId, msg.sender, amount);
    }

    // 第一阶段：领取sp代币（债权凭证）
    function claimLend(uint256 poolId) external nonReentrant poolExists(poolId) {
        require(pools[poolId].state == PoolState.EXECUTION || pools[poolId].state == PoolState.FINISH || pools[poolId].state == PoolState.LIQUIDATION, "PoolLend: invalid state");
        LendInfo storage lendInfo = lendInfos[poolId][msg.sender];
        require(lendInfo.amount > 0, "PoolLend: no lending position");
        require(!lendInfo.claimed, "PoolLend: already claimed");
        
        Pool storage pool = pools[poolId];
        require(pool.spToken != address(0), "PoolLend: spToken not set");
        require(pool.lendSupply > 0, "PoolLend: no lend supply");
        
        // 计算用户份额：用户质押金额 / 总借出供应量
        uint256 userShare = (lendInfo.amount * 1e18) / pool.lendSupply;
        // sp代币数量 = settleAmountLend * 用户份额（注意：sp总量等于settleAmountLend）
        uint256 spAmount = (pool.settleAmountLend * userShare) / 1e18;
        
        // 铸造sp代币给用户
        IDebtToken(pool.spToken).mint(msg.sender, spAmount);
        lendInfo.claimed = true;
        lendInfo.lendAmount = spAmount; // 记录实际借出金额
        
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
        
        // 计算sp份额：销毁的sp数量 / sp总量（settleAmountLend）
        uint256 spShare = (spAmount * 1e18) / pool.settleAmountLend;
        
        // 计算赎回金额
        uint256 redeemAmount;
        if (pool.state == PoolState.FINISH) {
            require(block.timestamp > pool.endTime, "PoolLend: pool not ended");
            // 完成状态：赎回金额 = finishAmountLend * sp份额
            redeemAmount = (pool.finishAmountLend * spShare) / 1e18;
        } else if (pool.state == PoolState.LIQUIDATION) {
            require(block.timestamp > pool.settleTime, "PoolLend: before settle time");
            // 清算状态：赎回金额 = liquidationAmountLend * sp份额
            redeemAmount = (pool.liquidationAmountLend * spShare) / 1e18;
        }
        
        require(redeemAmount > 0, "PoolLend: no amount to redeem");
        IERC20(pool.settleToken).safeTransfer(msg.sender, redeemAmount);
        
        emit SpTokenWithdrawn(poolId, msg.sender, spAmount, redeemAmount);
    }

    // 退款（结算后有多余资金时）- 对齐V2逻辑
    function refundLendAfterSettle(uint256 poolId) external nonReentrant poolExists(poolId) {
        Pool storage pool = pools[poolId];
        require(pool.state == PoolState.EXECUTION || pool.state == PoolState.FINISH || pool.state == PoolState.LIQUIDATION, "PoolLend: invalid state for refund");
        require(block.timestamp >= pool.settleTime, "PoolLend: before settle time");
        
        LendInfo storage lendInfo = lendInfos[poolId][msg.sender];
        require(lendInfo.amount > 0, "PoolLend: no lending position");
        require(!lendInfo.refunded, "PoolLend: already refunded");
        require(pool.lendSupply > pool.settleAmountLend, "PoolLend: no refund needed");
        
        // 计算用户份额：用户质押金额 / 总借出供应量
        uint256 userShare = (lendInfo.amount * 1e18) / pool.lendSupply;
        // 计算退款金额 = (总供应 - 结算金额) * 用户份额
        uint256 refundAmount = ((pool.lendSupply - pool.settleAmountLend) * userShare) / 1e18;
        
        require(refundAmount > 0, "PoolLend: no refund amount");
        lendInfo.refunded = true;
        
        IERC20(pool.settleToken).safeTransfer(msg.sender, refundAmount);
        emit LendDeposit(poolId, msg.sender, refundAmount);
    }

    // 获取借出方信息
    function getLendInfo(uint256 poolId, address lender) external view poolExists(poolId) returns (LendInfo memory) {
        return lendInfos[poolId][lender];
    }

    // 获取池子借出方列表
    function getPoolLenders(uint256 poolId) external view poolExists(poolId) returns (address[] memory) {
        return lenders[poolId];
    }
}