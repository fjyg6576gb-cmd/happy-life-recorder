-- ========================================
-- 为 card_games 表添加 RLS 策略
-- ========================================

-- 启用 RLS
ALTER TABLE card_games ENABLE ROW LEVEL SECURITY;

-- 允许所有用户查看所有打牌记录（管理员可以查看所有，普通用户也可以查看所有）
CREATE POLICY "允许查看所有打牌记录" ON card_games
    FOR SELECT
    USING (true);

-- 允许所有用户添加打牌记录
CREATE POLICY "允许添加打牌记录" ON card_games
    FOR INSERT
    WITH CHECK (true);

-- 允许所有用户更新打牌记录
CREATE POLICY "允许更新打牌记录" ON card_games
    FOR UPDATE
    USING (true);

-- 允许所有用户删除打牌记录
CREATE POLICY "允许删除打牌记录" ON card_games
    FOR DELETE
    USING (true);
