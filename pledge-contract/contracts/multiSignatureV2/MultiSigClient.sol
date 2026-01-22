// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IMultiSignature
 * @dev 多签钱包接口 - 用于验证交易是否已获得足够签名
 */
interface IMultiSignature {
    /**
     * @dev 获取有效签名索引
     * @param msghash 交易哈希值
     * @param lastIndex 上次检查的索引
     * @return 新的签名索引（如果大于lastIndex说明已通过多签）
     */
    function getValidSignature(bytes32 msghash, uint256 lastIndex) external view returns(uint256);
}

/**
 * @title MultiSigClient
 * @dev 多签客户端基类 - 其他合约继承此合约后，可以使用 validCall 修饰器来保护关键函数
 * 
 * 🎯 核心思路：
 * 1. 继承此合约的子合约，可以用 validCall 修饰器保护关键函数
 * 2. 被保护的函数调用时，会自动检查是否已在多签钱包中获得足够签名
 * 3. 使用 EIP-1967 存储槽位模式，避免存储冲突
 */
contract MultiSigClient {
    // 📍 多签钱包地址的存储位置（使用 keccak256 生成唯一槽位，避免冲突）
    uint256 private constant MULTI_SIG_POSITION = uint256(keccak256("org.multiSignature.storage"));
    
    // 🔢 默认索引值（用于首次验证）
    uint256 private constant DEFAULT_INDEX = 0;

    // ============ 构造函数 ============
    /**
     * @param multiSignature 多签钱包合约地址
     */
    constructor(address multiSignature) {
        require(multiSignature != address(0),"MultiSigClient: MultiSignature address cannot be zero");
        saveValue(MULTI_SIG_POSITION, uint256(uint160(multiSignature)));
    }

    // 获取多签钱包地址
    function getMultiSignatureAddress() public view returns (address) {
        return address(uint160(getValue(MULTI_SIG_POSITION)));
    }

    // ============ 核心修饰器 ============
    
    // 多签验证修饰器 - 保护关键函数
    modifier validCall() {
        checkMultiSignature();
        _;
    }

    // ============ 内部函数 ============
    
    /**
     * @dev 检查多签验证
     * 
     * 🔍 验证流程：
     * 1. 计算交易哈希：keccak256(调用者地址 + 本合约地址)
     * 2. 向多签钱包查询该交易是否已获得足够签名
     * 3. 如果签名索引 > 默认索引，说明已通过验证
     */
    function checkMultiSignature() internal view {
        // 📝 计算交易唯一标识（调用者 + 合约地址）
        bytes32 msgHash = keccak256(abi.encodePacked(msg.sender, address(this)));
        
        // 🏦 获取多签钱包地址
        address multiSign = getMultiSignatureAddress();
        
        // ✅ 查询该交易的签名状态
        uint256 newIndex = IMultiSignature(multiSign).getValidSignature(msgHash, DEFAULT_INDEX);
        
        // 🚫 如果没有足够签名，交易失败
        require(
            newIndex > DEFAULT_INDEX,
            "MultiSigClient: Transaction not approved by multi-signature"
        );
    }

    /**
     * @dev 保存值到指定存储槽位
     * @param position 存储位置
     * @param value 要保存的值
     * 
     * 💾 使用 assembly 直接操作存储，避免命名冲突
     */
    function saveValue(uint256 position, uint256 value) internal {
        assembly {
            sstore(position, value)
        }
    }

    /**
     * @dev 从指定存储槽位读取值
     * @param position 存储位置
     * @return value 读取的值
     */
    function getValue(uint256 position) internal view returns (uint256 value) {
        assembly {
            value := sload(position)
        }
    }
}
