// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./PoolAdmin.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IUniswapV2Router02 {
    function WETH() external pure returns (address);
    function getAmountsIn(uint256 amountOut, address[] memory path) external view returns (uint256[] memory amounts);
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] memory path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] memory path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);
    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] memory path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

/**
 * @title PoolSwap
 * @dev DEX交换功能实现
 */
contract PoolSwap is PoolAdmin, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /**
     * @dev 获取swap路径
     */
    function _getSwapPath(address token0, address token1) internal view returns (address[] memory path) {
        require(swapRouter != address(0), "PoolSwap: swap router not set");
        IUniswapV2Router02 router = IUniswapV2Router02(swapRouter);
        path = new address[](2);
        path[0] = token0 == address(0) ? router.WETH() : token0;
        path[1] = token1 == address(0) ? router.WETH() : token1;
    }

    /**
     * @dev 根据输出金额计算所需输入金额
     */
    function _getAmountIn(address token0, address token1, uint256 amountOut) internal view returns (uint256) {
        require(swapRouter != address(0), "PoolSwap: swap router not set");
        IUniswapV2Router02 router = IUniswapV2Router02(swapRouter);
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
        require(swapRouter != address(0), "PoolSwap: swap router not set");
        if (amount0 == 0) return 0;

        IUniswapV2Router02 router = IUniswapV2Router02(swapRouter);
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
        require(success && (data.length == 0 || abi.decode(data, (bool))), "PoolSwap: approve failed");
    }

    /**
     * @dev 设置swap路由地址
     */
    function setSwapRouter(address _swapRouter) external onlyAdmin {
        require(_swapRouter != address(0), "PoolSwap: invalid router address");
        address oldRouter = swapRouter;
        swapRouter = _swapRouter;
        emit SetSwapRouter(oldRouter, _swapRouter);
    }

    /**
     * @dev 获取swap路由地址
     */
    function getSwapRouter() external view returns (address) {
        return swapRouter;
    }
}
