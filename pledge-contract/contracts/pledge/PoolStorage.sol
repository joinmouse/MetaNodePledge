// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

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
        LIQUIDATION   // 清算
    }
    
    // 池子信息结构体
    struct Pool {
        address settleToken;        // 结算代币地址
        address pledgeToken;        // 质押代币地址
        uint256 borrowAmount;       // 可借金额
        uint256 interestRate;       // 年化利率 (基点，10000=100%)
        uint256 pledgeRate;         // 质押率 (基点，15000=150%)
        uint256 liquidationRate;    // 清算率 (基点，13000=130%)
        uint256 endTime;            // 结束时间戳
        uint256 settleAmountLend;   // 借出方总金额
        uint256 settleAmountBorrow; // 借入方总金额
        PoolState state;            // 池子状态
        address creator;            // 创建者地址
        address spToken;            // sp债权代币地址
        address jpToken;            // jp债权代币地址
    }
    
    // 借出方信息结构体
    struct LendInfo {
        uint256 amount;           // 借出金额
        uint256 interestAmount;   // 应得利息
        bool claimed;             // 是否已领取sp代币
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
    
    // 常量
    uint256 public constant RATE_BASE = 10000;               // 利率基数
    uint256 public constant SECONDS_PER_YEAR = 365 days;     // 年秒数
    
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
}