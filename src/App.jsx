import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import Auth from './components/Auth'
import MealRecords from './components/MealRecords'
import CardGames from './components/CardGames'
import Scores from './components/Scores'
import AdminPage from './components/AdminPage'
import ConfigPage from './components/ConfigPage'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasRedirected, setHasRedirected] = useState(false)

  const ensureProfileExists = async (user) => {
    console.log('开始检查 profile，用户信息:', { 
      id: user.id, 
      email: user.email, 
      user_metadata: user.user_metadata 
    })
    
    try {
      const isAdminEmail = user.email === '22978@qq.com'
      
      const { data: existingProfile, error: fetchError } = await Promise.race([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('查询 profile 超时')), 5000)
        )
      ])
      
      console.log('查询 profile 结果:', { existingProfile, fetchError })
      
      if (fetchError || !existingProfile) {
        console.log('Profile 不存在或查询出错，正在创建...')
        
        const profileData = {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || '未知用户',
          nickname: user.user_metadata?.name || user.email?.split('@')[0] || '未知用户',
          is_admin: isAdminEmail
        }
        
        console.log('准备插入的 profile 数据:', profileData)
        
        try {
          const { error: insertError } = await Promise.race([
            supabase
              .from('profiles')
              .insert([profileData]),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('创建 profile 超时')), 5000)
            )
          ])
          
          if (insertError) {
            console.error('创建 profile 失败，错误详情:', insertError)
            if (insertError.code === '23505') {
              console.log('Profile 已存在（唯一键冲突），跳过创建')
            }
          } else {
            console.log('✅ Profile 创建成功')
          }
        } catch (e) {
          console.error('创建 profile 时出错或超时，跳过:', e)
        }
      } else {
        console.log('✅ Profile 已存在')
        
        if (isAdminEmail && !existingProfile.is_admin) {
          console.log('检测到管理员邮箱但 is_admin 为 false，正在更新...')
          try {
            const { error: updateError } = await Promise.race([
              supabase
                .from('profiles')
                .update({ is_admin: true })
                .eq('id', user.id),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('更新 is_admin 超时')), 5000)
              )
            ])
            
            if (updateError) {
              console.error('更新 is_admin 失败:', updateError)
            } else {
              console.log('✅ is_admin 已更新为 true')
            }
          } catch (e) {
            console.error('更新 is_admin 时出错或超时，跳过:', e)
          }
        }
      }
    } catch (e) {
      console.error('❌ 确保 profile 存在时出错:', e)
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        console.log('开始初始化...')
        const { data: { user } } = await supabase.auth.getUser()
        
        console.log('获取用户信息完成:', user?.email)
        setUser(user)
        
        if (user) {
          console.log('用户已登录，开始检查 profile 和管理员状态')
          try {
            await ensureProfileExists(user)
          } catch (e) {
            console.error('检查 profile 时出错，但继续检查管理员:', e)
          }
          await checkAdmin(user)
        }
      } catch (e) {
        console.error('初始化出错:', e)
      }
      setLoading(false)
    }
    init()

    // 监听 auth 状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth 状态变化:', event)
        const currentUser = session?.user ?? null
        setUser(currentUser)
        
        if (currentUser) {
          console.log('Auth 状态变化 - 用户:', currentUser?.email)
          try {
            await ensureProfileExists(currentUser)
          } catch (e) {
            console.error('检查 profile 时出错，但继续检查管理员:', e)
          }
          await checkAdmin(currentUser)
        } else {
          setIsAdmin(false)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const checkAdmin = async (user) => {
    console.log('开始检查管理员状态，用户邮箱:', user.email)
    // 硬编码：22978@qq.com 为管理员
    if (user.email === '22978@qq.com') {
      console.log('✅ 用户邮箱匹配，设置为管理员')
      setIsAdmin(true)
    } else {
      try {
        const { data: profile } = await Promise.race([
          supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('请求超时')), 10000)
          )
        ])
        console.log('从数据库获取的 is_admin 值:', profile?.is_admin)
        setIsAdmin(profile?.is_admin || false)
      } catch (e) {
        console.error('检查管理员状态出错:', e)
        setIsAdmin(false)
      }
    }
  }

  const handleSignOut = async () => {
    console.log('开始退出登录...')
    try {
      console.log('调用 supabase.auth.signOut()')
      const { error } = await supabase.auth.signOut()
      console.log('signOut 调用完成')
      if (error) {
        console.error('退出登录失败:', error)
        alert('退出登录失败，请重试')
      } else {
        console.log('✅ 退出登录成功')
      }
    } catch (e) {
      console.error('退出登录出错:', e)
      alert('退出登录出错，请重试')
    }
  }

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading">加载中...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="app-container">
        <Auth />
      </div>
    )
  }

  return (
    <Router basename="/happy-life-recorder/">
      <MainApp user={user} isAdmin={isAdmin} handleSignOut={handleSignOut} />
    </Router>
  )
}

function MainApp({ user, isAdmin, handleSignOut }) {
  const navigate = useNavigate();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      navigate('/', { replace: true });
      setInitialized(true);
    }
  }, [navigate, initialized]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>欢迎使用快乐生活记录器</h1>
        <div className="user-info">
          <span>{user.email}</span>
          {isAdmin && <span style={{color: 'orange', marginLeft: '10px'}}>🔐 管理员</span>}
          <button onClick={handleSignOut}>退出登录</button>
        </div>
      </header>
      
      <Navigation isAdmin={isAdmin} />
      
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/records" element={<RecordsPage />} />
        <Route path="/config" element={<ConfigPage isAdmin={isAdmin} />} />
        {isAdmin && <Route path="/admin" element={<AdminPage />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function Navigation({ isAdmin }) {
  const location = useLocation()
  
  return (
    <nav className="nav-menu">
      <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
        <span className="nav-icon">🏠</span>
        首页
      </Link>
      <Link to="/records" className={`nav-item ${location.pathname === '/records' ? 'active' : ''}`}>
        <span className="nav-icon">📋</span>
        快乐记录
      </Link>
      <Link to="/config" className={`nav-item ${location.pathname === '/config' ? 'active' : ''}`}>
        <span className="nav-icon">⚙️</span>
        系统配置
      </Link>
      {isAdmin && (
        <Link to="/admin" className={`nav-item admin-nav-item ${location.pathname === '/admin' ? 'active' : ''}`}>
          <span className="nav-icon">🔐</span>
          管理后台
        </Link>
      )}
    </nav>
  )
}

function Dashboard() {
  const [showMealForm, setShowMealForm] = useState(false)
  const [showGameForm, setShowGameForm] = useState(false)

  return (
    <div className="dashboard">
      <div className="quick-actions">
        <button className="quick-add-btn meal-btn" onClick={() => setShowMealForm(true)}>
          <span className="btn-icon">🍽️</span>
          添加吃饭记录
        </button>
        <button className="quick-add-btn game-btn" onClick={() => setShowGameForm(true)}>
          <span className="btn-icon">🎴</span>
          添加打牌记录
        </button>
      </div>

      <div className="dashboard-section">
        <h3>积分排名</h3>
        <Scores />
      </div>

      <div className="dashboard-section">
        <h3>打牌统计</h3>
        <CardGames showForm={showGameForm} setShowForm={setShowGameForm} showRecordsOnly={true} />
      </div>

      <div className="dashboard-section">
        <h3>吃饭统计报表</h3>
        <MealRecords showForm={showMealForm} setShowForm={setShowMealForm} showStatsOnly={true} />
      </div>
    </div>
  )
}

function RecordsPage() {
  return (
    <div className="records-page">
      <h2>快乐记录</h2>
      
      <div className="records-section">
        <h3>打牌记录</h3>
        <CardGames />
      </div>
      
      <div className="records-section">
        <h3>吃饭记录</h3>
        <MealRecords />
      </div>
    </div>
  )
}

export default App
