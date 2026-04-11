-- ========================================
-- 修复预注册用户显示问题
-- ========================================

-- 1. 先禁用 RLS 测试一下（临时）
ALTER TABLE pre_registered_users DISABLE ROW LEVEL SECURITY;

-- 2. 删除已存在的策略
DROP POLICY IF EXISTS "允许查看所有预注册用户" ON pre_registered_users;
DROP POLICY IF EXISTS "允许插入预注册用户" ON pre_registered_users;
DROP POLICY IF EXISTS "允许更新预注册用户" ON pre_registered_users;
DROP POLICY IF EXISTS "允许删除预注册用户" ON pre_registered_users;

-- 3. 重新创建更简单的策略（允许所有操作）
CREATE POLICY "允许所有操作" 
ON pre_registered_users
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. 重新启用 RLS
ALTER TABLE pre_registered_users ENABLE ROW LEVEL SECURITY;

-- 5. 查看表中的数据（验证数据是否存在）
SELECT * FROM pre_registered_users;
