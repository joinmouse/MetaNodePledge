// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../multiSignatureV2/MultiSigClient.sol";

/**
 * @title MockMultiSigWallet
 * @dev Mock 多签钱包 - 用于测试 MultiSigClient
 * 
 * 🎯 作用：模拟多签钱包的行为，方便测试
 */
contract MockMultiSigWallet {
    // 📝 记录每个交易哈希对应的签名索引
    mapping(bytes32 => uint256) private signatureIndexMap;
    
    // 📝 默认签名索引（当 hash 未设置时使用）
    uint256 private defaultSignatureIndex;

    /**
     * @dev 设置默认签名索引（对所有未特别设置的 hash 生效）
     * @param index 签名索引（> 0 表示通过，= 0 表示未通过）
     */
    function setValidSignature(uint256 index) external {
        defaultSignatureIndex = index;
    }
    
    /**
     * @dev 为特定交易哈希设置签名索引
     * @param msghash 交易哈希
     * @param index 签名索引
     */
    function setValidSignatureForHash(bytes32 msghash, uint256 index) external {
        signatureIndexMap[msghash] = index;
    }

    /**
     * @dev 获取有效签名索引（实现 IMultiSignature 接口）
     * @param msghash 交易哈希
     * @return 签名索引
     */
    function getValidSignature(bytes32 msghash, uint256 /* lastIndex */) external view returns(uint256) {
        // 如果为该 hash 设置了特定索引，返回特定索引
        if (signatureIndexMap[msghash] > 0) {
            return signatureIndexMap[msghash];
        }
        // 否则返回默认索引
        return defaultSignatureIndex;
    }
}

/**
 * @title TestMultiSigClient
 * @dev 测试合约 - 继承 MultiSigClient 用于测试
 * 
 * 🎯 作用：提供一个受保护的函数，用于测试 validCall 修饰器
 */
contract TestMultiSigClient is MultiSigClient {
    // 📊 记录调用次数
    uint256 public callCount;
    
    // 📢 事件：受保护的函数被调用
    event ProtectedFunctionCalled(address caller);

    constructor(address multiSignature) MultiSigClient(multiSignature) {}

    /**
     * @dev 受保护的函数 - 需要多签验证
     */
    function protectedFunction() external validCall {
        callCount++;
        emit ProtectedFunctionCalled(msg.sender);
    }
}
