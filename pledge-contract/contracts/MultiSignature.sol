// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MultiSignature - 极简多签钱包
 * @notice 演示多签治理的核心概念：多人确认后才能执行交易
 * @dev 适合学习使用，代码简洁清晰
 */
contract MultiSignature {
    // ============ 状态变量 ============
    address[] public owners;                    // 所有者列表
    mapping(address => bool) public isOwner;    // 是否为所有者
    uint256 public required;                    // 需要的确认数
    

    // 场景：3个owner的多签钱包，需要2个确认
    // 1. Alice提交交易：转10 ETH给Bob
    // 2. Alice确认 ✓
    // 3. Charlie确认 ✓  (达到2个确认)
    // 4. Alice执行交易 → executed = true ✅
    // 5. Charlie再次尝试执行 → ❌ 被拒绝："tx executed", 没有executed字段 → 10 ETH会被转两次！💸💸
    struct Transaction {
        address to;         // 目标地址
        uint256 value;      // 转账金额
        bytes data;         // 调用数据
        bool executed;      // 是否已执行, 作用是安全锁🔒: 防止重复执行
        uint256 numConfirmations; // 确认数，作用是投票计数器📊: 确保达到门槛才能执行
    }
    
    Transaction[] public transactions;
    mapping(uint256 => mapping(address => bool)) public isConfirmed;
    
    // ============ 事件 ============
    event Submit(uint256 indexed txId);
    event Confirm(address indexed owner, uint256 indexed txId);
    event Execute(uint256 indexed txId);
    event Revoke(address indexed owner, uint256 indexed txId);
    
    // ============ 修饰器 ============
    modifier onlyOwner() {
        require(isOwner[msg.sender], "not owner");
        _;
    }
    modifier txExists(uint256 _txId) {
        require(_txId < transactions.length, "tx not exist");
        _;
    }
    modifier notExecuted(uint256 _txId) {
        require(!transactions[_txId].executed, "tx executed");
        _;
    }
    
    // ============ 构造函数 ============
    constructor(address[] memory _owners, uint256 _required) {
        require(_owners.length > 0, "owners required");
        require(_required > 0 && _required <= _owners.length, "invalid required");
        
        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "invalid owner");
            require(!isOwner[owner], "owner not unique");
            isOwner[owner] = true;
            owners.push(owner);
        }
        required = _required;
    }
    
    // ============ 核心功能 ============
    
    /// @notice 提交新交易
    function submit(address _to, uint256 _value, bytes memory _data) public onlyOwner {
        uint256 txId = transactions.length;
        transactions.push(Transaction({
            to: _to,
            value: _value,
            data: _data,
            executed: false,
            numConfirmations: 0
        }));
        emit Submit(txId);
    }
    
    /// @notice 确认交易
    function confirm(uint256 _txId) public onlyOwner txExists(_txId) notExecuted(_txId) {
        require(!isConfirmed[_txId][msg.sender], "tx confirmed");
        isConfirmed[_txId][msg.sender] = true;
        transactions[_txId].numConfirmations += 1;
        emit Confirm(msg.sender, _txId);
    }
    
    /// @notice 执行交易
    function execute(uint256 _txId) public onlyOwner txExists(_txId) notExecuted(_txId) {
        require(transactions[_txId].numConfirmations >= required, "not enough confirmations");
        Transaction storage transaction = transactions[_txId];
        transaction.executed = true;
        (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "tx failed");
        emit Execute(_txId);
    }
    
    /// @notice 撤销确认
    function revoke(uint256 _txId) public onlyOwner txExists(_txId) notExecuted(_txId) {
        require(isConfirmed[_txId][msg.sender], "tx not confirmed");
        isConfirmed[_txId][msg.sender] = false;
        transactions[_txId].numConfirmations -= 1;
        emit Revoke(msg.sender, _txId);
    }
    
    // ============ 查询函数 ============
    function getTransactionCount() public view returns (uint256) {
        return transactions.length;
    }
    
    receive() external payable {}
}
