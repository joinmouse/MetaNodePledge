-- 修复 BUSD 池子的 lend_token 地址
-- 问题：数据库中配置的是旧的 BUSD 地址，导致前端显示余额为 0
-- 
-- 旧地址: 0xE676Dcd74f44023b95E0E2C6436C97991A7497DA
-- 新地址: 0x3428bFc1AC181205B91AC25B56136f1B59c55ae4 (你部署的测试 BUSD)
--
-- 执行方式: mysql -u root -p pledge_v21 < fix_lend_token_address.sql

-- 更新 BSC 测试网 (chain_id = 97) 的 BUSD 池子
UPDATE poolbases 
SET lend_token = '0x3428bFc1AC181205B91AC25B56136f1B59c55ae4'
WHERE chain_id = '97' 
  AND lend_token_symbol = 'BUSD';

-- 验证更新结果
SELECT pool_id, lend_token_symbol, lend_token, state 
FROM poolbases 
WHERE chain_id = '97' AND lend_token_symbol = 'BUSD';

-- 完成
SELECT 'BUSD lend_token address fixed!' AS Status;
