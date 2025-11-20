// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./PoolSwap.sol";

/**
 * @title PoolFee
 * @dev 费用管理功能
 */
contract PoolFee is PoolSwap {
    using SafeERC20 for IERC20;

    /**
     * @dev 设置费率
     */
    function setFee(uint256 _lendFee, uint256 _borrowFee) external onlyAdmin {
        require(_lendFee <= MAX_FEE_RATE, "PoolFee: lend fee too high");
        require(_borrowFee <= MAX_FEE_RATE, "PoolFee: borrow fee too high");
        lendFee = _lendFee;
        borrowFee = _borrowFee;
        emit SetFee(_lendFee, _borrowFee);
    }

    /**
     * @dev 设置费用接收地址
     */
    function setFeeAddress(address payable _feeAddress) external onlyAdmin {
        require(_feeAddress != address(0), "PoolFee: invalid fee address");
        address oldAddress = feeAddress;
        feeAddress = _feeAddress;
        emit SetFeeAddress(oldAddress, _feeAddress);
    }

    /**
     * @dev 设置最小金额
     */
    function setMinAmount(uint256 _minAmount) external onlyAdmin {
        uint256 oldAmount = minAmount;
        minAmount = _minAmount;
        emit SetMinAmount(oldAmount, _minAmount);
    }

    /**
     * @dev 设置全局暂停
     */
    function setPause(bool _paused) external onlyAdmin {
        globalPaused = _paused;
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

    /**
     * @dev 获取费用配置
     */
    function getFeeConfig() external view returns (
        uint256 _lendFee,
        uint256 _borrowFee,
        address _feeAddress,
        uint256 _minAmount,
        bool _globalPaused
    ) {
        return (lendFee, borrowFee, feeAddress, minAmount, globalPaused);
    }
}
