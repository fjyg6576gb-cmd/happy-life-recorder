-- ========================================
-- 为 pre_registered_users 表添加 RLS 策略
-- ========================================

-- 启用 RLS
ALTER TABLE pre_registered_users ENABLE ROW LEVEL SECURITY;

-- 策略1：允许已认证用户查看所有预注册用户
CREATE POLICY "允许查看所有预注册用户" 
ON pre_registered_users
FOR SELECT
TO authenticated
USING (true);

-- 策略2：允许已认证用户插入预注册用户
CREATE POLICY "允许插入预注册用户" 
ON pre_registered_users
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 策略3：允许已认证用户更新预注册用户
CREATE POLICY "允许更新预注册用户" 
ON pre_registered_users
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 策略4：允许已认证用户删除预注册用户
CREATE POLICY "允许删除预注册用户" 
ON pre_registered_users
FOR DELETE
TO authenticated
USING (true);
