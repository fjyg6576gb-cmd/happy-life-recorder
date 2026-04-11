import { useState, useEffect } from 'react'
import { groupsApi, profilesApi, supabase } from '../supabase'
import Modal from './Modal'

function GroupManager() {
  const [groups, setGroups] = useState([])
  const [users, setUsers] = useState([])
  const [preRegisteredUsers, setPreRegisteredUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [groupMembers, setGroupMembers] = useState([])
  const [newGroupName, setNewGroupName] = useState('')
  const [editGroupName, setEditGroupName] = useState('')

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUser(user)
          await loadGroups()
          await loadUsers()
          await loadPreRegisteredUsers()
        }
      } catch (e) {
        console.error('初始化分组管理器失败:', e)
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [])

  const loadGroups = async () => {
    try {
      console.log('开始加载分组...')
      const { data, error } = await groupsApi.getAll()
      console.log('分组查询结果:', { data, error })
      if (error) {
        console.error('加载分组错误:', error)
        alert('加载分组失败: ' + error.message)
      } else if (data) {
        setGroups(data)
        console.log('成功加载分组:', data)
      }
    } catch (e) {
      console.error('加载分组异常:', e)
    }
  }

  const loadUsers = async () => {
    try {
      console.log('开始加载用户...')
      const { data, error } = await profilesApi.getAll()
      console.log('用户查询结果:', { data, error })
      if (error) {
        console.error('加载用户错误:', error)
        alert('加载用户失败: ' + error.message)
      } else if (data) {
        setUsers(data)
        console.log('成功加载用户:', data)
      }
    } catch (e) {
      console.error('加载用户异常:', e)
    }
  }

  const loadPreRegisteredUsers = async () => {
    try {
      console.log('开始加载预注册用户...')
      const { data, error } = await supabase.from('pre_registered_users').select('*')
      console.log('预注册用户查询结果:', { data, error })
      if (!error && data) {
        setPreRegisteredUsers(data)
        console.log('成功加载预注册用户:', data)
      }
    } catch (e) {
      console.error('加载预注册用户异常:', e)
    }
  }

  const loadGroupMembers = async (groupId) => {
    try {
      const { data, error } = await groupsApi.getMembers(groupId)
      if (!error && data) {
        setGroupMembers(data)
      }
    } catch (e) {
      console.error('加载组成员失败:', e)
    }
  }

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    if (!newGroupName.trim()) return

    try {
      const { data, error } = await groupsApi.create(newGroupName, currentUser?.id)
      if (!error && data) {
        setGroups([data[0], ...groups])
        setShowCreateModal(false)
        setNewGroupName('')
      }
    } catch (e) {
      console.error('创建分组失败:', e)
      alert('创建分组失败，请重试')
    }
  }

  const handleEditGroup = async (e) => {
    e.preventDefault()
    if (!editGroupName.trim() || !selectedGroup) return

    try {
      const { data, error } = await groupsApi.update(selectedGroup.id, editGroupName)
      if (!error && data) {
        setGroups(groups.map(g => g.id === selectedGroup.id ? data[0] : g))
        setShowEditModal(false)
        setSelectedGroup(null)
        setEditGroupName('')
      }
    } catch (e) {
      console.error('更新分组失败:', e)
      alert('更新分组失败，请重试')
    }
  }

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('确定要删除这个分组吗？')) return

    try {
      await groupsApi.delete(groupId)
      setGroups(groups.filter(g => g.id !== groupId))
    } catch (e) {
      console.error('删除分组失败:', e)
      alert('删除分组失败，请重试')
    }
  }

  const handleViewMembers = async (group) => {
    setSelectedGroup(group)
    await loadGroupMembers(group.id)
    setShowMembersModal(true)
  }

  const handleAddMember = async (userId) => {
    if (!selectedGroup) return

    try {
      await groupsApi.addMember(selectedGroup.id, userId)
      await loadGroupMembers(selectedGroup.id)
    } catch (e) {
      console.error('添加成员失败:', e)
      alert('添加成员失败，请重试')
    }
  }

  const handleRemoveMember = async (userId) => {
    if (!selectedGroup) return
    if (!window.confirm('确定要移除这个成员吗？')) return

    try {
      await groupsApi.removeMember(selectedGroup.id, userId)
      await loadGroupMembers(selectedGroup.id)
    } catch (e) {
      console.error('移除成员失败:', e)
      alert('移除成员失败，请重试')
    }
  }

  const isMemberInGroup = (userId) => {
    return groupMembers.some(member => member.user_id === userId)
  }

  if (isLoading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="group-manager">
      <div className="header-section">
        <h3>分组管理</h3>
        <button className="add-btn" onClick={() => setShowCreateModal(true)}>
          创建分组
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="empty-message">暂无分组</p>
      ) : (
        <div className="groups-list">
          {groups.map(group => (
            <div key={group.id} className="group-card">
              <div className="group-info">
                <h4>{group.name}</h4>
                <span className="group-meta">
                  创建于 {new Date(group.created_at).toLocaleDateString('zh-CN')}
                </span>
              </div>
              <div className="group-actions">
                <button 
                  className="edit-btn" 
                  onClick={() => {
                    setSelectedGroup(group)
                    setEditGroupName(group.name)
                    setShowEditModal(true)
                  }}
                >
                  编辑
                </button>
                <button 
                  className="config-btn" 
                  onClick={() => handleViewMembers(group)}
                >
                  成员
                </button>
                <button 
                  className="delete-btn" 
                  onClick={() => handleDeleteGroup(group.id)}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        title="创建分组"
      >
        <form onSubmit={handleCreateGroup}>
          <div className="form-group">
            <label>分组名称</label>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="输入分组名称"
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit">
              创建
            </button>
            <button type="button" onClick={() => setShowCreateModal(false)}>
              取消
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)}
        title="编辑分组"
      >
        <form onSubmit={handleEditGroup}>
          <div className="form-group">
            <label>分组名称</label>
            <input
              type="text"
              value={editGroupName}
              onChange={(e) => setEditGroupName(e.target.value)}
              placeholder="输入分组名称"
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit">
              保存
            </button>
            <button type="button" onClick={() => setShowEditModal(false)}>
              取消
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={showMembersModal} 
        onClose={() => setShowMembersModal(false)}
        title={`${selectedGroup?.name} - 成员管理`}
      >
        <div className="members-section">
          <h4>当前正式成员</h4>
          {groupMembers.length === 0 ? (
            <p className="empty-message">暂无正式成员</p>
          ) : (
            <div className="members-list">
              {groupMembers.map((member) => (
                <div key={member.user_id} className="member-item">
                  <span>
                    {(() => {
                      const profile = member.profiles;
                      if (profile?.nickname && profile?.name) {
                        return `${profile.nickname}（${profile.name}）`;
                      } else if (profile?.nickname) {
                        return profile.nickname;
                      } else if (profile?.name) {
                        return profile.name;
                      } else {
                        return profile?.email || '未知用户';
                      }
                    })()}
                  </span>
                  <button 
                    className="delete-btn" 
                    onClick={() => handleRemoveMember(member.user_id)}
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <h4 style={{ marginTop: '2rem' }}>预注册用户（本分组）</h4>
          {(() => {
            const groupPreUsers = preRegisteredUsers.filter(u => u.group_id === selectedGroup?.id);
            return groupPreUsers.length === 0 ? (
              <p className="empty-message">暂无预注册用户</p>
            ) : (
              <div className="members-list">
                {groupPreUsers.map((user) => (
                  <div key={user.id} className="member-item">
                    <span>
                      {(() => {
                        if (user?.nickname && user?.name) {
                          return `${user.nickname}（${user.name}）`;
                        } else if (user?.nickname) {
                          return user.nickname;
                        } else if (user?.name) {
                          return user.name;
                        } else {
                          return '未知用户';
                        }
                      })()}
                      <span style={{ color: '#999', fontSize: '12px', marginLeft: '8px' }}>(预注册)</span>
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
          
          <h4 style={{ marginTop: '2rem' }}>添加正式成员</h4>
          <div className="users-list">
            {users.filter(user => !isMemberInGroup(user.id)).map(user => (
              <div key={user.id} className="user-item">
                <span>
                  {(() => {
                    if (user.nickname && user.name) {
                      return `${user.nickname}（${user.name}）`;
                    } else if (user.nickname) {
                      return user.nickname;
                    } else if (user.name) {
                      return user.name;
                    } else {
                      return user.email || '未知用户';
                    }
                  })()}
                </span>
                <button 
                  className="add-btn" 
                  onClick={() => handleAddMember(user.id)}
                >
                  添加
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default GroupManager
