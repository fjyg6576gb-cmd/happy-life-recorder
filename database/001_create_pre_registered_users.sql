-- ========================================
-- 第一部分：创建预注册用户表
-- ========================================

CREATE TABLE IF NOT EXISTS pre_registered_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    nickname TEXT,
    group_id BIGINT,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_linked BOOLEAN DEFAULT FALSE,
    linked_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_pre_registered_users_name ON pre_registered_users(name);
CREATE INDEX IF NOT EXISTS idx_pre_registered_users_group ON pre_registered_users(group_id);
CREATE INDEX IF NOT EXISTS idx_pre_registered_users_created_by ON pre_registered_users(created_by);
CREATE INDEX IF NOT EXISTS idx_pre_registered_users_is_linked ON pre_registered_users(is_linked);
CREATE INDEX IF NOT EXISTS idx_pre_registered_users_linked_user ON pre_registered_users(linked_user_id);

-- ========================================
-- 第二部分：给 profiles 表添加字段（如果不存在）
-- ========================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS pre_registered_id UUID;

CREATE INDEX IF NOT EXISTS idx_profiles_pre_registered_id ON profiles(pre_registered_id);
