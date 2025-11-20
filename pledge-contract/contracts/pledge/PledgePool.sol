// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./PoolLendBorrow.sol";
import "../interface/IOracle.sol";
import "../interface/IUniswapV2Router.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PledgePool
 * @dev 主合约，整合所有功能模块
 */
contract PledgePool is PoolLendBorrow {
    using SafeERC20 for IERC20;

    constructor(address multiSignature) PoolLendBorrow(multiSignature) {}

    uint256 public constant LIQUIDATION_PENALTY = 1000;
    uint256 public constant LIQUIDATION_REWARD = 500;

    event LiquidationTriggered(uint256 indexed poolId, uint256 timestamp, uint256 healthFactor);
    event PoolLiquidated(uint256 indexed poolId, uint256 borrowTokenAmount, uint256 settleTokenAmount);
    event SetSwapRouterAddress(address indexed oldRouter, address indexed newRouter);

    // ============ 对外接口 ============
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
    ) external validCall returns (uint256) {
        require(_endTime > _settleTime, "PledgePool: end time must be greater than settle time");
        require(_jpToken != address(0), "PledgePool: jpToken is zero address");
        require(_spToken != address(0), "PledgePool: spToken is zero address");
        
        uint256 poolId = createPool(
            _lendToken, _borrowToken, _maxSupply,
            _interestRate, _martgageRate, _autoLiquidateThreshold, _endTime
        );
        
        // 设置结算时间
        pools[poolId].settleTime = _settleTime;
        
        // 设置sp和jp代币
        setPoolSpToken(poolId, _spToken);
        setPoolJpToken(poolId, _jpToken);
        
        return poolId;
    }

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

    function poolLength() external view returns (uint256) {
        return getPoolsLength();
    }

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

    // ============ 费用管理 ============
    function setFee(uint256 _lendFee, uint256 _borrowFee) external validCall {
        require(_lendFee <= MAX_FEE_RATE, "PledgePool: lend fee too high");
        require(_borrowFee <= MAX_FEE_RATE, "PledgePool: borrow fee too high");
        lendFee = _lendFee;
        borrowFee = _borrowFee;
        emit SetFee(_lendFee, _borrowFee);
    }

    function setFeeAddress(address payable _feeAddress) external validCall {
        require(_feeAddress != address(0), "PledgePool: invalid fee address");
        address oldAddress = feeAddress;
        feeAddress = _feeAddress;
        emit SetFeeAddress(oldAddress, _feeAddress);
    }

    function setMinAmount(uint256 _minAmount) external validCall {
        uint256 oldAmount = minAmount;
        minAmount = _minAmount;
        emit SetMinAmount(oldAmount, _minAmount);
    }

    function setPause() external validCall {
        globalPaused = !globalPaused;
    }

    function _redeemFees(uint256 feeRatio, address token, uint256 amount) internal returns (uint256) {
        if (feeRatio == 0 || amount == 0) return amount;
        
        uint256 fee = (amount * feeRatio) / RATE_BASE;
        if (fee > 0 && feeAddress != address(0)) {
            _transferToken(token, feeAddress, fee);
        }
        return amount - fee;
    }

    // ============ DEX交换 ============
    function setSwapRouterAddress(address _swapRouter) external validCall {
        require(_swapRouter != address(0), "PledgePool: invalid router address");
        address oldRouter = swapRouter;
        swapRouter = _swapRouter;
        emit SetSwapRouterAddress(oldRouter, _swapRouter);
    }

    function _getSwapPath(address token0, address token1) internal view returns (address[] memory path) {
        require(swapRouter != address(0), "PledgePool: swap router not set");
        IUniswapV2Router router = IUniswapV2Router(swapRouter);
        path = new address[](2);
        path[0] = token0 == address(0) ? router.WETH() : token0;
        path[1] = token1 == address(0) ? router.WETH() : token1;
    }

    function _getAmountIn(address token0, address token1, uint256 amountOut) internal view returns (uint256) {
        require(swapRouter != address(0), "PledgePool: swap router not set");
        IUniswapV2Router router = IUniswapV2Router(swapRouter);
        address[] memory path = _getSwapPath(token0, token1);
        uint256[] memory amounts = router.getAmountsIn(amountOut, path);
        return amounts[0];
    }

    function _sellExactAmount(address token0, address token1, uint256 amountOut) internal returns (uint256 amountIn, uint256 amountReceived) {
        if (amountOut == 0) return (0, 0);
        amountIn = _getAmountIn(token0, token1, amountOut);
        amountReceived = _swap(token0, token1, amountIn);
    }

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

    function _safeApprove(address token, address spender, uint256 value) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.approve.selector, spender, value)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "PledgePool: approve failed");
    }

    // ============ 结算管理 ============
    function checkoutSettle(uint256 poolId) public view poolExists(poolId) returns (bool) {
        Pool storage pool = pools[poolId];
        return block.timestamp >= pool.settleTime && pool.state == PoolState.MATCH;
    }
    function settle(uint256 poolId) external validCall poolExists(poolId) {
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

    function checkoutFinish(uint256 poolId) public view poolExists(poolId) returns (bool) {
        Pool storage pool = pools[poolId];
        return block.timestamp >= pool.endTime && pool.state == PoolState.EXECUTION;
    }
    function finish(uint256 poolId) external validCall poolExists(poolId) {
        Pool storage pool = pools[poolId];
        require(block.timestamp >= pool.endTime, "PledgePool: before end time");
        require(pool.state == PoolState.EXECUTION, "PledgePool: invalid state");

        uint256 lendAmount = _calculateRepayAmount(poolId, pool.endTime - pool.settleTime);
        (uint256 amountSell, uint256 amountIn) = _processSwapAndFees(pool, lendAmount);
        
        pool.finishAmountLend = amountIn;
        pool.finishAmountBorrow = _redeemFees(borrowFee, pool.pledgeToken, pool.settleAmountBorrow - amountSell);

        pool.state = PoolState.FINISH;
        emit PoolStateChanged(poolId, PoolState.EXECUTION, PoolState.FINISH);
    }

    // ============ 清算管理 ============
    function calculateHealthFactor(uint256 poolId) public view poolExists(poolId) returns (uint256) {
        Pool storage pool = pools[poolId];
        if (pool.state != PoolState.EXECUTION) return RATE_BASE;

        (uint256 pledgePrice, uint256 settlePrice) = _getPrices(pool);
        require(pledgePrice > 0 && settlePrice > 0, "PledgePool: invalid price");

        (uint256 totalPledgeValue, uint256 totalBorrowAmount) = _calculateTotals(poolId, pledgePrice, settlePrice);
        return totalBorrowAmount == 0 ? RATE_BASE : (totalPledgeValue * RATE_BASE) / totalBorrowAmount;
    }

    function checkoutLiquidate(uint256 poolId) external view poolExists(poolId) returns (bool) {
        return canLiquidate(poolId);
    }

    function canLiquidate(uint256 poolId) public view poolExists(poolId) returns (bool) {
        Pool storage pool = pools[poolId];
        return pool.state == PoolState.EXECUTION && 
               block.timestamp >= pool.settleTime && 
               calculateHealthFactor(poolId) < pool.liquidationRate;
    }

    function liquidate(uint256 poolId) public nonReentrant poolExists(poolId) {
        Pool storage pool = pools[poolId];
        require(pool.state == PoolState.EXECUTION && block.timestamp >= pool.settleTime, "PledgePool: invalid state");

        uint256 healthFactor = calculateHealthFactor(poolId);
        require(healthFactor < pool.liquidationRate, "PledgePool: health factor above threshold");

        uint256 lendAmount = _calculateRepayAmount(poolId, block.timestamp - pool.settleTime);
        (uint256 amountSell, uint256 amountIn) = _processSwapAndFees(pool, lendAmount);
        
        pool.liquidationAmountLend = amountIn;
        pool.liquidationAmountBorrow = _redeemFees(borrowFee, pool.pledgeToken, pool.settleAmountBorrow - amountSell);

        pool.state = PoolState.LIQUIDATION;
        emit LiquidationTriggered(poolId, block.timestamp, healthFactor);
        address[] memory borrowerList = borrowers[poolId];
        for (uint256 i = 0; i < borrowerList.length; i++) {
            BorrowInfo storage info = borrowInfos[poolId][borrowerList[i]];
            if (info.settled && !info.liquidated) {
                info.liquidated = true;
            }
        }

        emit PoolLiquidated(poolId, amountSell, amountIn);
    }

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
    function _calculateRepayAmount(uint256 poolId, uint256 duration) internal view returns (uint256) {
        Pool storage pool = pools[poolId];
        uint256 timeRatio = (duration * RATE_BASE) / SECONDS_PER_YEAR;
        uint256 interest = (timeRatio * pool.interestRate * pool.settleAmountLend) / (RATE_BASE * RATE_BASE);
        return pool.settleAmountLend + interest;
    }

    function _processSwapAndFees(Pool storage pool, uint256 lendAmount) internal returns (uint256 amountSell, uint256 amountIn) {
        uint256 sellAmount = (lendAmount * (RATE_BASE + lendFee)) / RATE_BASE;
        (amountSell, amountIn) = _sellExactAmount(pool.pledgeToken, pool.settleToken, sellAmount);
        require(amountIn >= lendAmount, "PledgePool: slippage too high");
        
        if (amountIn > lendAmount) {
            uint256 feeAmount = amountIn - lendAmount;
            if (feeAmount > 0 && feeAddress != address(0)) {
                _transferToken(pool.settleToken, feeAddress, feeAmount);
            }
            amountIn = amountIn - feeAmount;
        }
    }

    function _getPrices(Pool storage pool) internal view returns (uint256 pledgePrice, uint256 settlePrice) {
        require(oracle != address(0), "PledgePool: oracle not set");
        pledgePrice = IOracle(oracle).getPrice(pool.pledgeToken);
        settlePrice = IOracle(oracle).getPrice(pool.settleToken);
    }

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

    function _calculateLiquidationAmounts(uint256 poolId) internal view returns (uint256 totalPledge, uint256 totalBorrow) {
        (uint256 pledgePrice, uint256 settlePrice) = _getPrices(pools[poolId]);
        (totalPledge, totalBorrow) = _calculateTotals(poolId, pledgePrice, settlePrice);
        totalPledge = (totalPledge * settlePrice) / pledgePrice;
    }
}
