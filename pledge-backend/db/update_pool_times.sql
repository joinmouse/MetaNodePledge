-- 更新所有BSC测试网和主网pool的时间配置
-- settle_time: 当前时间-1小时（立即可借贷）
-- end_time: 当前时间+7天
-- state: 0 (Live状态)
-- 重置供应量为0

UPDATE poolbases
SET 
    settle_time = UNIX_TIMESTAMP() - 3600,  -- 当前时间-1小时
    end_time = UNIX_TIMESTAMP() + 7 * 24 * 3600,  -- 当前时间+7天
    state = 0,  -- Live状态
    lend_supply = 0,
    borrow_supply = 0
WHERE chain_id IN ('56', '97');

-- 验证更新结果
SELECT 
    chain_id,
    pool_id,
    lend_token_symbol,
    settle_time,
    FROM_UNIXTIME(settle_time) AS settle_time_readable,
    end_time,
    FROM_UNIXTIME(end_time) AS end_time_readable,
    state,
    lend_supply,
    borrow_supply
FROM poolbases
WHERE chain_id IN ('56', '97')
ORDER BY chain_id, pool_id;
