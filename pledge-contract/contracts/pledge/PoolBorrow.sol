// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./PoolAdmin.sol";
import "../interface/IDebtToken.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// PoolBorrow - 借入方合约，实现质押资产借入资金的完整流程
contract PoolBorrow is PoolAdmin, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // 事件定义
    event DepositBorrow(address indexed user, uint256 indexed poolId, address indexed token, uint256 amount);
    event ClaimBorrow(address indexed user, uint256 indexed poolId, address indexed jpToken, uint256 jpAmount, uint256 borrowAmount);
    event WithdrawBorrow(address indexed user, uint256 indexed poolId, address indexed token, uint256 amount, uint256 jpBurnAmount);
    event RefundBorrow(address indexed user, uint256 indexed poolId, address indexed token, uint256 refundAmount);

    // 匹配状态
    modifier stateMatch(uint256 poolId) {
        require(poolId > 0 && poolId <= poolCounter, "PoolBorrow: invalid pool id");
        require(pools[poolId].state == PoolState.MATCH, "PoolBorrow: pool not in MATCH state");
        _;
    }
    //  非匹配状态
    modifier stateNotMatch(uint256 poolId) {
        require(poolId > 0 && poolId <= poolCounter, "PoolBorrow: invalid pool id");
        require(pools[poolId].state != PoolState.MATCH, "PoolBorrow: invalid pool state");
        _;
    }
    //  完成状态或清算状态
    modifier stateFinishLiquidation(uint256 poolId) {
        require(poolId > 0 && poolId <= poolCounter, "PoolBorrow: invalid pool id");
        PoolState state = pools[poolId].state;
        require(state == PoolState.FINISH || state == PoolState.LIQUIDATION, "PoolBorrow: pool not finished or liquidated");
        _;
    }
    //  时间在结束时间之前
    modifier timeBefore(uint256 poolId) {
        require(poolId > 0 && poolId <= poolCounter, "PoolBorrow: invalid pool id");
        require(block.timestamp < pools[poolId].endTime, "PoolBorrow: after end time");
        _;
    }

    // 1、质押资产借入
    function depositBorrow(uint256 poolId, uint256 pledgeAmount) external payable 
        nonReentrant poolExists(poolId) stateMatch(poolId) timeBefore(poolId) 
    {
        require(pledgeAmount > 0, "PoolBorrow: amount must be greater than 0");
        
        Pool storage pool = pools[poolId];
        BorrowInfo storage borrowInfo = borrowInfos[poolId][msg.sender];

        // 处理ETH或ERC20代币
        uint256 actualAmount;
        if (pool.pledgeToken == address(0)) { // ETH质押
            require(msg.value > 0, "PoolBorrow: ETH amount required");
            actualAmount = msg.value;
        } else {
            // ERC20代币质押
            require(msg.value == 0, "PoolBorrow: ETH not accepted");
            require(pledgeAmount > 0, "PoolBorrow: amount required");
            
            IERC20(pool.pledgeToken).safeTransferFrom(
                msg.sender, address(this), pledgeAmount
            );
            actualAmount = pledgeAmount;
        }

        // 更新用户信息
        if (borrowInfo.pledgeAmount == 0) {
            // 首次质押，添加到借入方列表
            borrowers[poolId].push(msg.sender);
        }
        borrowInfo.pledgeAmount += actualAmount;
        borrowInfo.settled = false;
        borrowInfo.liquidated = false;

        emit DepositBorrow(msg.sender, poolId, pool.pledgeToken, actualAmount);
    }

    // 2、 领取借入 (获得jpToken凭证 + 借入资金)
    function claimBorrow(uint256 poolId) external
        nonReentrant poolExists(poolId) stateNotMatch(poolId)
    {
        Pool storage pool = pools[poolId];
        BorrowInfo storage borrowInfo = borrowInfos[poolId][msg.sender];

        require(borrowInfo.pledgeAmount > 0, "PoolBorrow: no pledge to claim");
        require(!borrowInfo.settled, "PoolBorrow: already claimed");
        require(pool.state == PoolState.EXECUTION, "PoolBorrow: pool not in execution");

        // 计算借入金额 = 质押金额 * 质押价值 / 质押率
        uint256 pledgeValue = borrowInfo.pledgeAmount;
        uint256 borrowAmount = (pledgeValue * RATE_BASE) / pool.pledgeRate;
        if (borrowAmount > pool.borrowAmount) {
            borrowAmount = pool.borrowAmount;
        }

        uint256 jpAmount = borrowAmount;

        // 铸造jpToken给用户
        if (pool.jpToken != address(0)) {
            IDebtToken(pool.jpToken).mint(msg.sender, jpAmount);
        }

        // 转移借入资金给用户
        if (borrowAmount > 0) {
            if (pool.settleToken == address(0)) {
                payable(msg.sender).transfer(borrowAmount);
            } else {
                IERC20(pool.settleToken).safeTransfer(msg.sender, borrowAmount);
            }
        }

        // 更新用户状态
        borrowInfo.borrowAmount = borrowAmount;
        borrowInfo.settled = true;

        emit ClaimBorrow(msg.sender, poolId, pool.jpToken, jpAmount, borrowAmount);
    }

    // 3、 提取质押资产 (销毁jpToken)
    function withdrawBorrow(uint256 poolId, uint256 jpAmount) external payable
        nonReentrant poolExists(poolId) stateFinishLiquidation(poolId)
    {
        require(jpAmount > 0, "PoolBorrow: jpAmount must be greater than 0");

        Pool storage pool = pools[poolId];
        BorrowInfo storage borrowInfo = borrowInfos[poolId][msg.sender];
        
        require(borrowInfo.settled, "PoolBorrow: not settled yet");
        require(borrowInfo.borrowAmount >= jpAmount, "PoolBorrow: insufficient jp balance");
        
        // 销毁用户的jpToken
        if (pool.jpToken != address(0)) {
            IDebtToken(pool.jpToken).burn(msg.sender, jpAmount);
        }

        uint256 redeemAmount;
        // 计算提取金额 = 借入金额 * 质押率 / 10000
        if (pool.state == PoolState.FINISH) {
            require(block.timestamp > pool.endTime, "PoolBorrow: not yet finished");
            uint256 repayAmount = jpAmount + (jpAmount * pool.interestRate * (pool.endTime - block.timestamp)) / (RATE_BASE * SECONDS_PER_YEAR);
            
            if (pool.settleToken == address(0)) {
                require(msg.value >= repayAmount, "PoolBorrow: insufficient repay amount");
            } else {
                IERC20(pool.settleToken).safeTransferFrom(msg.sender, address(this), repayAmount);
            }
            redeemAmount = (jpAmount * pool.pledgeRate) / RATE_BASE;
        } else if (pool.state == PoolState.LIQUIDATION) {
            redeemAmount = (jpAmount * pool.pledgeRate * 80) / (RATE_BASE * 100);
        }

        borrowInfo.borrowAmount -= jpAmount;

        if (redeemAmount > 0) {
            if (pool.pledgeToken == address(0)) {
                payable(msg.sender).transfer(redeemAmount);
            } else {
                IERC20(pool.pledgeToken).safeTransfer(msg.sender, redeemAmount);
            }
        }

        emit WithdrawBorrow(msg.sender, poolId, pool.pledgeToken, redeemAmount, jpAmount);
    }

    // 4、退还多余质押资产
    function refundBorrow(uint256 poolId) external nonReentrant poolExists(poolId) {
        Pool storage pool = pools[poolId];
        BorrowInfo storage borrowInfo = borrowInfos[poolId][msg.sender];

        require(borrowInfo.pledgeAmount > 0, "PoolBorrow: no pledge to refund");
        require(!borrowInfo.liquidated, "PoolBorrow: already liquidated");
        require(pool.state == PoolState.FINISH, "PoolBorrow: pool not finished");

        if (borrowInfo.settled && borrowInfo.borrowAmount > 0) {
            revert("PoolBorrow: please repay loan first");
        }

        uint256 refundAmount = borrowInfo.pledgeAmount;

        // 退还质押资产
        if (pool.pledgeToken == address(0)) {
            payable(msg.sender).transfer(refundAmount);
        } else {
            IERC20(pool.pledgeToken).safeTransfer(msg.sender, refundAmount);
        }

        borrowInfo.pledgeAmount = 0;

        emit RefundBorrow(msg.sender, poolId, pool.pledgeToken, refundAmount);
    }


    // 获取用户借入信息
    function getUserBorrowInfo(address user, uint256 poolId) external view poolExists(poolId) returns (BorrowInfo memory){
        return borrowInfos[poolId][user];
    }
    // 计算用户可借入的资金数量
    function calculateBorrowAmount(address user, uint256 poolId) external view returns (uint256){
        if (poolId == 0 || poolId > poolCounter) return 0;
        
        Pool storage pool = pools[poolId];
        BorrowInfo storage borrowInfo = borrowInfos[poolId][user];
        
        if (borrowInfo.pledgeAmount == 0) return 0;
        
        uint256 pledgeValue = borrowInfo.pledgeAmount;
        uint256 borrowAmount = (pledgeValue * RATE_BASE) / pool.pledgeRate;
        if (borrowAmount > pool.borrowAmount) {
            borrowAmount = pool.borrowAmount;
        }
        
        return borrowAmount;
    }

    // 获取池子的借入方列表
    function getPoolBorrowers(uint256 poolId) external view poolExists(poolId) returns (address[] memory) {
        return borrowers[poolId];
    }

    // 检查用户是否可以退还质押
    function canRefund(address user, uint256 poolId) external view returns (bool) {
        if (poolId == 0 || poolId > poolCounter) return false;
        
        Pool storage pool = pools[poolId];
        BorrowInfo storage borrowInfo = borrowInfos[poolId][user];
        
        return borrowInfo.pledgeAmount > 0 && 
               !borrowInfo.liquidated && 
               pool.state == PoolState.FINISH &&
               (!borrowInfo.settled || borrowInfo.borrowAmount == 0);
    }
}