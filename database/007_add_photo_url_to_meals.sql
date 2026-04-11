-- ========================================
-- 为 meals 表添加 photo_url 字段
-- ========================================

-- 检查字段是否存在，如果不存在则添加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'meals' AND column_name = 'photo_url'
    ) THEN
        ALTER TABLE meals ADD COLUMN photo_url TEXT;
        RAISE NOTICE '成功添加 photo_url 字段到 meals 表';
    ELSE
        RAISE NOTICE 'meals 表已经有 photo_url 字段了';
    END IF;
END $$;
