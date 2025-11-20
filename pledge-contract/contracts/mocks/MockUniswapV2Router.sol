// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockUniswapV2Router
 * @dev 用于测试的简单 Uniswap V2 Router Mock
 */
contract MockUniswapV2Router {
    address public immutable WETH;
    
    // 模拟价格：1 token0 = 2 token1
    uint256 public constant MOCK_RATE = 2;
    
    constructor() {
        // 使用部署者地址作为WETH地址（仅用于测试）
        WETH = address(this);
    }
    
    /**
     * @dev 获取输入金额数组
     */
    function getAmountsIn(uint256 amountOut, address[] memory path) 
        external 
        pure 
        returns (uint256[] memory amounts) 
    {
        require(path.length >= 2, "Invalid path");
        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;
        
        // 简单的价格计算：输入 = 输出 * 2
        for (uint256 i = path.length - 1; i > 0; i--) {
            amounts[i - 1] = amounts[i] * MOCK_RATE;
        }
    }
    
    /**
     * @dev Token -> Token 交换
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] memory path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(deadline >= block.timestamp, "Expired");
        require(path.length >= 2, "Invalid path");
        
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        
        // 简单的价格计算：输出 = 输入 / 2
        for (uint256 i = 0; i < path.length - 1; i++) {
            amounts[i + 1] = amounts[i] / MOCK_RATE;
        }
        
        require(amounts[amounts.length - 1] >= amountOutMin, "Insufficient output");
        
        // 转移代币
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        IERC20(path[path.length - 1]).transfer(to, amounts[amounts.length - 1]);
    }
    
    /**
     * @dev ETH -> Token 交换
     */
    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] memory path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts) {
        require(deadline >= block.timestamp, "Expired");
        require(path.length >= 2, "Invalid path");
        require(path[0] == WETH, "Invalid path");
        
        amounts = new uint256[](path.length);
        amounts[0] = msg.value;
        
        // 简单的价格计算
        for (uint256 i = 0; i < path.length - 1; i++) {
            amounts[i + 1] = amounts[i] / MOCK_RATE;
        }
        
        require(amounts[amounts.length - 1] >= amountOutMin, "Insufficient output");
        
        // 转移代币
        IERC20(path[path.length - 1]).transfer(to, amounts[amounts.length - 1]);
    }
    
    /**
     * @dev Token -> ETH 交换
     */
    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] memory path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(deadline >= block.timestamp, "Expired");
        require(path.length >= 2, "Invalid path");
        require(path[path.length - 1] == WETH, "Invalid path");
        
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        
        // 简单的价格计算
        for (uint256 i = 0; i < path.length - 1; i++) {
            amounts[i + 1] = amounts[i] / MOCK_RATE;
        }
        
        require(amounts[amounts.length - 1] >= amountOutMin, "Insufficient output");
        
        // 转移代币和ETH
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        payable(to).transfer(amounts[amounts.length - 1]);
    }
    
    // 接收ETH
    receive() external payable {}
}
