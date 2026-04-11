// 导出为 CSV
export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    alert('没有数据可导出')
    return
  }

  // 获取所有列名
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // 处理包含逗号、引号或换行符的值
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
  ].join('\n')

  // 创建下载链接
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 导出所有数据（备份）
export const exportAllData = async (mealsApi, cardGamesApi, groupsApi, profilesApi) => {
  try {
    const [mealsResult, gamesResult, groupsResult, profilesResult] = await Promise.all([
      mealsApi.getAll(),
      cardGamesApi.getAll(),
      groupsApi.getAll(),
      profilesApi.getAll()
    ])

    const backupData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      meals: mealsResult.data || [],
      cardGames: gamesResult.data || [],
      groups: groupsResult.data || [],
      profiles: profilesResult.data || []
    }

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `happy-life-backup_${new Date().toISOString().split('T')[0]}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    alert('备份成功！')
  } catch (e) {
    console.error('备份失败:', e)
    alert('备份失败，请重试')
  }
}

// 从文件恢复数据
export const importBackupData = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        resolve(data)
      } catch (err) {
        reject(new Error('文件格式错误'))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}
