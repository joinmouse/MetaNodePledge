-- =====================================================
-- PledgePool 合约地址更新脚本
-- =====================================================
-- 
-- 功能：更新数据库中 BSC 测试网的 PledgePool 合约地址
-- 
-- 使用方法：
-- 1. 将下面的 'YOUR_PLEDGE_POOL_ADDRESS' 替换为实际部署的合约地址
-- 2. 通过 Docker 执行：
--    docker exec -i pledge-mysql mysql -uroot -proot123 pledge_v21 < update_pledge_pool_address.sql
-- 
-- =====================================================

-- 显示当前配置
SELECT '当前 BSC 测试网配置：' as info;
SELECT id, pool_name, pool_address, chain_id, lend_token, lend_token_symbol
FROM poolbases 
WHERE chain_id = '97'
LIMIT 5;

-- 备份当前数据（可选，建议执行）
-- CREATE TABLE IF NOT EXISTS poolbases_backup_20251219 AS 
-- SELECT * FROM poolbases WHERE chain_id = '97';

-- 更新 PledgePool 合约地址
-- 注意：请将 'YOUR_PLEDGE_POOL_ADDRESS' 替换为实际部署的地址
UPDATE poolbases 
SET pool_address = 'YOUR_PLEDGE_POOL_ADDRESS',
    updated_at = NOW()
WHERE chain_id = '97';

-- 验证更新结果
SELECT '更新后的配置：' as info;
SELECT id, pool_name, pool_address, chain_id, lend_token, lend_token_symbol
FROM poolbases 
WHERE chain_id = '97'
LIMIT 5;

-- 显示更新的记录数
SELECT CONCAT('✅ 成功更新 ', COUNT(*), ' 条记录') as result
FROM poolbases 
WHERE chain_id = '97' AND pool_address = 'YOUR_PLEDGE_POOL_ADDRESS';

-- =====================================================
-- 回滚语句（如需要，取消注释并填入旧地址）
-- =====================================================
-- UPDATE poolbases 
-- SET pool_address = 'OLD_PLEDGE_POOL_ADDRESS',
--     updated_at = NOW()
-- WHERE chain_id = '97';
-- =====================================================
