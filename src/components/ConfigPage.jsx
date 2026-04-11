import { useState } from 'react'
import CardGames from './CardGames'
import MealRecords from './MealRecords'
import GroupManager from './GroupManager'
import { mealsApi, cardGamesApi, groupsApi, profilesApi } from '../supabase'
import { exportToCSV, exportAllData, importBackupData } from '../utils'

function ConfigPage({ isAdmin }) {
  const [importing, setImporting] = useState(false)

  const handleExportMeals = async () => {
    const { data } = await mealsApi.getAll()
    exportToCSV(data, '吃饭记录')
  }

  const handleExportGames = async () => {
    const { data } = await cardGamesApi.getAll()
    exportToCSV(data, '打牌记录')
  }

  const handleBackup = async () => {
    if (confirm('确定要备份所有数据吗？')) {
      await exportAllData(mealsApi, cardGamesApi, groupsApi, profilesApi)
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!confirm('导入数据会覆盖现有数据，确定继续吗？')) {
      e.target.value = ''
      return
    }

    setImporting(true)
    try {
      const data = await importBackupData(file)
      console.log('导入的数据:', data)
      alert('数据已加载！（注意：此演示仅显示数据，实际导入需要完整实现）')
    } catch (err) {
      alert('导入失败：' + err.message)
    }
    setImporting(false)
    e.target.value = ''
  }

  return (
    <div className="config-page">
      <h2>系统配置</h2>
      
      <div style={{fontSize: '12px', color: '#999', marginBottom: '20px'}}>
        isAdmin: {isAdmin ? 'true' : 'false'}
      </div>
      
      <div className="config-section">
        <h3>📊 数据管理</h3>
        <div className="data-actions">
          <button className="config-action-btn" onClick={handleExportMeals}>
            📤 导出吃饭记录 (CSV)
          </button>
          <button className="config-action-btn" onClick={handleExportGames}>
            📤 导出打牌记录 (CSV)
          </button>
          <button className="config-action-btn backup-btn" onClick={handleBackup}>
            💾 备份所有数据
          </button>
          <label className="config-action-btn import-btn">
            📥 恢复数据
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImport} 
              disabled={importing}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', fontSize: '0.9rem' }}>
          💡 建议定期备份数据，避免数据丢失
        </p>
      </div>
      
      <div className="config-section">
        <h3>分组管理</h3>
        <GroupManager />
      </div>
      
      <div className="config-section">
        <h3>打牌配置</h3>
        <CardGames showConfig={true} />
      </div>
      
      <div className="config-section">
        <h3>吃饭配置</h3>
        <MealRecords showConfig={true} />
      </div>
    </div>
  )
}

export default ConfigPage
