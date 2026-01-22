-- 添加测试数据 - Live状态的借贷池 (state=0 表示Live)
-- 执行方式: mysql -u root -p pledge_v21 < add_test_pools.sql

-- 获取当前时间戳作为基础
-- settle_time 设置为未来1小时后
-- end_time 设置为7天后

SET @now = UNIX_TIMESTAMP();
SET @settle_time = @now + 3600;  -- 1小时后开始结算
SET @end_time = @now + 604800;   -- 7天后结束

-- =============================================
-- BSC测试网 (chain_id = 97) 的测试池
-- =============================================

-- 1. BUSD池 - 抵押BTC借BUSD (Live状态)
INSERT INTO `poolbases` 
(`settle_time`, `end_time`, `interest_rate`, `max_supply`, `lend_supply`, `borrow_supply`, `martgage_rate`, `lend_token`, `borrow_token`, `state`, `jp_coin`, `sp_coin`, `auto_liquidate_threshold`, `created_at`, `updated_at`, `pool_id`, `borrow_token_info`, `lend_token_info`, `chain_id`, `lend_token_symbol`, `borrow_token_symbol`) 
VALUES
(UNIX_TIMESTAMP() + 3600, UNIX_TIMESTAMP() + 604800, '4000000', '300000000000000000000000', '0', '0', '200000000', '0xE676Dcd74f44023b95E0E2C6436C97991A7497DA', '0xB5514a4FA9dDBb48C3DE215Bc9e52d9fCe2D8658', '0', '0x0000000000000000000000000000000000000001', '0x0000000000000000000000000000000000000002', '30000000', NOW(), NOW(), 100, '{"borrowFee": "250000", "tokenLogo": "https://cryptologos.cc/logos/bitcoin-btc-logo.png", "tokenName": "BTC", "tokenPrice": "4500000000000"}', '{"lendFee": "250000", "tokenLogo": "https://cryptologos.cc/logos/binance-usd-busd-logo.png", "tokenName": "BUSD", "tokenPrice": "100000000"}', '97', 'BUSD', 'BTC');

-- 2. BUSD池 - 抵押ETH借BUSD (Live状态)
INSERT INTO `poolbases` 
(`settle_time`, `end_time`, `interest_rate`, `max_supply`, `lend_supply`, `borrow_supply`, `martgage_rate`, `lend_token`, `borrow_token`, `state`, `jp_coin`, `sp_coin`, `auto_liquidate_threshold`, `created_at`, `updated_at`, `pool_id`, `borrow_token_info`, `lend_token_info`, `chain_id`, `lend_token_symbol`, `borrow_token_symbol`) 
VALUES
(UNIX_TIMESTAMP() + 3600, UNIX_TIMESTAMP() + 172800, '5000000', '100000000000000000000000', '0', '0', '200000000', '0xE676Dcd74f44023b95E0E2C6436C97991A7497DA', '0xB5514a4FA9dDBb48C3DE215Bc9e52d9fCe2D8658', '0', '0x0000000000000000000000000000000000000003', '0x0000000000000000000000000000000000000004', '20000000', NOW(), NOW(), 101, '{"borrowFee": "250000", "tokenLogo": "https://cryptologos.cc/logos/bitcoin-btc-logo.png", "tokenName": "BTC", "tokenPrice": "4500000000000"}', '{"lendFee": "250000", "tokenLogo": "https://cryptologos.cc/logos/binance-usd-busd-logo.png", "tokenName": "BUSD", "tokenPrice": "100000000"}', '97', 'BUSD', 'BTC');

-- 3. DAI池 - 抵押BTC借DAI (Live状态)
INSERT INTO `poolbases` 
(`settle_time`, `end_time`, `interest_rate`, `max_supply`, `lend_supply`, `borrow_supply`, `martgage_rate`, `lend_token`, `borrow_token`, `state`, `jp_coin`, `sp_coin`, `auto_liquidate_threshold`, `created_at`, `updated_at`, `pool_id`, `borrow_token_info`, `lend_token_info`, `chain_id`, `lend_token_symbol`, `borrow_token_symbol`) 
VALUES
(UNIX_TIMESTAMP() + 3600, UNIX_TIMESTAMP() + 604800, '3000000', '500000000000000000000000', '0', '0', '150000000', '0x490BC3FCc845d37C1686044Cd2d6589585DE9B8B', '0xB5514a4FA9dDBb48C3DE215Bc9e52d9fCe2D8658', '0', '0x0000000000000000000000000000000000000005', '0x0000000000000000000000000000000000000006', '25000000', NOW(), NOW(), 102, '{"borrowFee": "250000", "tokenLogo": "https://cryptologos.cc/logos/bitcoin-btc-logo.png", "tokenName": "BTC", "tokenPrice": "4500000000000"}', '{"lendFee": "250000", "tokenLogo": "https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png", "tokenName": "DAI", "tokenPrice": "100000000"}', '97', 'DAI', 'BTC');

-- 4. DAI池 - 抵押CAKE借DAI (Live状态)
INSERT INTO `poolbases` 
(`settle_time`, `end_time`, `interest_rate`, `max_supply`, `lend_supply`, `borrow_supply`, `martgage_rate`, `lend_token`, `borrow_token`, `state`, `jp_coin`, `sp_coin`, `auto_liquidate_threshold`, `created_at`, `updated_at`, `pool_id`, `borrow_token_info`, `lend_token_info`, `chain_id`, `lend_token_symbol`, `borrow_token_symbol`) 
VALUES
(UNIX_TIMESTAMP() + 3600, UNIX_TIMESTAMP() + 259200, '6000000', '200000000000000000000000', '0', '0', '250000000', '0x490BC3FCc845d37C1686044Cd2d6589585DE9B8B', '0xEAEd08168a2D34Ae2B9ea1c1f920E0BC00F9fA67', '0', '0x0000000000000000000000000000000000000007', '0x0000000000000000000000000000000000000008', '30000000', NOW(), NOW(), 103, '{"borrowFee": "250000", "tokenLogo": "https://cryptologos.cc/logos/pancakeswap-cake-logo.png", "tokenName": "CAKE", "tokenPrice": "500000000"}', '{"lendFee": "250000", "tokenLogo": "https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png", "tokenName": "DAI", "tokenPrice": "100000000"}', '97', 'DAI', 'CAKE');

-- =============================================
-- BSC主网 (chain_id = 56) 的测试池
-- =============================================

-- 5. BUSD池(主网) - 抵押BTC借BUSD (Live状态)
INSERT INTO `poolbases` 
(`settle_time`, `end_time`, `interest_rate`, `max_supply`, `lend_supply`, `borrow_supply`, `martgage_rate`, `lend_token`, `borrow_token`, `state`, `jp_coin`, `sp_coin`, `auto_liquidate_threshold`, `created_at`, `updated_at`, `pool_id`, `borrow_token_info`, `lend_token_info`, `chain_id`, `lend_token_symbol`, `borrow_token_symbol`) 
VALUES
(UNIX_TIMESTAMP() + 3600, UNIX_TIMESTAMP() + 604800, '4000000', '300000000000000000000000', '0', '0', '200000000', '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', '0', '0x0000000000000000000000000000000000000009', '0x000000000000000000000000000000000000000A', '30000000', NOW(), NOW(), 100, '{"borrowFee": "250000", "tokenLogo": "https://cryptologos.cc/logos/bitcoin-btc-logo.png", "tokenName": "BTC", "tokenPrice": "4500000000000"}', '{"lendFee": "250000", "tokenLogo": "https://cryptologos.cc/logos/binance-usd-busd-logo.png", "tokenName": "BUSD", "tokenPrice": "100000000"}', '56', 'BUSD', 'BTC');

-- 6. USDT池(主网) - 抵押BTC借USDT (Live状态)
INSERT INTO `poolbases` 
(`settle_time`, `end_time`, `interest_rate`, `max_supply`, `lend_supply`, `borrow_supply`, `martgage_rate`, `lend_token`, `borrow_token`, `state`, `jp_coin`, `sp_coin`, `auto_liquidate_threshold`, `created_at`, `updated_at`, `pool_id`, `borrow_token_info`, `lend_token_info`, `chain_id`, `lend_token_symbol`, `borrow_token_symbol`) 
VALUES
(UNIX_TIMESTAMP() + 3600, UNIX_TIMESTAMP() + 604800, '5000000', '500000000000000000000000', '0', '0', '180000000', '0x55d398326f99059fF775485246999027B3197955', '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', '0', '0x000000000000000000000000000000000000000B', '0x000000000000000000000000000000000000000C', '25000000', NOW(), NOW(), 101, '{"borrowFee": "250000", "tokenLogo": "https://cryptologos.cc/logos/bitcoin-btc-logo.png", "tokenName": "BTC", "tokenPrice": "4500000000000"}', '{"lendFee": "250000", "tokenLogo": "https://cryptologos.cc/logos/tether-usdt-logo.png", "tokenName": "USDT", "tokenPrice": "100000000"}', '56', 'USDT', 'BTC');

-- 7. USDT池(主网) - 抵押ETH借USDT (Live状态)
INSERT INTO `poolbases` 
(`settle_time`, `end_time`, `interest_rate`, `max_supply`, `lend_supply`, `borrow_supply`, `martgage_rate`, `lend_token`, `borrow_token`, `state`, `jp_coin`, `sp_coin`, `auto_liquidate_threshold`, `created_at`, `updated_at`, `pool_id`, `borrow_token_info`, `lend_token_info`, `chain_id`, `lend_token_symbol`, `borrow_token_symbol`) 
VALUES
(UNIX_TIMESTAMP() + 3600, UNIX_TIMESTAMP() + 172800, '3500000', '200000000000000000000000', '0', '0', '200000000', '0x55d398326f99059fF775485246999027B3197955', '0x2170ed0880ac9a755fd29b2688956bd959f933f8', '0', '0x000000000000000000000000000000000000000D', '0x000000000000000000000000000000000000000E', '20000000', NOW(), NOW(), 102, '{"borrowFee": "250000", "tokenLogo": "https://cryptologos.cc/logos/ethereum-eth-logo.png", "tokenName": "ETH", "tokenPrice": "250000000000"}', '{"lendFee": "250000", "tokenLogo": "https://cryptologos.cc/logos/tether-usdt-logo.png", "tokenName": "USDT", "tokenPrice": "100000000"}', '56', 'USDT', 'ETH');

-- 8. PLGR池(主网) - 抵押BTC借PLGR (Live状态)
INSERT INTO `poolbases` 
(`settle_time`, `end_time`, `interest_rate`, `max_supply`, `lend_supply`, `borrow_supply`, `martgage_rate`, `lend_token`, `borrow_token`, `state`, `jp_coin`, `sp_coin`, `auto_liquidate_threshold`, `created_at`, `updated_at`, `pool_id`, `borrow_token_info`, `lend_token_info`, `chain_id`, `lend_token_symbol`, `borrow_token_symbol`) 
VALUES
(UNIX_TIMESTAMP() + 3600, UNIX_TIMESTAMP() + 604800, '8000000', '1000000000000000000000000', '0', '0', '300000000', '0x6Aa91CbfE045f9D154050226fCc830ddbA886CED', '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', '0', '0x000000000000000000000000000000000000000F', '0x0000000000000000000000000000000000000010', '35000000', NOW(), NOW(), 103, '{"borrowFee": "250000", "tokenLogo": "https://cryptologos.cc/logos/bitcoin-btc-logo.png", "tokenName": "BTC", "tokenPrice": "4500000000000"}', '{"lendFee": "250000", "tokenLogo": "https://dev-v2-backend.pledger.finance/storage/img/PLGR.png", "tokenName": "PLGR", "tokenPrice": "10000000"}', '56', 'PLGR', 'BTC');

-- =============================================
-- 为新池子添加 pooldata 记录
-- =============================================

INSERT INTO `pooldata` (`settle_amount_lend`, `settle_amount_borrow`, `finish_amount_lend`, `finish_amount_borrow`, `liquidation_amoun_lend`, `liquidation_amoun_borrow`, `updated_at`, `created_at`, `chain_id`, `pool_id`) VALUES
('0', '0', '0', '0', '0', '0', NOW(), NOW(), '97', '100'),
('0', '0', '0', '0', '0', '0', NOW(), NOW(), '97', '101'),
('0', '0', '0', '0', '0', '0', NOW(), NOW(), '97', '102'),
('0', '0', '0', '0', '0', '0', NOW(), NOW(), '97', '103'),
('0', '0', '0', '0', '0', '0', NOW(), NOW(), '56', '100'),
('0', '0', '0', '0', '0', '0', NOW(), NOW(), '56', '101'),
('0', '0', '0', '0', '0', '0', NOW(), NOW(), '56', '102'),
('0', '0', '0', '0', '0', '0', NOW(), NOW(), '56', '103');

-- 完成
SELECT 'Test pools added successfully!' AS Status;
