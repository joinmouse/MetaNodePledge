-- =============================================
-- 更新 BSC 测试网 (chain_id = 97) 池子的 SP/JP Token 地址
-- 执行方式: mysql -u root -p pledge_v21 < update_sp_jp_tokens.sql
-- 部署时间: 2025-12-18
-- =============================================

-- SP-Token 地址 (出借方凭证)
-- SP-BUSD: 0xa4aD829da27A326048FeE8CD7DeC967b7eBCbDED
-- SP-DAI:  0x5e834cEBE830E2CAB24b058B1Eccc1cE16d80B4e
-- SP-USDT: 0x1b4A4f400b00AE18cc1E1967c9aD9Bace22F429D

-- JP-Token 地址 (借款方凭证)
-- JP-BUSD: 0xFE97019fb66de1E8Ee3e5fCAc6189c2ba6F77059
-- JP-DAI:  0x6e41A2E76BA1d500c4569c707C5F2611dB12B393
-- JP-USDT: 0x63e466D034e421499c59EA689f2B9D539EA59198

-- MultiSigWallet: 0x4A14A993dCFdC474713FA545cc6Ed6ea01d1e8B4

-- =============================================
-- 更新 BUSD 池子
-- =============================================
UPDATE poolbases SET 
  state = '0',                                                    -- 设为 Live 状态
  sp_coin = '0xa4aD829da27A326048FeE8CD7DeC967b7eBCbDED',         -- SP-BUSD
  jp_coin = '0xFE97019fb66de1E8Ee3e5fCAc6189c2ba6F77059',         -- JP-BUSD
  settle_time = UNIX_TIMESTAMP() + 86400,                         -- 1天后结算
  end_time = UNIX_TIMESTAMP() + 604800,                           -- 7天后结束
  updated_at = NOW()
WHERE chain_id = '97' AND lend_token_symbol = 'BUSD';

-- =============================================
-- 更新 DAI 池子
-- =============================================
UPDATE poolbases SET 
  state = '0',                                                    -- 设为 Live 状态
  sp_coin = '0x5e834cEBE830E2CAB24b058B1Eccc1cE16d80B4e',         -- SP-DAI
  jp_coin = '0x6e41A2E76BA1d500c4569c707C5F2611dB12B393',         -- JP-DAI
  settle_time = UNIX_TIMESTAMP() + 86400,                         -- 1天后结算
  end_time = UNIX_TIMESTAMP() + 604800,                           -- 7天后结束
  updated_at = NOW()
WHERE chain_id = '97' AND lend_token_symbol = 'DAI';

-- =============================================
-- 更新 USDT 池子
-- =============================================
UPDATE poolbases SET 
  state = '0',                                                    -- 设为 Live 状态
  sp_coin = '0x1b4A4f400b00AE18cc1E1967c9aD9Bace22F429D',         -- SP-USDT
  jp_coin = '0x63e466D034e421499c59EA689f2B9D539EA59198',         -- JP-USDT
  settle_time = UNIX_TIMESTAMP() + 86400,                         -- 1天后结算
  end_time = UNIX_TIMESTAMP() + 604800,                           -- 7天后结束
  updated_at = NOW()
WHERE chain_id = '97' AND lend_token_symbol = 'USDT';

-- =============================================
-- 验证更新结果
-- =============================================
SELECT pool_id, lend_token_symbol, state, sp_coin, jp_coin, 
       FROM_UNIXTIME(settle_time) as settle_time_formatted,
       FROM_UNIXTIME(end_time) as end_time_formatted
FROM poolbases 
WHERE chain_id = '97';
