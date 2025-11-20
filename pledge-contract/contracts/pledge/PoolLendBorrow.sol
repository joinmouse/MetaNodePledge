// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./PoolStorage.sol";
import "../interface/IDebtToken.sol";
import "../interface/IOracle.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PoolLendBorrow
 * @dev 核心借贷逻辑层，合并了Admin、Lend和Borrow三个模块的功能
 * @notice 继承自PoolStorage，包含池子管理、借出和借入的完整逻辑
 */
contract PoolLendBorrow is PoolStorage, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Admin功能：池子管理 ============
    
    /**
     * @dev 创建质押借贷池子
     */
    function createPool(
        address _settleToken,
        address _pledgeToken,
        uint256 _borrowAmount,
        uint256 _interestRate,
        uint256 _pledgeRate,
        uint256 _liquidationRate,
        uint256 _endTime
    ) public onlyAdmin returns (uint256) {
        require(_settleToken != address(0), "PoolLendBorrow: invalid settle token");
        require(_pledgeToken != address(0), "PoolLendBorrow: invalid pledge token");
        require(_borrowAmount > 0, "PoolLendBorrow: invalid borrow amount");
        require(_interestRate > 0 && _interestRate <= MAX_INTEREST_RATE, "PoolLendBorrow: invalid interest rate");
        require(_pledgeRate >= MIN_PLEDGE_RATE && _pledgeRate <= MAX_PLEDGE_RATE, "PoolLendBorrow: invalid pledge rate");
        require(_liquidationRate > RATE_BASE && _liquidationRate < _pledgeRate, "PoolLendBorrow: invalid liquidation rate");
        require(_endTime > block.timestamp, "PoolLendBorrow: invalid end time");
        
        uint256 poolId = ++poolCounter;
        
        pools[poolId] = Pool({
            settleToken: _settleToken,
            pledgeToken: _pledgeToken,
            maxSupply: _borrowAmount,
            lendSupply: 0,
            borrowSupply: 0,
            borrowAmount: _borrowAmount,
            interestRate: _interestRate,
            pledgeRate: _pledgeRate,
            liquidationRate: _liquidationRate,
            autoLiquidateThreshold: _liquidationRate,
            endTime: _endTime,
            settleTime: 0,
            lendAmount: 0,
            settleAmountLend: 0,
            settleAmountBorrow: 0,
            finishAmountLend: 0,
            finishAmountBorrow: 0,
            liquidationAmountLend: 0,
            liquidationAmountBorrow: 0,
            state: PoolState.MATCH,
            creator: msg.sender,
            spToken: address(0),
            jpToken: address(0)
        });
        
        emit PoolCreated(poolId, msg.sender, _settleToken, _pledgeToken);
        return poolId;
    }
    
    /**
     * @dev 设置池子状态
     */
    function setPoolState(uint256 poolId, PoolState newState) external onlyAdmin poolExists(poolId) {
        PoolState oldState = pools[poolId].state;
        pools[poolId].state = newState;
        emit PoolStateChanged(poolId, oldState, newState);
    }
    
    /**
     * @dev 设置预言机
     */
    function setOracle(address _oracle) external onlyAdmin {
        require(_oracle != address(0), "PoolLendBorrow: invalid oracle address");
        oracle = _oracle;
    }
    
    /**
     * @dev 设置债务代币地址
     */
    function setDebtToken(address _debtToken) external onlyAdmin {
        require(_debtToken != address(0), "PoolLendBorrow: invalid debt token address");
        debtToken = _debtToken;
    }
    
    /**
     * @dev 设置池子的sp代币
     */
    function setPoolSpToken(uint256 poolId, address _spToken) public onlyAdmin poolExists(poolId) {
        require(_spToken != address(0), "PoolLendBorrow: invalid sp token address");
        pools[poolId].spToken = _spToken;
    }
    
    /**
     * @dev 设置池子的jp代币
     */
    function setPoolJpToken(uint256 poolId, address _jpToken) public onlyAdmin poolExists(poolId) {
        require(_jpToken != address(0), "PoolLendBorrow: invalid jp token address");
        pools[poolId].jpToken = _jpToken;
    }
    
    /**
     * @dev 获取池子信息
     */
    function getPoolInfo(uint256 poolId) external view poolExists(poolId) returns (Pool memory) {
        return pools[poolId];
    }
    
    /**
     * @dev 获取池子数量
     */
    function getPoolsLength() public view returns (uint256) {
        return poolCounter;
    }
    
    /**
     * @dev 获取池子状态 - 对齐V2
     */
    function getPoolState(uint256 poolId) external view poolExists(poolId) returns (uint256) {
        return uint256(pools[poolId].state);
    }
    
    /**
     * @dev 获取标的价格 - 对齐V2
     */
    function getUnderlyingPriceView(uint256 poolId) external view poolExists(poolId) returns (uint256[2] memory) {
        require(oracle != address(0), "PoolLendBorrow: oracle not set");
        Pool storage pool = pools[poolId];
        
        // 调用Oracle获取价格
        uint256 settlePrice = IOracle(oracle).getPrice(pool.settleToken);
        uint256 pledgePrice = IOracle(oracle).getPrice(pool.pledgeToken);
        
        return [settlePrice, pledgePrice];
    }

    // ============ Lend功能：借出方逻辑 ============
    
    /**
     * @dev 借出方存款 - 对齐V2的depositLend
     */
    function depositLend(uint256 poolId, uint256 amount) external payable
        nonReentrant notPaused poolExists(poolId) validState(poolId, PoolState.MATCH) 
    {
        require(amount > 0 || msg.value > 0, "PoolLendBorrow: amount must be greater than 0");
        require(block.timestamp < pools[poolId].endTime, "PoolLendBorrow: pool has ended");
        
        Pool storage pool = pools[poolId];
        
        // 处理ETH或ERC20代币
        uint256 actualAmount = _receiveToken(pool.settleToken, msg.sender, amount);
        require(actualAmount >= minAmount, "PoolLendBorrow: less than min amount");
        require(pool.lendSupply + actualAmount <= pool.maxSupply, "PoolLendBorrow: exceeds max supply");
        
        // 检查用户是否已经有借出方存款，如果没有，则添加到lenders列表中
        LendInfo storage lendInfo = lendInfos[poolId][msg.sender];
        if (lendInfo.amount == 0) {
            lenders[poolId].push(msg.sender);
        }
        
        // 更新借出方存款信息
        lendInfo.amount += actualAmount;
        lendInfo.claimed = false;
        lendInfo.refunded = false;
        pool.lendSupply += actualAmount;
        
        emit LendDeposit(poolId, msg.sender, actualAmount);
    }

    /**
     * @dev 借出方退款（结算后有多余资金时）- 对齐V2的refundLend
     */
    function refundLend(uint256 poolId) external nonReentrant notPaused poolExists(poolId) {
        Pool storage pool = pools[poolId];
        require(pool.state == PoolState.EXECUTION || pool.state == PoolState.FINISH || pool.state == PoolState.LIQUIDATION, "PoolLendBorrow: invalid state for refund");
        require(block.timestamp >= pool.settleTime, "PoolLendBorrow: before settle time");
        
        LendInfo storage lendInfo = lendInfos[poolId][msg.sender];
        require(lendInfo.amount > 0, "PoolLendBorrow: no lending position");
        require(!lendInfo.refunded, "PoolLendBorrow: already refunded");
        require(pool.lendSupply > pool.settleAmountLend, "PoolLendBorrow: no refund needed");
        
        // 计算用户份额：用户质押金额 / 总借出供应量
        uint256 userShare = (lendInfo.amount * 1e18) / pool.lendSupply;
        // 计算退款金额 = (总供应 - 结算金额) * 用户份额
        uint256 refundAmount = ((pool.lendSupply - pool.settleAmountLend) * userShare) / 1e18;
        
        require(refundAmount > 0, "PoolLendBorrow: no refund amount");
        lendInfo.refunded = true;
        
        _transferToken(pool.settleToken, msg.sender, refundAmount);
        emit LendDeposit(poolId, msg.sender, refundAmount);
    }

    /**
     * @dev 领取sp代币（债权凭证）- 对齐V2的claimLend
     */
    function claimLend(uint256 poolId) external nonReentrant poolExists(poolId) {
        require(pools[poolId].state == PoolState.EXECUTION || pools[poolId].state == PoolState.FINISH || pools[poolId].state == PoolState.LIQUIDATION, "PoolLendBorrow: invalid state");
        
        LendInfo storage lendInfo = lendInfos[poolId][msg.sender];
        require(lendInfo.amount > 0, "PoolLendBorrow: no lending position");
        require(!lendInfo.claimed, "PoolLendBorrow: already claimed");
        
        Pool storage pool = pools[poolId];
        require(pool.spToken != address(0), "PoolLendBorrow: spToken not set");
        require(pool.lendSupply > 0, "PoolLendBorrow: no lend supply");
        
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

    /**
     * @dev 销毁sp代币，提取本金+利息 - 对齐V2的withdrawLend
     */
    function withdrawLend(uint256 poolId, uint256 spAmount) external nonReentrant poolExists(poolId) {
        require(spAmount > 0, "PoolLendBorrow: spAmount must be greater than 0");
        
        Pool storage pool = pools[poolId];
        require(pool.state == PoolState.FINISH || pool.state == PoolState.LIQUIDATION, "PoolLendBorrow: invalid state");
        require(pool.spToken != address(0), "PoolLendBorrow: spToken not set");
        
        // 销毁用户的sp代币
        IDebtToken(pool.spToken).burn(msg.sender, spAmount);
        
        // 计算sp份额：销毁的sp数量 / sp总量（settleAmountLend）
        uint256 spShare = (spAmount * 1e18) / pool.settleAmountLend;
        
        // 计算赎回金额
        uint256 redeemAmount;
        if (pool.state == PoolState.FINISH) {
            require(block.timestamp > pool.endTime, "PoolLendBorrow: pool not ended");
            // 完成状态：赎回金额 = finishAmountLend * sp份额
            redeemAmount = (pool.finishAmountLend * spShare) / 1e18;
        } else if (pool.state == PoolState.LIQUIDATION) {
            require(block.timestamp > pool.settleTime, "PoolLendBorrow: before settle time");
            // 清算状态：赎回金额 = liquidationAmountLend * sp份额
            redeemAmount = (pool.liquidationAmountLend * spShare) / 1e18;
        }
        
        require(redeemAmount > 0, "PoolLendBorrow: no amount to redeem");
        _transferToken(pool.settleToken, msg.sender, redeemAmount);
        
        emit SpTokenWithdrawn(poolId, msg.sender, spAmount, redeemAmount);
    }

    /**
     * @dev 紧急提取借出 - 对齐V2的emergencyLendWithdrawal
     */
    function emergencyLendWithdrawal(uint256 poolId) external nonReentrant notPaused poolExists(poolId) {
        Pool storage pool = pools[poolId];
        require(pool.state == PoolState.UNDONE, "PoolLendBorrow: pool not undone");
        require(pool.lendSupply > 0, "PoolLendBorrow: no lend supply");
        
        LendInfo storage lendInfo = lendInfos[poolId][msg.sender];
        require(lendInfo.amount > 0, "PoolLendBorrow: no lending position");
        require(!lendInfo.refunded, "PoolLendBorrow: already refunded");
        
        uint256 refundAmount = lendInfo.amount;
        lendInfo.refunded = true;
        
        _transferToken(pool.settleToken, msg.sender, refundAmount);
        emit EmergencyLendWithdrawal(msg.sender, poolId, refundAmount);
    }

    /**
     * @dev 获取借出方信息
     */
    function getLendInfo(uint256 poolId, address lender) external view poolExists(poolId) returns (LendInfo memory) {
        return lendInfos[poolId][lender];
    }

    /**
     * @dev 获取池子借出方列表
     */
    function getPoolLenders(uint256 poolId) external view poolExists(poolId) returns (address[] memory) {
        return lenders[poolId];
    }

    // ============ Borrow功能：借入方逻辑 ============
    
    /**
     * @dev 质押资产借入 - 对齐V2的depositBorrow
     */
    function depositBorrow(uint256 poolId, uint256 pledgeAmount) external payable 
        nonReentrant notPaused poolExists(poolId) validState(poolId, PoolState.MATCH) timeBefore(poolId)
    {
        require(pledgeAmount > 0 || msg.value > 0, "PoolLendBorrow: amount must be greater than 0");
        
        Pool storage pool = pools[poolId];
        BorrowInfo storage borrowInfo = borrowInfos[poolId][msg.sender];

        // 处理ETH或ERC20代币
        uint256 actualAmount = _receiveToken(pool.pledgeToken, msg.sender, pledgeAmount);

        // 更新用户信息
        if (borrowInfo.pledgeAmount == 0) {
            // 首次质押，添加到借入方列表
            borrowers[poolId].push(msg.sender);
        }
        borrowInfo.pledgeAmount += actualAmount;
        borrowInfo.settled = false;
        borrowInfo.liquidated = false;
        
        // 更新借入供应量
        pool.borrowSupply += actualAmount;

        emit DepositBorrow(msg.sender, poolId, pool.pledgeToken, actualAmount);
    }

    /**
     * @dev 借入方退款（结算后有多余质押时）- 对齐V2的refundBorrow
     */
    function refundBorrow(uint256 poolId) external nonReentrant notPaused poolExists(poolId) {
        Pool storage pool = pools[poolId];
        BorrowInfo storage borrowInfo = borrowInfos[poolId][msg.sender];

        require(borrowInfo.pledgeAmount > 0, "PoolLendBorrow: no pledge to refund");
        require(!borrowInfo.settled, "PoolLendBorrow: already settled");
        require(pool.state == PoolState.EXECUTION || pool.state == PoolState.FINISH || pool.state == PoolState.LIQUIDATION, "PoolLendBorrow: invalid state");
        require(pool.borrowSupply > pool.settleAmountBorrow, "PoolLendBorrow: no refund needed");
        require(block.timestamp >= pool.settleTime, "PoolLendBorrow: before settle time");

        // 计算用户份额
        uint256 userShare = (borrowInfo.pledgeAmount * 1e18) / pool.borrowSupply;
        // 计算退款金额
        uint256 refundAmount = ((pool.borrowSupply - pool.settleAmountBorrow) * userShare) / 1e18;
        
        require(refundAmount > 0, "PoolLendBorrow: no refund amount");

        // 退还质押资产
        _transferToken(pool.pledgeToken, msg.sender, refundAmount);

        borrowInfo.settled = true; // 标记为已处理

        emit RefundBorrow(msg.sender, poolId, pool.pledgeToken, refundAmount);
    }

    /**
     * @dev 领取借入（获得jpToken凭证 + 借入资金）- 对齐V2的claimBorrow
     */
    function claimBorrow(uint256 poolId) external
        nonReentrant notPaused poolExists(poolId)
    {
        Pool storage pool = pools[poolId];
        BorrowInfo storage borrowInfo = borrowInfos[poolId][msg.sender];

        require(borrowInfo.pledgeAmount > 0, "PoolLendBorrow: no pledge to claim");
        require(!borrowInfo.settled, "PoolLendBorrow: already claimed");
        require(pool.state == PoolState.EXECUTION || pool.state == PoolState.FINISH || pool.state == PoolState.LIQUIDATION, "PoolLendBorrow: invalid state");
        require(block.timestamp >= pool.settleTime, "PoolLendBorrow: before settle time");

        // 计算用户份额
        uint256 userShare = (borrowInfo.pledgeAmount * 1e18) / pool.borrowSupply;
        // 计算jp代币数量 = settleAmountLend * martgageRate * 用户份额
        uint256 totalJpAmount = (pool.settleAmountLend * pool.pledgeRate) / RATE_BASE;
        uint256 jpAmount = (totalJpAmount * userShare) / 1e18;
        
        // 铸造jpToken给用户
        if (pool.jpToken != address(0)) {
            IDebtToken(pool.jpToken).mint(msg.sender, jpAmount);
        }

        // 计算借入金额 = settleAmountLend * 用户份额
        uint256 borrowAmount = (pool.settleAmountLend * userShare) / 1e18;
        
        // 转移借入资金给用户
        if (borrowAmount > 0) {
            _transferToken(pool.settleToken, msg.sender, borrowAmount);
        }

        // 更新用户状态
        borrowInfo.borrowAmount = borrowAmount;
        borrowInfo.settled = true;

        emit ClaimBorrow(msg.sender, poolId, pool.jpToken, jpAmount, borrowAmount);
    }

    /**
     * @dev 提取质押资产（销毁jpToken）- 对齐V2的withdrawBorrow
     */
    function withdrawBorrow(uint256 poolId, uint256 jpAmount) external payable
        nonReentrant notPaused poolExists(poolId)
    {
        require(jpAmount > 0, "PoolLendBorrow: jpAmount must be greater than 0");

        Pool storage pool = pools[poolId];
        require(pool.state == PoolState.FINISH || pool.state == PoolState.LIQUIDATION, "PoolLendBorrow: invalid state");
        
        // 销毁用户的jpToken
        if (pool.jpToken != address(0)) {
            IDebtToken(pool.jpToken).burn(msg.sender, jpAmount);
        }

        // 计算jp份额
        uint256 totalJpAmount = (pool.settleAmountLend * pool.pledgeRate) / RATE_BASE;
        uint256 jpShare = (jpAmount * 1e18) / totalJpAmount;
        
        uint256 redeemAmount;
        if (pool.state == PoolState.FINISH) {
            require(block.timestamp > pool.endTime, "PoolLendBorrow: not yet finished");
            // 完成状态：赎回金额 = finishAmountBorrow * jp份额
            redeemAmount = (pool.finishAmountBorrow * jpShare) / 1e18;
        } else if (pool.state == PoolState.LIQUIDATION) {
            require(block.timestamp > pool.settleTime, "PoolLendBorrow: before settle time");
            // 清算状态：赎回金额 = liquidationAmountBorrow * jp份额
            redeemAmount = (pool.liquidationAmountBorrow * jpShare) / 1e18;
        }

        if (redeemAmount > 0) {
            _transferToken(pool.pledgeToken, msg.sender, redeemAmount);
        }

        emit WithdrawBorrow(msg.sender, poolId, pool.pledgeToken, redeemAmount, jpAmount);
    }

    /**
     * @dev 紧急提取借入 - 对齐V2的emergencyBorrowWithdrawal
     */
    function emergencyBorrowWithdrawal(uint256 poolId) external nonReentrant notPaused poolExists(poolId) {
        Pool storage pool = pools[poolId];
        require(pool.state == PoolState.UNDONE, "PoolLendBorrow: pool not undone");
        require(pool.borrowSupply > 0, "PoolLendBorrow: no borrow supply");
        
        BorrowInfo storage borrowInfo = borrowInfos[poolId][msg.sender];
        require(borrowInfo.pledgeAmount > 0, "PoolLendBorrow: no pledge");
        require(!borrowInfo.settled, "PoolLendBorrow: already settled");
        
        uint256 refundAmount = borrowInfo.pledgeAmount;
        borrowInfo.settled = true;
        
        _transferToken(pool.pledgeToken, msg.sender, refundAmount);
        emit EmergencyBorrowWithdrawal(msg.sender, poolId, refundAmount);
    }

    /**
     * @dev 获取用户借入信息
     */
    function getUserBorrowInfo(address user, uint256 poolId) external view poolExists(poolId) returns (BorrowInfo memory){
        return borrowInfos[poolId][user];
    }

    /**
     * @dev 获取池子的借入方列表
     */
    function getPoolBorrowers(uint256 poolId) external view poolExists(poolId) returns (address[] memory) {
        return borrowers[poolId];
    }

    // ============ 内部事件定义 ============
    
    event DepositBorrow(address indexed user, uint256 indexed poolId, address indexed token, uint256 amount);
    event ClaimBorrow(address indexed user, uint256 indexed poolId, address indexed jpToken, uint256 jpAmount, uint256 borrowAmount);
    event WithdrawBorrow(address indexed user, uint256 indexed poolId, address indexed token, uint256 amount, uint256 jpBurnAmount);
    event RefundBorrow(address indexed user, uint256 indexed poolId, address indexed token, uint256 refundAmount);
}
