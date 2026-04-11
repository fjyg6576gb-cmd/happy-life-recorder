import { useState } from 'react'
import { supabase } from '../supabase'

function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [loading, setLoading] = useState(false)

  console.log('Auth 组件渲染了！')

  const handleClick = async () => {
    console.log('--- 按钮被点击 ---')
    console.log('isRegistering:', isRegistering)
    console.log('email:', email)
    console.log('password:', password)
    console.log('name:', name)
    setLoading(true)
    
    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              name: name
            }
          }
        })
        
        if (error) {
          alert('注册失败: ' + error.message)
        } else {
          if (data.user) {
            let profileCreated = false
            let attempts = 0
            const maxAttempts = 3
            
            while (!profileCreated && attempts < maxAttempts) {
              attempts++
              try {
                console.log(`尝试创建 profile (第 ${attempts} 次)...`)
                
                const { error: profileError } = await supabase
                  .from('profiles')
                  .insert([{
                    id: data.user.id,
                    email: email,
                    name: name || email.split('@')[0],
                    nickname: name || email.split('@')[0],
                    is_admin: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }])
                
                if (profileError) {
                  console.error('创建 profile 失败:', profileError)
                  if (profileError.code === '23505') {
                    console.log('profile 已存在，跳过创建')
                    profileCreated = true
                  } else if (attempts < maxAttempts) {
                    console.log('等待 1 秒后重试...')
                    await new Promise(resolve => setTimeout(resolve, 1000))
                  }
                } else {
                  console.log('profile 创建成功')
                  profileCreated = true
                }
              } catch (profileErr) {
                console.error('创建 profile 异常:', profileErr)
                if (attempts < maxAttempts) {
                  console.log('等待 1 秒后重试...')
                  await new Promise(resolve => setTimeout(resolve, 1000))
                }
              }
            }
            
            if (!profileCreated) {
              alert('注册成功！但用户资料创建失败，请联系管理员。')
            } else {
              alert('注册成功！请检查邮箱验证。')
            }
          } else {
            alert('注册成功！请检查邮箱验证。')
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        })
        
        if (error) {
          alert('登录失败: ' + error.message)
        }
      }
    } catch (err) {
      alert('发生错误: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>{isRegistering ? '注册' : '登录'}</h1>
      
      {isRegistering && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px' }}>姓名</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入姓名"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
      )}
      
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px' }}>邮箱</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="请输入邮箱"
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
        />
      </div>
      
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px' }}>密码</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="请输入密码"
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
        />
      </div>
      
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          width: '100%',
          fontSize: '20px',
          padding: '16px',
          backgroundColor: loading ? '#666' : '#FF0000',
          color: 'white',
          border: '3px solid #000',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        {loading ? '处理中...' : (isRegistering ? '注册' : '登录')}
      </button>
      
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <span>{isRegistering ? '已有账号？' : '没有账号？'}</span>
        <button
          onClick={() => {
            console.log('切换模式')
            setIsRegistering(!isRegistering)
          }}
          style={{
            marginLeft: '8px',
            padding: '8px 16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {isRegistering ? '登录' : '注册'}
        </button>
      </div>
    </div>
  )
}

export default Auth
