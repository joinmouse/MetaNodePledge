// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../library/AddressArrayLib.sol";

/**
 * @title MultiSigWallet - 多签钱包（独立版本）
 * @notice 提供多签验证服务，供其他合约通过MultiSigClient使用
 * @dev 使用hash索引机制，节省gas消耗
 * 
 * 🎯 核心职责：
 * 1. 管理多签所有者列表
 * 2. 处理签名申请的创建/签名/撤销
 * 3. 为外部合约提供签名验证接口（getValidSignature）
 * 4. 保护自身的关键操作（如transferOwner）
 */
contract MultiSigWallet {
    using AddressArrayLib for address[];
    
    // ============ 状态变量 ============
    uint256 private constant DEFAULT_INDEX = 0;  // 默认索引值
    
    address[] public signatureOwners;  // 多签所有者列表
    uint256 public threshold;          // 签名阈值
    
    /// @notice 签名申请信息
    struct SignatureInfo {
        address applicant;      // 申请人
        address[] signatures;   // 已签名的owner列表
    }
    
    // 申请hash => 申请信息数组
    mapping(bytes32 => SignatureInfo[]) public signatureMap;
    
    // ============ 事件 ============
    event TransferOwner(address indexed sender, address indexed oldOwner, address indexed newOwner);
    event CreateApplication(address indexed from, address indexed to, bytes32 indexed msgHash);
    event SignApplication(address indexed from, bytes32 indexed msgHash, uint256 index);
    event RevokeApplication(address indexed from, bytes32 indexed msgHash, uint256 index);
    
    // ============ 构造函数 ============
    constructor(address[] memory owners, uint256 limitedSignNum) {
        require(owners.length > 0, "MultiSigWallet: owners required");
        require(
            limitedSignNum > 0 && limitedSignNum <= owners.length, 
            "MultiSigWallet: invalid threshold"
        );
        
        // 验证owners的有效性和唯一性
        for (uint256 i = 0; i < owners.length; i++) {
            require(owners[i] != address(0), "MultiSigWallet: invalid owner");
            // 检查重复（简单方式）
            for (uint256 j = i + 1; j < owners.length; j++) {
                require(owners[i] != owners[j], "MultiSigWallet: duplicate owner");
            }
        }
        
        signatureOwners = owners;
        threshold = limitedSignNum;
    }
    
    // ============ Owner管理 ============
    /// @notice 转移owner权限
    /// @dev 任何owner都可以调用，实际使用中可通过链下协商决定
    function transferOwner(uint256 index, address newOwner) public onlyOwner {
        require(index < signatureOwners.length, "MultiSigWallet: index overflow");

        address oldOwner = signatureOwners[index];
        signatureOwners[index] = newOwner;
        
        emit TransferOwner(msg.sender, oldOwner, newOwner);
    }
    
    // ============ 多签流程 ============
    /// @notice 创建多签申请
    function createApplication(address to) external returns (uint256) {
        bytes32 msgHash = getApplicationHash(msg.sender, to);  // 计算申请hash
        uint256 index = signatureMap[msgHash].length;
        signatureMap[msgHash].push(SignatureInfo(msg.sender, new address[](0)));

        emit CreateApplication(msg.sender, to, msgHash);
        return index;
    }
    
    /// @notice 签名申请
    function signApplication(bytes32 msgHash) external onlyOwner validIndex(msgHash, DEFAULT_INDEX) {
        SignatureInfo storage info = signatureMap[msgHash][DEFAULT_INDEX];
        
        // 检查是否已经签名（防止重复）
        require(
            !info.signatures.contains(msg.sender),
            "MultiSigWallet: already signed"
        );
        
        info.signatures.push(msg.sender);
        emit SignApplication(msg.sender, msgHash, DEFAULT_INDEX);
    }
    
    /// @notice 撤销签名
    function revokeSignApplication(bytes32 msgHash) 
        external 
        onlyOwner 
        validIndex(msgHash, DEFAULT_INDEX) 
    {
        SignatureInfo storage info = signatureMap[msgHash][DEFAULT_INDEX];
        
        // 检查是否已经签名
        require(
            info.signatures.contains(msg.sender),
            "MultiSigWallet: not signed yet"
        );
        
        bool removed = info.signatures.removeAddress(msg.sender);
        require(removed, "MultiSigWallet: revoke failed");
        
        emit RevokeApplication(msg.sender, msgHash, DEFAULT_INDEX);
    }
    
    // ============ 查询函数 ============
    
    /// @notice 获取有效签名的索引（供MultiSigClient调用）
    /// @dev 返回值：0表示无有效签名，>0表示找到有效签名的索引+1
    /// @param msgHash 申请的hash
    /// @param lastIndex 开始搜索的索引
    /// @return 有效签名的索引+1，如果没有则返回0
    function getValidSignature(bytes32 msgHash, uint256 lastIndex) external view returns (uint256) {
        SignatureInfo[] storage info = signatureMap[msgHash];
        
        // 边界检查
        if (info.length == 0 || lastIndex >= info.length) {
            return 0;
        }
        
        // 从lastIndex开始查找达到阈值的申请
        for (uint256 i = lastIndex; i < info.length; i++) {
            if (info[i].signatures.length >= threshold) {
                return i + 1;  // 返回索引+1，0表示未找到
            }
        }
        
        return 0;  // 未找到有效签名
    }
    
    /// @notice 获取申请详情
    function getApplicationInfo(bytes32 msgHash, uint256 index) public view validIndex(msgHash, index) returns (address, address[] memory) {
        SignatureInfo memory info = signatureMap[msgHash][index];
        return (info.applicant, info.signatures);
    }
    /// @notice 获取申请数量
    function getApplicationCount(bytes32 msgHash) public view returns (uint256) {
        return signatureMap[msgHash].length;
    }
    /// @notice 计算申请hash
    function getApplicationHash(address from, address to) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(from, to));
    }
    
    // ============ 修饰器 ============
    modifier onlyOwner() {
        require(
            signatureOwners.contains(msg.sender), 
            "MultiSigWallet: caller is not owner"
        );
        _;
    }
    
    modifier validIndex(bytes32 msgHash, uint256 index) {
        require(
            index < signatureMap[msgHash].length, 
            "MultiSigWallet: index overflow"
        );
        _;
    }
}
