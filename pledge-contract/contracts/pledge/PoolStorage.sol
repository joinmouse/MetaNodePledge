// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PoolStorage
 * @dev 质押借贷池存储结构定义
 */
contract PoolStorage {
    
    // 池子状态枚举
    enum PoolState {
        MATCH,        // 匹配期
        EXECUTION,    // 执行期  
        FINISH,       // 完成
        LIQUIDATION,  // 清算
        UNDONE        // 未完成（极端情况）
    }
    
    // 池子信息结构体
    struct Pool {
        // ============ 基础信息 ============
        address creator;            // 创建者地址
        PoolState state;            // 池子状态
        
        // ============ 代币地址 ============
        address settleToken;        // 结算代币地址
        address pledgeToken;        // 质押代币地址
        address spToken;            // sp债权代币地址（借出方债权代币）
        address jpToken;            // jp债权代币地址（借入方债权代币）
        
        // ============ 供应量配置 ============
        uint256 maxSupply;          // 最大供应量
        uint256 lendSupply;         // 当前借出供应量
        uint256 borrowSupply;       // 当前借入供应量
        uint256 borrowAmount;       // 可借金额
        
        // ============ 利率和质押率配置 ============
        uint256 interestRate;       // 年化利率 (基点，10000=100%)
        uint256 pledgeRate;         // 质押率 (基点，15000=150%)
        uint256 liquidationRate;    // 清算率 (基点，13000=130%)
        uint256 autoLiquidateThreshold; // 自动清算阈值
        
        // ============ 时间配置 ============
        uint256 endTime;            // 结束时间戳
        uint256 settleTime;         // 结算时间戳
        
        // ============ 借出方金额统计 ============
        uint256 lendAmount;         // 借出方总金额
        uint256 settleAmountLend;   // 结算借出金额
        uint256 finishAmountLend;   // 完成借出金额
        uint256 liquidationAmountLend;  // 清算借出金额
        
        // ============ 借入方金额统计 ============
        uint256 settleAmountBorrow; // 结算借入金额
        uint256 finishAmountBorrow; // 完成借入金额
        uint256 liquidationAmountBorrow; // 清算借入金额
    }
    
    // 借出方信息结构体
    struct LendInfo {
        uint256 amount;           // 借出金额
        uint256 lendAmount;       // 实际借出金额（结算后）
        uint256 interestAmount;   // 应得利息
        bool claimed;             // 是否已领取sp代币
        bool settled;             // 是否已结算
        bool refunded;            // 是否已退款
    }
    
    // 借入方信息结构体
    struct BorrowInfo {
        uint256 pledgeAmount;     // 质押金额
        uint256 borrowAmount;     // 借入金额
        bool settled;             // 是否已结算
        bool liquidated;          // 是否被清算
    }
    
    // 存储映射
    mapping(uint256 => Pool) public pools;                    // 池子ID => 池子信息
    mapping(uint256 => mapping(address => LendInfo)) public lendInfos;     // 池子ID => 用户 => 借出信息
    mapping(uint256 => mapping(address => BorrowInfo)) public borrowInfos; // 池子ID => 用户 => 借入信息
    mapping(uint256 => address[]) public lenders;             // 池子ID => 借出方列表
    mapping(uint256 => address[]) public borrowers;           // 池子ID => 借入方列表
    
    // 全局变量
    uint256 public poolCounter;                               // 池子计数器
    address public admin;                                     // 管理员地址
    address public oracle;                                    // 预言机地址
    address public debtToken;                                 // 债务代币地址
    address public swapRouter;                                // Swap路由地址
    address payable public feeAddress;                        // 费用接收地址
    uint256 public lendFee;                                   // 借出费率
    uint256 public borrowFee;                                 // 借入费率
    uint256 public minAmount;                                 // 最小金额
    bool public globalPaused;                                 // 全局暂停标志
    
    // 常量
    uint256 public constant RATE_BASE = 10000;               // 利率基数
    uint256 public constant SECONDS_PER_YEAR = 365 days;     // 年秒数
    
    // 参数限制常量
    uint256 public constant MAX_INTEREST_RATE = 10000;       // 最大利率 100%
    uint256 public constant MIN_PLEDGE_RATE = 10000;         // 最小质押率 100%
    uint256 public constant MAX_PLEDGE_RATE = 50000;         // 最大质押率 500%
    uint256 public constant MAX_FEE_RATE = 1000;             // 最大费率 10%
    
    // 事件定义
    event PoolCreated(uint256 indexed poolId, address indexed creator, address settleToken, address pledgeToken);
    event LendDeposit(uint256 indexed poolId, address indexed lender, uint256 amount);
    event BorrowPledge(uint256 indexed poolId, address indexed borrower, uint256 pledgeAmount, uint256 borrowAmount);
    event PoolStateChanged(uint256 indexed poolId, PoolState oldState, PoolState newState);
    event InterestClaimed(uint256 indexed poolId, address indexed lender, uint256 amount);
    event SpTokenClaimed(uint256 indexed poolId, address indexed lender, uint256 spAmount);
    event SpTokenWithdrawn(uint256 indexed poolId, address indexed lender, uint256 spAmount, uint256 redeemAmount);
    event PoolSettled(uint256 indexed poolId, uint256 totalLendAmount, uint256 totalBorrowAmount);
    event Liquidation(uint256 indexed poolId, address indexed borrower, uint256 pledgeAmount);
    event WithdrawLend(address indexed user, uint256 indexed poolId, address indexed token, uint256 amount);
    event SetFee(uint256 lendFee, uint256 borrowFee);
    event SetFeeAddress(address indexed oldAddress, address indexed newAddress);
    event SetSwapRouter(address indexed oldRouter, address indexed newRouter);
    event SetMinAmount(uint256 oldAmount, uint256 newAmount);
    event Swap(address indexed fromToken, address indexed toToken, uint256 fromAmount, uint256 toAmount);
    event EmergencyLendWithdrawal(address indexed user, uint256 indexed poolId, uint256 amount);
    event EmergencyBorrowWithdrawal(address indexed user, uint256 indexed poolId, uint256 amount);
    
    // 管理员权限
    modifier onlyAdmin() {
        require(msg.sender == admin, "PoolStorage: caller is not admin");
        _;
    }
    
    // 池子存在
    modifier poolExists(uint256 poolId) {
        require(poolId > 0 && poolId <= poolCounter, "PoolStorage: pool does not exist");
        _;
    }
    
    // 池子状态
    modifier validState(uint256 poolId, PoolState expectedState) {
        require(pools[poolId].state == expectedState, "PoolStorage: invalid pool state");
        _;
    }
    
    // 未暂停
    modifier notPaused() {
        require(!globalPaused, "PoolStorage: contract is paused");
        _;
    }
    
    // 时间检查
    modifier timeBefore(uint256 poolId) {
        require(block.timestamp < pools[poolId].settleTime, "PoolStorage: after settle time");
        _;
    }
    
    modifier timeAfter(uint256 poolId) {
        require(block.timestamp >= pools[poolId].settleTime, "PoolStorage: before settle time");
        _;
    }
    
    // 公共辅助函数：统一转账（ETH或ERC20）
    function _transferToken(address token, address to, uint256 amount) internal {
        if (amount == 0) return;
        if (token == address(0)) {
            // 转账ETH
            payable(to).transfer(amount);
        } else {
            // 转账ERC20
            IERC20(token).transfer(to, amount);
        }
    }
    
    // 公共辅助函数：统一接收代币（ETH或ERC20）
    function _receiveToken(address token, address from, uint256 amount) internal returns (uint256) {
        if (token == address(0)) {
            // 接收ETH
            require(msg.value > 0, "PoolStorage: ETH required");
            return msg.value;
        } else {
            // 接收ERC20
            require(msg.value == 0, "PoolStorage: ETH not accepted");
            require(amount > 0, "PoolStorage: amount required");
            IERC20(token).transferFrom(from, address(this), amount);
            return amount;
        }
    }
}