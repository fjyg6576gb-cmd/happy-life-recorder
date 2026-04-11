import { useState, useEffect } from 'react'
import { MealLocationChart, MealMonthlyChart } from './Charts'
import { mealsApi, profilesApi, locationsApi, supabase, storageApi } from '../supabase'
import Modal from './Modal'
import CustomSelect from './CustomSelect'
import { formatParticipantName, getParticipantNameById, loadAllParticipants, checkIsAdmin } from '../utils/helpers'

function MealRecords({ showForm: propShowForm, setShowForm: propSetShowForm, showConfig: propShowConfig, showStatsOnly = false, showRecordsOnly = false }) {
  const [meals, setMeals] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [internalShowForm, setInternalShowForm] = useState(propShowForm || false)
  const [internalShowConfig, setInternalShowConfig] = useState(propShowConfig || false)
  const [showAll, setShowAll] = useState(false)
  const [selectedMeals, setSelectedMeals] = useState([])
  const [currentMeal, setCurrentMeal] = useState({
    id: null,
    location: '',
    date: new Date().toISOString().split('T')[0],
    participants: [],
    photo_url: ''
  })
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [participants, setParticipants] = useState([])
  const [participantObjects, setParticipantObjects] = useState([])
  const [locations, setLocations] = useState([])
  const [locationObjects, setLocationObjects] = useState([])
  const [configForm, setConfigForm] = useState({
    newLocation: ''
  })
  const [mealStats, setMealStats] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        const adminStatus = await checkIsAdmin(user, supabase)
        setIsAdmin(adminStatus)
        
        loadMeals()
        loadParticipants()
        loadLocations()
      }
    }
    init()
  }, [])

  const loadLocations = async () => {
    try {
      const { data, error } = await locationsApi.getAll()
      
      if (!error && data && data.length > 0) {
        const customOrder = ['林府', '慢屿咖啡', '顾府', '公园办公室', '贾府', '餐厅饭店', '其他朋友家']
        const sortedData = [...data].sort((a, b) => {
          const indexA = customOrder.indexOf(a.name)
          const indexB = customOrder.indexOf(b.name)
          if (indexA === -1) return 1
          if (indexB === -1) return -1
          return indexA - indexB
        })
        setLocationObjects(sortedData)
        setLocations(sortedData.map(loc => loc.name))
      } else {
        const defaultLocations = ['海底捞', '肯德基', '麦当劳', '川菜馆', '粤菜餐厅', '火锅', '烧烤', '日料', '西餐']
        setLocations(defaultLocations)
      }
    } catch (e) {
      console.error('加载地点失败:', e)
      const defaultLocations = ['海底捞', '肯德基', '麦当劳', '川菜馆', '粤菜餐厅', '火锅', '烧烤', '日料', '西餐']
      setLocations(defaultLocations)
    }
  }

  const getParticipantNamesByIds = (ids) => {
    if (!ids || ids.length === 0) return ''
    const idArray = Array.isArray(ids) ? ids : [ids]
    return idArray.map(id => getParticipantNameById(id, participantObjects)).join(', ')
  }

  const loadParticipants = async () => {
    const { participantObjects: objs, participants: parts } = await loadAllParticipants(profilesApi, supabase)
    setParticipantObjects(objs)
    setParticipants(parts)
  }

  useEffect(() => {
    if (propShowForm !== undefined) {
      setInternalShowForm(propShowForm)
    }
  }, [propShowForm])

  useEffect(() => {
    if (propShowConfig !== undefined) {
      setInternalShowConfig(propShowConfig)
    }
  }, [propShowConfig])

  const loadMeals = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await mealsApi.getAll(user?.id)
      if (!error && data) {
        setMeals(data)
      }
    } catch (e) {
      console.error('加载吃饭记录失败:', e)
    }
    setIsLoading(false)
  }

  const calculateStatistics = () => {
    const stats = {
      totalMeals: meals.length,
      locationStats: {},
      participantStats: {},
      monthlyStats: {}
    }

    meals.forEach((meal) => {
      if (stats.locationStats[meal.location]) {
        stats.locationStats[meal.location]++
      } else {
        stats.locationStats[meal.location] = 1
      }

      let participantList
      if (Array.isArray(meal.participants)) {
        participantList = meal.participants
      } else if (typeof meal.participants === 'string' && meal.participants) {
        participantList = meal.participants.split(', ')
      } else {
        participantList = []
      }
      
      participantList.forEach((participantId) => {
        const participantName = getParticipantNameById(participantId, participantObjects)
        if (stats.participantStats[participantName]) {
          stats.participantStats[participantName]++
        } else {
          stats.participantStats[participantName] = 1
        }
      })

      const month = meal.date.substring(0, 7)
      if (stats.monthlyStats[month]) {
        stats.monthlyStats[month]++
      } else {
        stats.monthlyStats[month] = 1
      }
    })

    stats.topLocations = Object.entries(stats.locationStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
    stats.topParticipants = Object.entries(stats.participantStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
    stats.monthlyData = Object.entries(stats.monthlyStats)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)

    return stats
  }

  useEffect(() => {
    if (meals.length > 0 && participantObjects.length > 0) {
      const stats = calculateStatistics()
      setMealStats(stats)
    }
  }, [meals, participantObjects])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setCurrentMeal(prev => ({ ...prev, [name]: value }))
  }

  const handleConfigInputChange = (e) => {
    const { name, value } = e.target
    setConfigForm(prev => ({ ...prev, [name]: value }))
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingPhoto(true)
    try {
      const { data, error } = await storageApi.uploadPhoto(file)
      if (error) throw error
      
      setCurrentMeal(prev => ({
        ...prev,
        photo_url: data
      }))
      alert('照片上传成功！')
    } catch (e) {
      console.error('照片上传失败:', e)
      alert('照片上传失败：' + e.message)
    }
    setUploadingPhoto(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      if (currentMeal.id) {
        const { data, error } = await mealsApi.update(currentMeal)
        if (error) throw error
        await loadMeals()
      } else {
        const { data, error } = await mealsApi.add(currentMeal, user?.id)
        if (error) throw error
        await loadMeals()
      }
      
      if (propSetShowForm) {
        propSetShowForm(false)
      } else {
        setInternalShowForm(false)
      }
      setCurrentMeal({
        id: null,
        location: '',
        date: new Date().toISOString().split('T')[0],
        participants: [],
        photo_url: ''
      })
    } catch (e) {
      console.error('保存失败:', e)
      alert('保存失败：' + (e.message || '请重试'))
    }
    setIsLoading(false)
  }

  const handleCancel = () => {
    if (propSetShowForm) {
      propSetShowForm(false)
    } else {
      setInternalShowForm(false)
    }
  }

  const handleEdit = (meal) => {
    const editedMeal = { ...meal }
    if (!Array.isArray(editedMeal.participants)) {
      if (typeof editedMeal.participants === 'string' && editedMeal.participants) {
        editedMeal.participants = editedMeal.participants.split(', ')
      } else {
        editedMeal.participants = []
      }
    }
    setCurrentMeal(editedMeal)
    setInternalShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      setIsLoading(true)
      try {
        await mealsApi.delete(id)
        setMeals(prev => prev.filter(meal => meal.id !== id))
      } catch (e) {
        console.error('删除失败:', e)
        alert('删除失败，请重试')
      }
      setIsLoading(false)
    }
  }

  const toggleMealSelection = (id) => {
    setSelectedMeals(prev => {
      if (prev.includes(id)) {
        return prev.filter(mid => mid !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  const toggleAllSelection = () => {
    if (selectedMeals.length === meals.length) {
      setSelectedMeals([])
    } else {
      setSelectedMeals(meals.map(m => m.id))
    }
  }

  const handleBatchDelete = async () => {
    if (selectedMeals.length === 0) {
      alert('请先选择要删除的记录')
      return
    }
    if (!window.confirm(`确定要删除选中的 ${selectedMeals.length} 条记录吗？`)) {
      return
    }
    setIsLoading(true)
    try {
      for (const id of selectedMeals) {
        await mealsApi.delete(id)
      }
      setMeals(prev => prev.filter(meal => !selectedMeals.includes(meal.id)))
      setSelectedMeals([])
      alert('删除成功！')
    } catch (e) {
      console.error('批量删除失败:', e)
      alert('删除失败，请重试')
    }
    setIsLoading(false)
  }

  const handleAddLocation = async (e) => {
    e.preventDefault()
    if (!configForm.newLocation) return
    
    if (locations.includes(configForm.newLocation)) {
      alert('这个地点已存在！')
      return
    }
    
    try {
      const { data, error } = await locationsApi.add(configForm.newLocation)
      if (error) throw error
      
      alert('地点添加成功！')
      setConfigForm(prev => ({ ...prev, newLocation: '' }))
      await loadLocations()
    } catch (e) {
      console.error('添加地点失败:', e)
      alert('添加失败：' + e.message)
    }
  }

  const handleDeleteLocation = async (locationName) => {
    if (!window.confirm('确定要删除这个地点吗？')) return
    
    const locationObj = locationObjects.find(loc => loc.name === locationName)
    if (!locationObj) return
    
    try {
      const { error } = await locationsApi.delete(locationObj.id)
      if (error) throw error
      
      alert('地点删除成功！')
      await loadLocations()
    } catch (e) {
      console.error('删除地点失败:', e)
      alert('删除失败：' + e.message)
    }
  }

  return (
    <div className="meal-records">
      {!showStatsOnly && (
        <div className="header-section">
          <h2>吃饭记录</h2>
          <div className="header-buttons">
            <button className="add-btn" onClick={() => setInternalShowForm(true)} disabled={isLoading}>
              {isLoading ? '加载中...' : '添加记录'}
            </button>
            <button className="config-btn" onClick={() => setInternalShowConfig(!internalShowConfig)}>
              配置
            </button>
          </div>
        </div>
      )}

      {!showRecordsOnly && (
        <div className="stats-section">
          {!showStatsOnly && <h3>用餐统计</h3>}
          {mealStats ? (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <h4>总用餐次数</h4>
                  <div className="stat-value">{mealStats.totalMeals}</div>
                </div>
                <div className="stat-card">
                  <h4>最常去的地点</h4>
                  <ul className="stat-list">
                    {mealStats.topLocations.map(([location, count], index) => (
                      <li key={location}>
                        <span className="rank">{index + 1}</span>
                        <span className="name">{location}</span>
                        <span className="count">{count}次</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="stat-card">
                  <h4>最常参与的人员</h4>
                  <ul className="stat-list">
                    {mealStats.topParticipants.map(([participant, count], index) => (
                      <li key={participant}>
                        <span className="rank">{index + 1}</span>
                        <span className="name">{participant}</span>
                        <span className="count">{count}次</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="stat-card">
                  <h4>月度用餐趋势</h4>
                  <ul className="stat-list">
                    {mealStats.monthlyData.map(([month, count]) => (
                      <li key={month}>
                        <span className="name">{month}</span>
                        <span className="count">{count}次</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {Object.keys(mealStats.locationStats).length > 0 && (
                <div className="chart-container">
                  <MealLocationChart locationStats={mealStats.locationStats} />
                </div>
              )}
              
              {Object.keys(mealStats.monthlyStats).length > 0 && (
                <div className="chart-container">
                  <MealMonthlyChart monthlyStats={mealStats.monthlyStats} />
                </div>
              )}
            </>
          ) : (
            <p>统计加载中...</p>
          )}
        </div>
      )}

      {!showStatsOnly && internalShowConfig && (
        <div className="config-form">
          <h3>配置管理</h3>
          
          <div className="config-section">
            <h4>地点列表</h4>
            {isAdmin && (
              <form onSubmit={handleAddLocation} className="config-subform">
                <input
                  type="text"
                  name="newLocation"
                  value={configForm.newLocation}
                  onChange={handleConfigInputChange}
                  placeholder="输入新地点"
                  required
                />
                <button type="submit">添加</button>
              </form>
            )}
            <div className="config-list">
              {locations.map((location, index) => (
                <div key={index} className="config-item">
                  <span>{location}</span>
                  {isAdmin && (
                    <button 
                      className="delete-config-btn" 
                      onClick={() => handleDeleteLocation(location)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {!isAdmin && (
              <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', fontSize: '0.9rem' }}>
                💡 只有管理员可以添加和删除地点
              </p>
            )}
          </div>
          
          <div className="config-section">
            <h4>人员列表</h4>
            <div className="config-list">
              {participants.map((participant, index) => (
                <div key={index} className="config-item">
                  <span>{participant}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Modal 
        isOpen={internalShowForm} 
        onClose={handleCancel}
        title={currentMeal.id ? '编辑记录' : '添加记录'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>地点</label>
            <CustomSelect
              options={locations}
              value={currentMeal.location}
              onChange={(value) => setCurrentMeal(prev => ({ ...prev, location: value }))}
              placeholder="选择地点"
            />
          </div>
          <div className="form-group">
            <label>日期</label>
            <input
              type="date"
              name="date"
              value={currentMeal.date}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>参与者</label>
            <CustomSelect
              options={participantObjects}
              value={currentMeal.participants}
              onChange={(value) => setCurrentMeal(prev => ({ ...prev, participants: value }))}
              placeholder="选择参与者"
              multiple={true}
              getOptionLabel={formatParticipantName}
              getOptionValue={(opt) => opt.id}
            />
          </div>

          <div className="form-group">
            <label>照片</label>
            {currentMeal.photo_url ? (
              <div className="photo-preview">
                <img src={currentMeal.photo_url} alt="照片预览" />
                <button 
                  type="button" 
                  className="delete-btn"
                  onClick={() => setCurrentMeal(prev => ({ ...prev, photo_url: '' }))}
                >
                  移除照片
                </button>
              </div>
            ) : (
              <div className="photo-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                />
                {uploadingPhoto && <span>上传中...</span>}
              </div>
            )}
          </div>
          <div className="form-actions">
            <button type="submit" disabled={isLoading}>
              {isLoading ? '保存中...' : '保存'}
            </button>
            <button type="button" onClick={handleCancel}>
              取消
            </button>
          </div>
        </form>
      </Modal>

      {!showStatsOnly && (
        <div className="meal-list">
          {isLoading ? (
            <p>加载中...</p>
          ) : meals.length === 0 ? (
            <p>暂无吃饭记录</p>
          ) : (
            <>
              {selectedMeals.length > 0 && (
                <div className="batch-actions">
                  <span>已选择 {selectedMeals.length} 条记录</span>
                  <button className="delete-btn" onClick={handleBatchDelete} disabled={isLoading}>
                    批量删除
                  </button>
                  <button className="config-btn" onClick={() => setSelectedMeals([])}>
                    取消选择
                  </button>
                </div>
              )}
              
              <div className="desktop-table">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={meals.length > 0 && selectedMeals.length === meals.length}
                          onChange={toggleAllSelection}
                        />
                      </th>
                      <th>照片</th>
                      <th>地点</th>
                      <th>日期</th>
                      <th>参与者</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAll ? meals : meals.slice(0, 3)).map(meal => (
                      <tr key={meal.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedMeals.includes(meal.id)}
                            onChange={() => toggleMealSelection(meal.id)}
                          />
                        </td>
                        <td>
                          {meal.photo_url ? (
                            <img src={meal.photo_url} alt="照片" className="table-photo" />
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>{meal.location}</td>
                        <td>{meal.date}</td>
                        <td>{getParticipantNamesByIds(meal.participants)}</td>
                        <td>
                          <button className="edit-btn" onClick={() => handleEdit(meal)} disabled={isLoading}>
                            编辑
                          </button>
                          <button className="delete-btn" onClick={() => handleDelete(meal.id)} disabled={isLoading}>
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mobile-cards">
                {(showAll ? meals : meals.slice(0, 3)).map(meal => (
                  <div key={meal.id} className="mobile-card">
                    {meal.photo_url && (
                      <div className="mobile-card-photo">
                        <img src={meal.photo_url} alt="照片" />
                      </div>
                    )}
                    <div className="mobile-card-header">
                      <div className="mobile-card-select">
                        <input
                          type="checkbox"
                          checked={selectedMeals.includes(meal.id)}
                          onChange={() => toggleMealSelection(meal.id)}
                        />
                      </div>
                      <div className="mobile-card-location">{meal.location}</div>
                    </div>
                    <div className="mobile-card-info">
                      <span className="mobile-card-date">📅 {meal.date}</span>
                      <span className="mobile-card-participants">👥 {getParticipantNamesByIds(meal.participants)}</span>
                    </div>

                    <div className="mobile-card-actions">
                      <button className="edit-btn" onClick={() => handleEdit(meal)} disabled={isLoading}>
                        编辑
                      </button>
                      <button className="delete-btn" onClick={() => handleDelete(meal.id)} disabled={isLoading}>
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {meals.length > 3 && (
                <div className="more-btn-container">
                  <button 
                    className="more-btn" 
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll ? '收起' : '查看更多'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default MealRecords
