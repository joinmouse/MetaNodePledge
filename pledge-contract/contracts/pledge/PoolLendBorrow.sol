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
 */
contract PoolLendBorrow is PoolStorage, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Admin功能 ============
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

    function setPoolState(uint256 poolId, PoolState newState) external onlyAdmin poolExists(poolId) {
        PoolState oldState = pools[poolId].state;
        pools[poolId].state = newState;
        emit PoolStateChanged(poolId, oldState, newState);
    }

    function setOracle(address _oracle) external onlyAdmin {
        require(_oracle != address(0), "PoolLendBorrow: invalid oracle address");
        oracle = _oracle;
    }

    function setDebtToken(address _debtToken) external onlyAdmin {
        require(_debtToken != address(0), "PoolLendBorrow: invalid debt token address");
        debtToken = _debtToken;
    }

    function setPoolSpToken(uint256 poolId, address _spToken) public onlyAdmin poolExists(poolId) {
        require(_spToken != address(0), "PoolLendBorrow: invalid sp token address");
        pools[poolId].spToken = _spToken;
    }

    function setPoolJpToken(uint256 poolId, address _jpToken) public onlyAdmin poolExists(poolId) {
        require(_jpToken != address(0), "PoolLendBorrow: invalid jp token address");
        pools[poolId].jpToken = _jpToken;
    }

    function getPoolInfo(uint256 poolId) external view poolExists(poolId) returns (Pool memory) {
        return pools[poolId];
    }

    function getPoolsLength() public view returns (uint256) {
        return poolCounter;
    }

    function getPoolState(uint256 poolId) external view poolExists(poolId) returns (uint256) {
        return uint256(pools[poolId].state);
    }

    function getUnderlyingPriceView(uint256 poolId) external view poolExists(poolId) returns (uint256[2] memory) {
        require(oracle != address(0), "PoolLendBorrow: oracle not set");
        Pool storage pool = pools[poolId];
        return [IOracle(oracle).getPrice(pool.settleToken), IOracle(oracle).getPrice(pool.pledgeToken)];
    }

    // ============ Lend功能 ============
    function depositLend(uint256 poolId, uint256 amount) external payable
        nonReentrant notPaused poolExists(poolId) validState(poolId, PoolState.MATCH) 
    {
        require(amount > 0 || msg.value > 0, "PoolLendBorrow: amount must be greater than 0");
        require(block.timestamp < pools[poolId].endTime, "PoolLendBorrow: pool has ended");
        
        Pool storage pool = pools[poolId];
        uint256 actualAmount = _receiveToken(pool.settleToken, msg.sender, amount);
        require(actualAmount >= minAmount, "PoolLendBorrow: less than min amount");
        require(pool.lendSupply + actualAmount <= pool.maxSupply, "PoolLendBorrow: exceeds max supply");
        
        LendInfo storage lendInfo = lendInfos[poolId][msg.sender];
        if (lendInfo.amount == 0) {
            lenders[poolId].push(msg.sender);
        }
        lendInfo.amount += actualAmount;
        lendInfo.claimed = false;
        lendInfo.refunded = false;
        pool.lendSupply += actualAmount;
        
        emit LendDeposit(poolId, msg.sender, actualAmount);
    }

    function refundLend(uint256 poolId) external nonReentrant notPaused poolExists(poolId) {
        Pool storage pool = pools[poolId];
        require(pool.state == PoolState.EXECUTION || pool.state == PoolState.FINISH || pool.state == PoolState.LIQUIDATION, "PoolLendBorrow: invalid state for refund");
        require(block.timestamp >= pool.settleTime, "PoolLendBorrow: before settle time");
        
        LendInfo storage lendInfo = lendInfos[poolId][msg.sender];
        require(lendInfo.amount > 0, "PoolLendBorrow: no lending position");
        require(!lendInfo.refunded, "PoolLendBorrow: already refunded");
        require(pool.lendSupply > pool.settleAmountLend, "PoolLendBorrow: no refund needed");
        
        uint256 refundAmount = ((pool.lendSupply - pool.settleAmountLend) * lendInfo.amount) / pool.lendSupply;
        
        require(refundAmount > 0, "PoolLendBorrow: no refund amount");
        lendInfo.refunded = true;
        
        _transferToken(pool.settleToken, msg.sender, refundAmount);
        emit LendDeposit(poolId, msg.sender, refundAmount);
    }

    function claimLend(uint256 poolId) external nonReentrant poolExists(poolId) {
        require(pools[poolId].state == PoolState.EXECUTION || pools[poolId].state == PoolState.FINISH || pools[poolId].state == PoolState.LIQUIDATION, "PoolLendBorrow: invalid state");
        
        LendInfo storage lendInfo = lendInfos[poolId][msg.sender];
        require(lendInfo.amount > 0, "PoolLendBorrow: no lending position");
        require(!lendInfo.claimed, "PoolLendBorrow: already claimed");
        
        Pool storage pool = pools[poolId];
        require(pool.spToken != address(0), "PoolLendBorrow: spToken not set");
        require(pool.lendSupply > 0, "PoolLendBorrow: no lend supply");
        
        uint256 spAmount = (pool.settleAmountLend * lendInfo.amount) / pool.lendSupply;
        IDebtToken(pool.spToken).mint(msg.sender, spAmount);
        lendInfo.claimed = true;
        lendInfo.lendAmount = spAmount;
        
        emit SpTokenClaimed(poolId, msg.sender, spAmount);
    }

    function withdrawLend(uint256 poolId, uint256 spAmount) external nonReentrant poolExists(poolId) {
        require(spAmount > 0, "PoolLendBorrow: spAmount must be greater than 0");
        
        Pool storage pool = pools[poolId];
        require(pool.state == PoolState.FINISH || pool.state == PoolState.LIQUIDATION, "PoolLendBorrow: invalid state");
        require(pool.spToken != address(0), "PoolLendBorrow: spToken not set");
        
        IDebtToken(pool.spToken).burn(msg.sender, spAmount);
        uint256 redeemAmount;
        if (pool.state == PoolState.FINISH) {
            require(block.timestamp > pool.endTime, "PoolLendBorrow: pool not ended");
            redeemAmount = (pool.finishAmountLend * spAmount) / pool.settleAmountLend;
        } else {
            require(block.timestamp > pool.settleTime, "PoolLendBorrow: before settle time");
            redeemAmount = (pool.liquidationAmountLend * spAmount) / pool.settleAmountLend;
        }
        
        require(redeemAmount > 0, "PoolLendBorrow: no amount to redeem");
        _transferToken(pool.settleToken, msg.sender, redeemAmount);
        
        emit SpTokenWithdrawn(poolId, msg.sender, spAmount, redeemAmount);
    }

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

    function getLendInfo(uint256 poolId, address lender) external view poolExists(poolId) returns (LendInfo memory) {
        return lendInfos[poolId][lender];
    }

    function getPoolLenders(uint256 poolId) external view poolExists(poolId) returns (address[] memory) {
        return lenders[poolId];
    }

    // ============ Borrow功能 ============
    function depositBorrow(uint256 poolId, uint256 pledgeAmount) external payable
        nonReentrant notPaused poolExists(poolId) validState(poolId, PoolState.MATCH) timeBefore(poolId)
    {
        require(pledgeAmount > 0 || msg.value > 0, "PoolLendBorrow: amount must be greater than 0");
        
        Pool storage pool = pools[poolId];
        BorrowInfo storage borrowInfo = borrowInfos[poolId][msg.sender];
        uint256 actualAmount = _receiveToken(pool.pledgeToken, msg.sender, pledgeAmount);

        if (borrowInfo.pledgeAmount == 0) borrowers[poolId].push(msg.sender);
        borrowInfo.pledgeAmount += actualAmount;
        borrowInfo.settled = false;
        borrowInfo.liquidated = false;
        pool.borrowSupply += actualAmount;

        emit DepositBorrow(msg.sender, poolId, pool.pledgeToken, actualAmount);
    }

    function refundBorrow(uint256 poolId) external nonReentrant notPaused poolExists(poolId) {
        Pool storage pool = pools[poolId];
        BorrowInfo storage borrowInfo = borrowInfos[poolId][msg.sender];

        require(borrowInfo.pledgeAmount > 0, "PoolLendBorrow: no pledge to refund");
        require(!borrowInfo.settled, "PoolLendBorrow: already settled");
        require(pool.state == PoolState.EXECUTION || pool.state == PoolState.FINISH || pool.state == PoolState.LIQUIDATION, "PoolLendBorrow: invalid state");
        require(pool.borrowSupply > pool.settleAmountBorrow, "PoolLendBorrow: no refund needed");
        require(block.timestamp >= pool.settleTime, "PoolLendBorrow: before settle time");

        uint256 refundAmount = ((pool.borrowSupply - pool.settleAmountBorrow) * borrowInfo.pledgeAmount) / pool.borrowSupply;
        
        require(refundAmount > 0, "PoolLendBorrow: no refund amount");
        _transferToken(pool.pledgeToken, msg.sender, refundAmount);
        borrowInfo.settled = true;

        emit RefundBorrow(msg.sender, poolId, pool.pledgeToken, refundAmount);
    }

    function claimBorrow(uint256 poolId) external nonReentrant notPaused poolExists(poolId) {
        Pool storage pool = pools[poolId];
        BorrowInfo storage borrowInfo = borrowInfos[poolId][msg.sender];

        require(borrowInfo.pledgeAmount > 0, "PoolLendBorrow: no pledge to claim");
        require(!borrowInfo.settled, "PoolLendBorrow: already claimed");
        require(pool.state == PoolState.EXECUTION || pool.state == PoolState.FINISH || pool.state == PoolState.LIQUIDATION, "PoolLendBorrow: invalid state");
        require(block.timestamp >= pool.settleTime, "PoolLendBorrow: before settle time");

        uint256 jpAmount = (pool.settleAmountLend * pool.pledgeRate * borrowInfo.pledgeAmount) / (RATE_BASE * pool.borrowSupply);
        
        if (pool.jpToken != address(0)) IDebtToken(pool.jpToken).mint(msg.sender, jpAmount);

        uint256 borrowAmount = (pool.settleAmountLend * borrowInfo.pledgeAmount) / pool.borrowSupply;
        if (borrowAmount > 0) _transferToken(pool.settleToken, msg.sender, borrowAmount);
        borrowInfo.borrowAmount = borrowAmount;
        borrowInfo.settled = true;

        emit ClaimBorrow(msg.sender, poolId, pool.jpToken, jpAmount, borrowAmount);
    }

    function withdrawBorrow(uint256 poolId, uint256 jpAmount) external payable nonReentrant notPaused poolExists(poolId) {
        require(jpAmount > 0, "PoolLendBorrow: jpAmount must be greater than 0");

        Pool storage pool = pools[poolId];
        require(pool.state == PoolState.FINISH || pool.state == PoolState.LIQUIDATION, "PoolLendBorrow: invalid state");
        
        if (pool.jpToken != address(0)) IDebtToken(pool.jpToken).burn(msg.sender, jpAmount);

        uint256 totalJpAmount = (pool.settleAmountLend * pool.pledgeRate) / RATE_BASE;
        uint256 redeemAmount;
        if (pool.state == PoolState.FINISH) {
            require(block.timestamp > pool.endTime, "PoolLendBorrow: not yet finished");
            redeemAmount = (pool.finishAmountBorrow * jpAmount) / totalJpAmount;
        } else {
            require(block.timestamp > pool.settleTime, "PoolLendBorrow: before settle time");
            redeemAmount = (pool.liquidationAmountBorrow * jpAmount) / totalJpAmount;
        }

        if (redeemAmount > 0) _transferToken(pool.pledgeToken, msg.sender, redeemAmount);

        emit WithdrawBorrow(msg.sender, poolId, pool.pledgeToken, redeemAmount, jpAmount);
    }

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

    function getUserBorrowInfo(address user, uint256 poolId) external view poolExists(poolId) returns (BorrowInfo memory) {
        return borrowInfos[poolId][user];
    }

    function getPoolBorrowers(uint256 poolId) external view poolExists(poolId) returns (address[] memory) {
        return borrowers[poolId];
    }

    event DepositBorrow(address indexed user, uint256 indexed poolId, address indexed token, uint256 amount);
    event ClaimBorrow(address indexed user, uint256 indexed poolId, address indexed jpToken, uint256 jpAmount, uint256 borrowAmount);
    event WithdrawBorrow(address indexed user, uint256 indexed poolId, address indexed token, uint256 amount, uint256 jpBurnAmount);
    event RefundBorrow(address indexed user, uint256 indexed poolId, address indexed token, uint256 refundAmount);
}
