import { useState, useEffect } from 'react'
import GroupManager from './GroupManager'
import PreRegisteredUsers from './PreRegisteredUsers'
import { profilesApi, supabase } from '../supabase'
import Modal from './Modal'

function AdminPage() {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateProfileModal, setShowCreateProfileModal] = useState(false)
  const [newUser, setNewUser] = useState({
    id: '',
    username: '',
    email: ''
  })
  const [createProfileEmail, setCreateProfileEmail] = useState('')
  const [createProfileName, setCreateProfileName] = useState('')
  const [editingUser, setEditingUser] = useState(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    console.log('🔄 开始加载用户列表...')
    setIsLoading(true)
    try {
      const { data, error } = await profilesApi.getAll()
      console.log('📥 管理员页面获取到的用户数据:', data)
      console.log('⚠️ 可能的错误:', error)
      if (data && data.length > 0) {
        console.log('📊 第一条用户记录的字段:', Object.keys(data[0]))
        console.log('👥 用户列表:', data.map(u => ({ id: u.id, email: u.email, name: u.name })))
      } else {
        console.log('❌ 没有获取到用户数据')
      }
      if (!error && data) {
        setUsers(data)
        console.log('✅ 用户列表已更新，共', data.length, '个用户')
      }
    } catch (e) {
      console.error('❌ 加载用户失败:', e)
    }
    setIsLoading(false)
    console.log('🔚 加载用户列表完成')
  }

  const syncAuthUsers = async () => {
    setIsSyncing(true)
    try {
      console.log('开始同步 Auth 用户...')
      
      const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers()
      
      if (listError) {
        throw new Error('获取 Auth 用户列表失败: ' + listError.message)
      }
      
      console.log('Auth 用户列表:', authUsers)
      
      let createdCount = 0
      let skippedCount = 0
      
      for (const authUser of authUsers) {
        try {
          const existingProfile = users.find(u => u.id === authUser.id)
          
          if (existingProfile) {
            skippedCount++
            continue
          }
          
          const userData = {
            id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || '未知用户',
            nickname: authUser.user_metadata?.name || authUser.email?.split('@')[0] || '未知用户',
            is_admin: false,
            created_at: authUser.created_at,
            updated_at: new Date().toISOString()
          }
          
          console.log('创建 profile:', userData)
          
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([userData])
          
          if (insertError) {
            console.error('创建 profile 失败:', insertError)
          } else {
            createdCount++
            console.log('profile 创建成功')
          }
        } catch (userErr) {
          console.error('处理用户失败:', authUser.id, userErr)
        }
      }
      
      alert(`同步完成！\n创建了 ${createdCount} 个新用户资料\n跳过了 ${skippedCount} 个已存在的用户`)
      await loadUsers()
    } catch (e) {
      console.error('同步用户失败:', e)
      alert('同步失败: ' + e.message + '\n\n注意：此功能需要服务端密钥权限，请确保在 Supabase 后台配置了正确的权限。')
    }
    setIsSyncing(false)
  }

  const getDisplayName = (user) => {
    if (user?.nickname && user?.name) {
      return `${user.nickname}（${user.name}）`;
    } else if (user?.nickname) {
      return user.nickname;
    } else if (user?.name) {
      return user.name;
    } else {
      return user?.email || '未知用户';
    }
  }

  const handleCreateProfile = async (e) => {
    e.preventDefault()
    if (!createProfileEmail || !createProfileName) {
      alert('请填写邮箱和姓名')
      return
    }
    
    setIsCreatingProfile(true)
    try {
      console.log('📝 开始手动创建 profile...')
      console.log('📧 邮箱:', createProfileEmail)
      console.log('👤 姓名:', createProfileName)
      
      const userData = {
        id: crypto.randomUUID(),
        email: createProfileEmail,
        name: createProfileName,
        nickname: createProfileName,
        is_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log('📋 准备插入的 profile 数据:', userData)
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([userData])
      
      if (insertError) {
        console.error('❌ 创建 profile 失败:', insertError)
        if (insertError.code === '23505') {
          alert('该邮箱的profile已存在！')
        } else if (insertError.message.includes('foreign key') || insertError.message.includes('profiles_id_fkey')) {
          throw new Error('此方法需要用户ID与Auth系统匹配。\n\n👉 最简单的方法：让该用户重新登录一次，系统会自动创建profile！\n\n登录时请打开浏览器控制台（按F12）查看详细日志。')
        } else {
          throw insertError
        }
      } else {
        console.log('✅ Profile 创建成功！')
        alert('Profile创建成功！\n\n注意：此方法创建的profile需要用户重新登录才能正常使用。')
      }
      
      setCreateProfileEmail('')
      setCreateProfileName('')
      setShowCreateProfileModal(false)
      await loadUsers()
    } catch (e) {
      console.error('❌ 创建profile失败:', e)
      alert('创建失败：' + e.message)
    }
    setIsCreatingProfile(false)
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    if (!newUser.username) {
      alert('请填写用户名')
      return
    }
    
    setIsAdding(true)
    try {
      const userData = {
        id: newUser.id || crypto.randomUUID(),
        name: newUser.username,
        email: newUser.email,
        is_admin: false
      }
      
      console.log('尝试插入用户数据:', userData)
      
      const { error } = await supabase
        .from('profiles')
        .insert([userData])
      
      if (error) {
        console.error('Supabase 错误详情:', error)
        if (error.message.includes('foreign key') || error.message.includes('profiles_id_fkey')) {
          throw new Error('无法添加：用户ID必须先在 Supabase Auth 中注册。请让用户先通过登录页面注册，或在 Supabase 后台手动创建用户。')
        }
        throw error
      }
      
      alert('用户添加成功！')
      setNewUser({ id: '', username: '', email: '' })
      await loadUsers()
    } catch (e) {
      console.error('添加用户失败:', e)
      alert('添加失败：' + e.message)
    }
    setIsAdding(false)
  }

  const handleEditUser = (user) => {
    setEditingUser({ ...user })
    setShowEditModal(true)
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editingUser) return
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editingUser.name,
          nickname: editingUser.nickname,
          email: editingUser.email,
          is_admin: editingUser.is_admin
        })
        .eq('id', editingUser.id)
      
      if (error) throw error
      
      alert('用户信息更新成功！')
      setShowEditModal(false)
      setEditingUser(null)
      await loadUsers()
    } catch (e) {
      console.error('更新用户失败:', e)
      alert('更新失败：' + e.message)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2>🔐 管理员控制台</h2>
        <p className="admin-subtitle">仅管理员可访问此页面</p>
      </div>
      
      <div className="admin-section">
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-icon">➕</span>
            <h3>添加用户</h3>
          </div>
          <p className="admin-card-desc">手动添加用户到 profiles 表</p>
          <form onSubmit={handleAddUser} style={{ marginTop: '16px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>用户名（如：贾宇）</label>
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="请输入用户名"
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>邮箱</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="请输入邮箱"
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>用户ID（可选，留空自动生成）</label>
              <input
                type="text"
                value={newUser.id}
                onChange={(e) => setNewUser({ ...newUser, id: e.target.value })}
                placeholder="请输入用户ID（可选）"
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
            </div>
            <button 
              type="submit" 
              disabled={isAdding}
              style={{ 
                padding: '10px 20px', 
                backgroundColor: '#4CAF50', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: isAdding ? 'not-allowed' : 'pointer'
              }}
            >
              {isAdding ? '添加中...' : '添加用户'}
            </button>
          </form>
        </div>
      </div>
      
      <div className="admin-section">
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-icon">📋</span>
            <h3>用户列表</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setShowCreateProfileModal(true)}
                style={{ 
                  padding: '6px 12px', 
                  backgroundColor: '#FF9800', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                创建Profile
              </button>
              <button 
                onClick={loadUsers}
                disabled={isLoading}
                style={{ 
                  padding: '6px 12px', 
                  backgroundColor: '#2196F3', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                刷新
              </button>
            </div>
          </div>
          <p className="admin-card-desc">查看数据库中的所有注册用户。如果用户注册后未显示，请让该用户先登录一次。</p>
          <div style={{ marginTop: '16px' }}>
            {isLoading ? (
              <p>加载中...</p>
            ) : users.length === 0 ? (
              <p>暂无用户</p>
            ) : (
              <div className="score-list">
                <table>
                  <thead>
                    <tr>
                      <th>显示名</th>
                      <th>昵称</th>
                      <th>姓名</th>
                      <th>邮箱</th>
                      <th>管理员</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{getDisplayName(user)}</td>
                        <td>{user.nickname || '-'}</td>
                        <td>{user.name || '-'}</td>
                        <td>{user.email || '-'}</td>
                        <td>{user.is_admin ? '是' : '否'}</td>
                        <td>
                          <button 
                            className="edit-btn"
                            onClick={() => handleEditUser(user)}
                            style={{ marginRight: '8px' }}
                          >
                            编辑
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="admin-section">
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-icon">📋</span>
            <h3>预注册用户管理</h3>
          </div>
          <p className="admin-card-desc">在用户注册前添加人员，配置分组，记录可选择。用户注册后可关联。</p>
          <PreRegisteredUsers />
        </div>
      </div>
      
      <div className="admin-section">
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-icon">👥</span>
            <h3>分组管理</h3>
          </div>
          <p className="admin-card-desc">创建和管理用户分组，设置组内成员</p>
          <GroupManager />
        </div>
      </div>
      
      <Modal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)}
        title="编辑用户信息"
      >
        {editingUser && (
          <form onSubmit={handleSaveEdit}>
            <div className="form-group">
              <label>姓名</label>
              <input
                type="text"
                value={editingUser.name || ''}
                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                placeholder="请输入姓名"
              />
            </div>
            <div className="form-group">
              <label>昵称</label>
              <input
                type="text"
                value={editingUser.nickname || ''}
                onChange={(e) => setEditingUser({ ...editingUser, nickname: e.target.value })}
                placeholder="请输入昵称（可选）"
              />
            </div>
            <div className="form-group">
              <label>邮箱</label>
              <input
                type="email"
                value={editingUser.email || ''}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                placeholder="请输入邮箱"
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={editingUser.is_admin || false}
                  onChange={(e) => setEditingUser({ ...editingUser, is_admin: e.target.checked })}
                  style={{ marginRight: '8px' }}
                />
                设为管理员
              </label>
            </div>
            <div className="form-actions">
              <button type="submit">保存</button>
              <button type="button" onClick={() => setShowEditModal(false)}>取消</button>
            </div>
          </form>
        )}
      </Modal>
      
      <Modal 
        isOpen={showCreateProfileModal} 
        onClose={() => setShowCreateProfileModal(false)}
        title="创建用户Profile"
      >
        <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <p>⚠️ <strong>注意：</strong></p>
          <p>此方法创建的profile需要用户ID与Auth系统匹配。</p>
          <p style={{ marginTop: '0.5rem' }}>👉 <strong>推荐方法：</strong>让该用户重新登录一次，系统会自动创建profile！</p>
          <p style={{ marginTop: '0.5rem' }}>登录时请打开浏览器控制台（按F12）查看详细日志。</p>
        </div>
        <form onSubmit={handleCreateProfile}>
          <div className="form-group">
            <label>邮箱</label>
            <input
              type="email"
              value={createProfileEmail}
              onChange={(e) => setCreateProfileEmail(e.target.value)}
              placeholder="请输入用户邮箱"
              required
            />
          </div>
          <div className="form-group">
            <label>姓名</label>
            <input
              type="text"
              value={createProfileName}
              onChange={(e) => setCreateProfileName(e.target.value)}
              placeholder="请输入用户姓名"
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit" disabled={isCreatingProfile}>
              {isCreatingProfile ? '创建中...' : '创建'}
            </button>
            <button type="button" onClick={() => setShowCreateProfileModal(false)}>
              取消
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default AdminPage
