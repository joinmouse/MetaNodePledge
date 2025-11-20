// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./PoolLendBorrow.sol";
import "../interface/IOracle.sol";
import "../interface/IUniswapV2Router.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PledgePool
 * @dev 主合约，整合所有功能模块，对外暴露V2对齐的方法
 * @notice 继承链简化为：PledgePool → PoolLendBorrow → PoolStorage
 * @notice 合并了PoolSettle、PoolSwap、PoolFee和PoolLiquidation的功能
 */
contract PledgePool is PoolLendBorrow {
    using SafeERC20 for IERC20;

    uint256 public constant LIQUIDATION_PENALTY = 1000; // 10%
    uint256 public constant LIQUIDATION_REWARD = 500;   // 5%

    event LiquidationTriggered(uint256 indexed poolId, uint256 timestamp, uint256 healthFactor);
    event PoolLiquidated(uint256 indexed poolId, uint256 borrowTokenAmount, uint256 settleTokenAmount);
    event SetSwapRouterAddress(address indexed oldRouter, address indexed newRouter);
    
    constructor() {
        admin = msg.sender;
    }
    
    // ============ V2对齐的对外方法 ============
    
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

    // ============ Fee功能：费用管理 ============
    
    /**
     * @dev 设置费率 - 对齐V2
     */
    function setFee(uint256 _lendFee, uint256 _borrowFee) external onlyAdmin {
        require(_lendFee <= MAX_FEE_RATE, "PledgePool: lend fee too high");
        require(_borrowFee <= MAX_FEE_RATE, "PledgePool: borrow fee too high");
        lendFee = _lendFee;
        borrowFee = _borrowFee;
        emit SetFee(_lendFee, _borrowFee);
    }

    /**
     * @dev 设置费用接收地址 - 对齐V2
     */
    function setFeeAddress(address payable _feeAddress) external onlyAdmin {
        require(_feeAddress != address(0), "PledgePool: invalid fee address");
        address oldAddress = feeAddress;
        feeAddress = _feeAddress;
        emit SetFeeAddress(oldAddress, _feeAddress);
    }

    /**
     * @dev 设置最小金额 - 对齐V2
     */
    function setMinAmount(uint256 _minAmount) external onlyAdmin {
        uint256 oldAmount = minAmount;
        minAmount = _minAmount;
        emit SetMinAmount(oldAmount, _minAmount);
    }

    /**
     * @dev 设置全局暂停 - 对齐V2
     */
    function setPause() external onlyAdmin {
        globalPaused = !globalPaused;
    }

    /**
     * @dev 计算并扣除费用
     */
    function _redeemFees(uint256 feeRatio, address token, uint256 amount) internal returns (uint256) {
        if (feeRatio == 0 || amount == 0) return amount;
        
        uint256 fee = (amount * feeRatio) / RATE_BASE;
        if (fee > 0 && feeAddress != address(0)) {
            _transferToken(token, feeAddress, fee);
        }
        return amount - fee;
    }

    // ============ Swap功能：DEX交换 ============
    
    /**
     * @dev 设置swap路由地址 - 对齐V2
     */
    function setSwapRouterAddress(address _swapRouter) external onlyAdmin {
        require(_swapRouter != address(0), "PledgePool: invalid router address");
        address oldRouter = swapRouter;
        swapRouter = _swapRouter;
        emit SetSwapRouterAddress(oldRouter, _swapRouter);
    }

    /**
     * @dev 获取swap路径
     */
    function _getSwapPath(address token0, address token1) internal view returns (address[] memory path) {
        require(swapRouter != address(0), "PledgePool: swap router not set");
        IUniswapV2Router router = IUniswapV2Router(swapRouter);
        path = new address[](2);
        path[0] = token0 == address(0) ? router.WETH() : token0;
        path[1] = token1 == address(0) ? router.WETH() : token1;
    }

    /**
     * @dev 根据输出金额计算所需输入金额
     */
    function _getAmountIn(address token0, address token1, uint256 amountOut) internal view returns (uint256) {
        require(swapRouter != address(0), "PledgePool: swap router not set");
        IUniswapV2Router router = IUniswapV2Router(swapRouter);
        address[] memory path = _getSwapPath(token0, token1);
        uint256[] memory amounts = router.getAmountsIn(amountOut, path);
        return amounts[0];
    }

    /**
     * @dev 卖出精确数量的代币
     */
    function _sellExactAmount(address token0, address token1, uint256 amountOut) internal returns (uint256 amountIn, uint256 amountReceived) {
        if (amountOut == 0) return (0, 0);
        amountIn = _getAmountIn(token0, token1, amountOut);
        amountReceived = _swap(token0, token1, amountIn);
    }

    /**
     * @dev 执行swap交换
     */
    function _swap(address token0, address token1, uint256 amount0) internal returns (uint256) {
        require(swapRouter != address(0), "PledgePool: swap router not set");
        if (amount0 == 0) return 0;

        IUniswapV2Router router = IUniswapV2Router(swapRouter);
        address[] memory path = _getSwapPath(token0, token1);
        
        // 授权
        if (token0 != address(0)) {
            _safeApprove(token0, swapRouter, amount0);
        }
        if (token1 != address(0)) {
            _safeApprove(token1, swapRouter, type(uint256).max);
        }

        uint256[] memory amounts;
        uint256 deadline = block.timestamp + 300; // 5分钟

        if (token0 == address(0)) {
            // ETH -> Token
            amounts = router.swapExactETHForTokens{value: amount0}(0, path, address(this), deadline);
        } else if (token1 == address(0)) {
            // Token -> ETH
            amounts = router.swapExactTokensForETH(amount0, 0, path, address(this), deadline);
        } else {
            // Token -> Token
            amounts = router.swapExactTokensForTokens(amount0, 0, path, address(this), deadline);
        }

        emit Swap(token0, token1, amounts[0], amounts[amounts.length - 1]);
        return amounts[amounts.length - 1];
    }

    /**
     * @dev 安全授权
     */
    function _safeApprove(address token, address spender, uint256 value) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.approve.selector, spender, value)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "PledgePool: approve failed");
    }

    // ============ Settle功能：结算和完成 ============
    
    /**
     * @dev 检查是否可以结算 - 对齐V2
     */
    function checkoutSettle(uint256 poolId) public view poolExists(poolId) returns (bool) {
        Pool storage pool = pools[poolId];
        return block.timestamp >= pool.settleTime && pool.state == PoolState.MATCH;
    }

    /**
     * @dev 执行结算 - 对齐V2
     */
    function settle(uint256 poolId) external onlyAdmin poolExists(poolId) {
        Pool storage pool = pools[poolId];
        require(block.timestamp >= pool.settleTime, "PledgePool: before settle time");
        require(pool.state == PoolState.MATCH, "PledgePool: invalid state");

        // 检查是否有借出和借入
        if (pool.lendSupply > 0 && pool.borrowSupply > 0) {
            // 获取价格
            uint256 pledgePrice = IOracle(oracle).getPrice(pool.pledgeToken);
            uint256 settlePrice = IOracle(oracle).getPrice(pool.settleToken);
            require(pledgePrice > 0 && settlePrice > 0, "PledgePool: invalid price");

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
     * @dev 检查是否可以完成 - 对齐V2
     */
    function checkoutFinish(uint256 poolId) public view poolExists(poolId) returns (bool) {
        Pool storage pool = pools[poolId];
        return block.timestamp >= pool.endTime && pool.state == PoolState.EXECUTION;
    }

    /**
     * @dev 执行完成 - 对齐V2
     */
    function finish(uint256 poolId) external onlyAdmin poolExists(poolId) {
        Pool storage pool = pools[poolId];
        require(block.timestamp >= pool.endTime, "PledgePool: before end time");
        require(pool.state == PoolState.EXECUTION, "PledgePool: invalid state");

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
        require(amountIn >= lendAmount, "PledgePool: slippage too high");

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

    // ============ Liquidation功能：清算 ============
    
    /**
     * @dev 计算健康因子
     */
    function calculateHealthFactor(uint256 poolId) public view poolExists(poolId) returns (uint256) {
        Pool storage pool = pools[poolId];
        if (pool.state != PoolState.EXECUTION) return RATE_BASE;

        (uint256 pledgePrice, uint256 settlePrice) = _getPrices(pool);
        require(pledgePrice > 0 && settlePrice > 0, "PledgePool: invalid price");

        (uint256 totalPledgeValue, uint256 totalBorrowAmount) = _calculateTotals(poolId, pledgePrice, settlePrice);
        return totalBorrowAmount == 0 ? RATE_BASE : (totalPledgeValue * RATE_BASE) / totalBorrowAmount;
    }

    /**
     * @dev 检查是否可以清算 - 对齐V2
     */
    function checkoutLiquidate(uint256 poolId) external view poolExists(poolId) returns (bool) {
        return canLiquidate(poolId);
    }

    /**
     * @dev 检查是否可清算
     */
    function canLiquidate(uint256 poolId) public view poolExists(poolId) returns (bool) {
        Pool storage pool = pools[poolId];
        return pool.state == PoolState.EXECUTION && 
               block.timestamp >= pool.settleTime && 
               calculateHealthFactor(poolId) < pool.liquidationRate;
    }

    /**
     * @dev 执行清算 - 对齐V2
     */
    function liquidate(uint256 poolId) public nonReentrant poolExists(poolId) {
        Pool storage pool = pools[poolId];
        require(pool.state == PoolState.EXECUTION && block.timestamp >= pool.settleTime, "PledgePool: invalid state");

        uint256 healthFactor = calculateHealthFactor(poolId);
        require(healthFactor < pool.liquidationRate, "PledgePool: health factor above threshold");

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

    /**
     * @dev 获取清算信息
     */
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

    // ============ 内部辅助函数 ============
    
    /**
     * @dev 获取价格
     */
    function _getPrices(Pool storage pool) internal view returns (uint256 pledgePrice, uint256 settlePrice) {
        require(oracle != address(0), "PledgePool: oracle not set");
        pledgePrice = IOracle(oracle).getPrice(pool.pledgeToken);
        settlePrice = IOracle(oracle).getPrice(pool.settleToken);
    }

    /**
     * @dev 计算总量（合并两个循环）
     */
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

    /**
     * @dev 计算清算金额
     */
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
