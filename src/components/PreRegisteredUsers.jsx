import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Modal from './Modal'

function PreRegisteredUsers() {
  const [users, setUsers] = useState([])
  const [groups, setGroups] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', nickname: '', group_id: null })
  const [editingUser, setEditingUser] = useState(null)
  const [linkingUser, setLinkingUser] = useState(null)
  const [availableProfiles, setAvailableProfiles] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    console.log('🔄 开始加载预注册用户数据...')
    setIsLoading(true)
    try {
      // 先查询预注册用户（不使用关联查询，避免 400 错误）
      console.log('正在查询 pre_registered_users 表...')
      const usersResult = await supabase.from('pre_registered_users').select('*').order('name')
      const groupsResult = await supabase.from('groups').select('*').order('name')
      const profilesResult = await supabase.from('profiles').select('*').order('name')

      console.log('用户查询结果:', usersResult)
      console.log('用户查询错误:', usersResult.error)
      console.log('groupsResult:', groupsResult)
      console.log('profilesResult:', profilesResult)
      
      // 手动关联分组信息
      let usersWithGroups = []
      if (usersResult.data && groupsResult.data) {
        usersWithGroups = usersResult.data.map(user => ({
          ...user,
          groups: groupsResult.data.find(g => g.id === user.group_id)
        }))
      }
      
      setUsers(usersWithGroups)
      setGroups(groupsResult.data || [])
      setAvailableProfiles(profilesResult.data || [])
      console.log('✅ 预注册用户数据加载完成，用户数量:', usersWithGroups.length)
      console.log('✅ 分组数量:', (groupsResult.data || []).length)
    } catch (e) {
      console.error('❌ 加载预注册用户失败:', e)
    }
    setIsLoading(false)
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newUser.name) {
      alert('请输入姓名')
      return
    }
    
    setIsAdding(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const userData = {
        name: newUser.name,
        nickname: newUser.nickname || null,
        group_id: newUser.group_id || null,
        created_by: user.id
      }

      const { error } = await supabase
        .from('pre_registered_users')
        .insert([userData])

      if (error) throw error
      
      alert('预注册用户添加成功！')
      setNewUser({ name: '', nickname: '', group_id: null })
      setShowAddModal(false)
      await loadData()
    } catch (e) {
      console.error('添加预注册用户失败:', e)
      alert('添加失败：' + e.message)
    }
    setIsAdding(false)
  }

  const handleEdit = (user) => {
    setEditingUser({ ...user })
    setShowEditModal(true)
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editingUser) return
    
    try {
      const { error } = await supabase
        .from('pre_registered_users')
        .update({
          name: editingUser.name,
          nickname: editingUser.nickname,
          group_id: editingUser.group_id
        })
        .eq('id', editingUser.id)

      if (error) throw error
      
      alert('预注册用户信息更新成功！')
      setShowEditModal(false)
      setEditingUser(null)
      await loadData()
    } catch (e) {
      console.error('更新预注册用户失败:', e)
      alert('更新失败：' + e.message)
    }
  }

  const handleLink = (user) => {
    setLinkingUser(user)
    setShowLinkModal(true)
  }

  const handleDelete = async (user) => {
    if (!window.confirm(`确定要删除预注册用户「${user.name}」吗？`)) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('pre_registered_users')
        .delete()
        .eq('id', user.id)
      
      if (error) throw error
      
      alert('删除成功！')
      await loadData()
    } catch (e) {
      console.error('删除预注册用户失败:', e)
      alert('删除失败：' + e.message)
    }
  }

  const handleConfirmLink = async (profileId) => {
    if (!linkingUser || !profileId) {
      alert('请选择要关联的用户')
      return
    }
    
    try {
      const profile = availableProfiles.find(p => p.id === profileId)
      
      if (!profile) {
        alert('找不到该用户')
        return
      }

      const confirm = window.confirm(
        `确认要将预注册用户「${linkingUser.name}」与真实用户「${profile.name || profile.email}」关联吗？\n\n关联后，预注册用户的所有打牌和吃饭记录将转移到真实用户。`
      )
      
      if (!confirm) return

      // 1. 更新预注册用户状态
      const { error: updateError } = await supabase
        .from('pre_registered_users')
        .update({
          is_linked: true,
          linked_user_id: profileId
        })
        .eq('id', linkingUser.id)

      if (updateError) throw updateError

      // 2. 转移打牌记录
      const { error: cardError } = await supabase
        .from('card_games')
        .update({
          user_id: profileId,
          pre_registered_user_id: null
        })
        .eq('pre_registered_user_id', linkingUser.id)

      if (cardError) throw cardError

      // 3. 转移吃饭记录
      const { error: mealError } = await supabase
        .from('meal_records')
        .update({
          user_id: profileId,
          pre_registered_user_id: null
        })
        .eq('pre_registered_user_id', linkingUser.id)

      if (mealError) throw mealError

      // 4. 更新 profiles 表
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ pre_registered_id: linkingUser.id })
        .eq('id', profileId)

      if (profileError) throw profileError

      alert('关联成功！')
      setShowLinkModal(false)
      setLinkingUser(null)
      await loadData()
    } catch (e) {
      console.error('关联失败:', e)
      alert('关联失败：' + e.message)
    }
  }

  const getDisplayName = (user) => {
    if (user?.nickname && user?.name) {
      return `${user.nickname}（${user.name}）`;
    } else if (user?.nickname) {
      return user.nickname;
    } else if (user?.name) {
      return user.name;
    } else {
      return '未知用户';
    }
  }

  const getLinkedUserDisplay = (user) => {
    if (!user.is_linked || !user.linked_user_id) return '-'
    const linkedProfile = availableProfiles.find(p => p.id === user.linked_user_id)
    return linkedProfile ? getDisplayName(linkedProfile) : '-'
  }

  const unlinkedProfiles = availableProfiles.filter(p => !p.pre_registered_id)

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <button 
          onClick={() => setShowAddModal(true)}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#2196F3', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ➕ 添加预注册用户
        </button>
        <button 
          onClick={loadData}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#4CAF50', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer',
            marginLeft: '8px'
          }}
        >
          🔄 刷新
        </button>
      </div>

      {isLoading ? (
        <p>加载中...</p>
      ) : users.length === 0 ? (
        <p>暂无预注册用户</p>
      ) : (
        <div className="score-list">
          <table>
            <thead>
              <tr>
                <th>显示名</th>
                <th>昵称</th>
                <th>姓名</th>
                <th>分组</th>
                <th>已关联</th>
                <th>关联用户</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{getDisplayName(user)}</td>
                  <td>{user.nickname || '-'}</td>
                  <td>{user.name || '-'}</td>
                  <td>{user.groups?.name || '-'}</td>
                  <td>{user.is_linked ? '✅' : '❌'}</td>
                  <td>{getLinkedUserDisplay(user)}</td>
                  <td>
                    <button 
                      onClick={() => handleEdit(user)}
                      style={{ marginRight: '8px' }}
                    >
                      编辑
                    </button>
                    {!user.is_linked && (
                      <button 
                        onClick={() => handleLink(user)}
                        style={{ 
                          backgroundColor: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', marginRight: '8px' }}
                      >
                        关联
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(user)}
                      style={{ 
                        backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px' }}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)}
        title="添加预注册用户"
      >
        <form onSubmit={handleAdd}>
          <div className="form-group">
            <label>姓名 *</label>
            <input
              type="text"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              placeholder="请输入姓名"
              required
            />
          </div>
          <div className="form-group">
            <label>昵称（可选）</label>
            <input
              type="text"
              value={newUser.nickname}
              onChange={(e) => setNewUser({ ...newUser, nickname: e.target.value })}
              placeholder="请输入昵称"
            />
          </div>
          <div className="form-group">
            <label>分组（可选）</label>
            <select
              value={newUser.group_id || ''}
              onChange={(e) => setNewUser({ ...newUser, group_id: e.target.value || null })}
            >
              <option value="">不分配</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={isAdding}>
              {isAdding ? '添加中...' : '添加'}
            </button>
            <button type="button" onClick={() => setShowAddModal(false)}>
              取消
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)}
        title="编辑预注册用户"
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
              placeholder="请输入昵称"
            />
          </div>
          <div className="form-group">
            <label>分组</label>
            <select
              value={editingUser.group_id || ''}
              onChange={(e) => setEditingUser({ ...editingUser, group_id: e.target.value || null })}
            >
              <option value="">不分配</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button type="submit">保存</button>
            <button type="button" onClick={() => setShowEditModal(false)}>
              取消
            </button>
          </div>
        </form>
      )}
      </Modal>

      <Modal 
        isOpen={showLinkModal} 
        onClose={() => setShowLinkModal(false)}
        title="关联用户"
      >
        {linkingUser && (
          <div>
            <p style={{ marginBottom: '16px' }}>
              预注册用户：<strong>{getDisplayName(linkingUser)}</strong>
            </p>
            <p style={{ marginBottom: '16px', color: '#666' }}>
              请选择要关联的真实用户：
            </p>
            {unlinkedProfiles.length === 0 ? (
              <p style={{ color: '#999' }}>没有可关联的用户（所有用户都已关联）</p>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {unlinkedProfiles.map((profile) => (
                  <div 
                    key={profile.id}
                    style={{ 
                      padding: '12px', 
                      border: '1px solid #ddd', 
                      borderRadius: '4px',
                      marginBottom: '8px',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleConfirmLink(profile.id)}
                  >
                    <div style={{ fontWeight: 'bold' }}>{getDisplayName(profile)}</div>
                    <div style={{ color: '#666', fontSize: '14px' }}>{profile.email}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="form-actions" style={{ marginTop: '16px' }}>
              <button type="button" onClick={() => setShowLinkModal(false)}>
                取消
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default PreRegisteredUsers
