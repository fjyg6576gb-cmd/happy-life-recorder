import { useState, useEffect } from 'react'
import { cardGamesApi, profilesApi, supabase } from '../supabase'
import Modal from './Modal'

const regularScoreOptions = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A1', 'A2', 'A3']
const winScoreOptions = ['WIN A1', 'WIN A2', 'WIN A3']

const scoreValues = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A1': 14,
  'A2': 15,
  'A3': 16,
  'WIN A1': 1001,
  'WIN A2': 1002,
  'WIN A3': 1003
}

const isWinScore = (score) => {
  return score === 'WIN A1' || score === 'WIN A2' || score === 'WIN A3'
}

const calculateWinner = (scores, team1, team2) => {
  if (isWinScore(scores.team1)) {
    return team1
  }
  if (isWinScore(scores.team2)) {
    return team2
  }
  const val1 = scoreValues[scores.team1] || 0
  const val2 = scoreValues[scores.team2] || 0
  if (val1 > val2) {
    return team1
  } else if (val2 > val1) {
    return team2
  }
  return []
}

const isScoreTie = (scores) => {
  if (isWinScore(scores.team1) || isWinScore(scores.team2)) {
    return false
  }
  const val1 = scoreValues[scores.team1] || 0
  const val2 = scoreValues[scores.team2] || 0
  return val1 === val2 && val1 > 0
}

const canSaveGame = (game) => {
  if (game.team1.length !== 2 || game.team2.length !== 2) {
    return false
  }
  if (!game.scores.team1 || !game.scores.team2) {
    return false
  }
  // 有WIN方（WIN/WINA1/WINA2/WINA3）可以保存
  if (isWinScore(game.scores.team1) || isWinScore(game.scores.team2)) {
    return true
  }
  // 没有WIN方但比分不同也可以保存（兼容历史记录）
  const val1 = scoreValues[game.scores.team1] || 0
  const val2 = scoreValues[game.scores.team2] || 0
  return val1 !== val2
}

function CardGames({ showForm: propShowForm, setShowForm: propSetShowForm, showConfig: propShowConfig, showRecordsOnly = false }) {
  const [games, setGames] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [internalShowForm, setInternalShowForm] = useState(propShowForm || false)
  const [internalShowConfig, setInternalShowConfig] = useState(propShowConfig || false)
  const [showAll, setShowAll] = useState(false)
  const [currentGame, setCurrentGame] = useState({
    id: null,
    date: new Date().toISOString().split('T')[0],
    team1: [],
    team2: [],
    scores: { team1: '2', team2: '2' },
    winner: ''
  })
  const [user, setUser] = useState(null)
  const [players, setPlayers] = useState([])
  const [playerObjects, setPlayerObjects] = useState([])
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadGames()
      loadPlayers()
    }
  }, [user])

  const formatPlayerName = (player) => {
    let name = ''
    if (player?.nickname && player?.name) {
      name = `${player.nickname}（${player.name}）`;
    } else if (player?.nickname) {
      name = player.nickname;
    } else if (player?.name) {
      name = player.name;
    } else {
      name = player?.email || '未知用户';
    }
    if (player?.isPreRegistered) {
      name += ' (预注册)';
    }
    return name;
  };

  const loadPlayers = async () => {
    try {
      const [profilesResult, preRegisteredResult] = await Promise.all([
        profilesApi.getAll(),
        supabase.from('pre_registered_users').select('*')
      ])
      
      console.log('从 profiles 表获取到的数据:', profilesResult.data)
      console.log('从 pre_registered_users 表获取到的数据:', preRegisteredResult.data)
      
      let allPlayerObjects = []
      if (!profilesResult.error && profilesResult.data) {
        allPlayerObjects = [...profilesResult.data]
      }
      if (!preRegisteredResult.error && preRegisteredResult.data) {
        // 为预注册用户添加 isPreRegistered 标记
        const preUsersWithFlag = preRegisteredResult.data.map(u => ({
          ...u,
          isPreRegistered: true
        }))
        allPlayerObjects = [...allPlayerObjects, ...preUsersWithFlag]
      }
      
      setPlayerObjects(allPlayerObjects)
      setPlayers(allPlayerObjects.map(p => formatPlayerName(p)))
    } catch (e) {
      console.error('加载用户失败:', e)
    }
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

  const loadGames = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('card_games')
        .select('*')
        .order('date', { ascending: false })
      
      if (!error && data) {
        setGames(data)
      } else if (error) {
        console.error('加载打牌记录错误:', error)
      }
    } catch (e) {
      console.error('加载打牌记录失败:', e)
    }
    setIsLoading(false)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setCurrentGame(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setCurrentGame(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleScoreChange = (team, score) => {
    setCurrentGame(prev => ({
      ...prev,
      scores: {
        ...prev.scores,
        [team]: score
      }
    }))
  }

  const handleTeamChange = (team, player) => {
    setCurrentGame(prev => {
      let currentTeam = [...prev[team]]
      let otherTeam = [...(team === 'team1' ? prev.team2 : prev.team1)]
      
      // 如果玩家已经在另一个队伍中，先从另一个队伍移除
      const idxOther = otherTeam.indexOf(player)
      if (idxOther !== -1) {
        otherTeam.splice(idxOther, 1)
      }

      // 检查玩家是否在当前队伍中
      const idxCurrent = currentTeam.indexOf(player)
      if (idxCurrent !== -1) {
        // 如果玩家已经在当前队伍中，移除他
        currentTeam.splice(idxCurrent, 1)
      } else if (currentTeam.length < 2) {
        // 如果玩家不在当前队伍中且队伍未满，添加他
        currentTeam.push(player)
      }
      
      return {
        ...prev,
        [team]: currentTeam,
        [team === 'team1' ? 'team2' : 'team1']: otherTeam
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // 验证是否可以保存
    if (!canSaveGame(currentGame)) {
      if (isScoreTie(currentGame.scores)) {
        alert('比分平局！请选择一方为 WIN 或调整比分')
        return
      }
      alert('请完整填写所有信息')
      return
    }
    
    setIsLoading(true)
    
    try {
      // 每次保存都重新计算winner，确保比分和winner一致
      const winnerArray = calculateWinner(currentGame.scores, currentGame.team1, currentGame.team2)
      const winner = winnerArray.join(', ')
      
      const gameData = {
        id: currentGame.id,
        date: currentGame.date,
        team1: currentGame.team1,
        team2: currentGame.team2,
        scores: currentGame.scores,
        winner: winner
      }
      
      if (currentGame.id) {
        await cardGamesApi.update(gameData)
        setGames(prev => prev.map(game => 
          game.id === currentGame.id ? gameData : game
        ))
      } else {
        const { data, error } = await cardGamesApi.add(gameData, user?.id)
        if (!error && data) {
          setGames(prev => [data[0], ...prev])
        } else if (error) {
          alert('添加失败: ' + error.message)
        }
      }
      
      if (propSetShowForm) {
        propSetShowForm(false)
      } else {
        setInternalShowForm(false)
      }
      setCurrentGame({
        id: null,
        date: new Date().toISOString().split('T')[0],
        team1: [],
        team2: [],
        scores: { team1: '2', team2: '2' },
        winner: ''
      })
    } catch (e) {
      console.error('保存失败:', e)
      alert('保存失败，请重试')
    }
    setIsLoading(false)
  }

  const handleSaveAndContinue = async () => {
    // 验证是否可以保存
    if (!canSaveGame(currentGame)) {
      if (isScoreTie(currentGame.scores)) {
        alert('比分平局！请选择一方为 WIN 或调整比分')
        return
      }
      alert('请完整填写所有信息')
      return
    }
    
    setIsLoading(true)
    try {
      const winnerArray = calculateWinner(currentGame.scores, currentGame.team1, currentGame.team2)
      const winner = winnerArray.join(', ')
      
      const gameData = {
        date: currentGame.date,
        team1: currentGame.team1,
        team2: currentGame.team2,
        scores: currentGame.scores,
        winner: winner
      }
      
      const { data, error } = await cardGamesApi.add(gameData, user?.id)
      if (!error && data) {
        setGames(prev => [data[0], ...prev])
      } else if (error) {
        alert('添加失败: ' + error.message)
      }
      
      setCurrentGame({
        id: null,
        date: currentGame.date,
        team1: [...currentGame.team1],
        team2: [...currentGame.team2],
        scores: { team1: '2', team2: '2' },
        winner: ''
      })
    } catch (e) {
      console.error('保存失败:', e)
      alert('保存失败，请重试')
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

  const handleEdit = (game) => {
    // 检查旧记录中的用户是否在当前列表中，如果不在，尝试修复
    let team1 = Array.isArray(game.team1) ? [...game.team1] : []
    let team2 = Array.isArray(game.team2) ? [...game.team2] : []
    
    // 尝试匹配旧用户到新用户（处理改名的情况）
    const fixTeam = (team) => {
      return team.map(playerName => {
        // 如果在当前列表中，直接返回
        if (players.includes(playerName)) {
          return playerName
        }
        // 尝试模糊匹配（去掉括号部分）
        const baseName = playerName.replace(/（.*?）/g, '').trim()
        const matchedPlayer = players.find(p => p.replace(/（.*?）/g, '').trim() === baseName)
        if (matchedPlayer) {
          console.log(`用户改名匹配: ${playerName} -> ${matchedPlayer}`)
          return matchedPlayer
        }
        // 如果找不到匹配，保留原名（用户可能需要手动调整）
        console.log(`警告：用户 ${playerName} 不在当前列表中，可能已改名或删除`)
        return playerName
      })
    }
    
    team1 = fixTeam(team1)
    team2 = fixTeam(team2)
    
    setCurrentGame({
      id: game.id,
      date: game.date,
      team1: team1,
      team2: team2,
      scores: game.scores || { team1: '2', team2: '2' },
      winner: game.winner || ''
    })
    setInternalShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      setIsLoading(true)
      try {
        await cardGamesApi.delete(id)
        setGames(prev => prev.filter(game => game.id !== id))
      } catch (e) {
        console.error('删除失败:', e)
        alert('删除失败，请重试')
      }
      setIsLoading(false)
    }
  }

  if (isLoading && games.length === 0) {
    return <div>加载中...</div>
  }

  return (
    <div className="card-games">
      {!showRecordsOnly && (
        <div className="header-section">
          <h2>打牌记录（掼蛋）</h2>
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

      {!showRecordsOnly && internalShowConfig && (
        <div className="config-form">
          <h3>配置管理</h3>
          <div className="config-section">
            <h4>人员列表</h4>
            <div className="config-list">
              {players.map((player, index) => (
                <div key={index} className="config-item">
                  <span>{player}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Modal 
        isOpen={internalShowForm} 
        onClose={handleCancel}
        title={currentGame.id ? '编辑记录' : '添加记录'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>日期</label>
            <input
              type="date"
              name="date"
              value={currentGame.date}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="teams-container">
            <div className="team-section">
              <h4>队伍1（选择2人）</h4>
              <div className="player-selection">
                {players.map(player => (
                  <div key={player} className="player-checkbox">
                    <input
                      type="checkbox"
                      id={`team1-${player}`}
                      checked={currentGame.team1.includes(player)}
                      onChange={() => handleTeamChange('team1', player)}
                    />
                    <label htmlFor={`team1-${player}`}>{player}</label>
                  </div>
                ))}
              </div>
              <div className="team-score-section">
                <label>比分</label>
                <div className="score-grid">
                  {regularScoreOptions.map(score => (
                    <button
                      key={score}
                      type="button"
                      className={`score-option ${currentGame.scores.team1 === score ? 'selected' : ''}`}
                      onClick={() => handleScoreChange('team1', score)}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <div className="score-grid win-score-grid">
                  {winScoreOptions.map(score => (
                    <button
                      key={score}
                      type="button"
                      className={`score-option win-score-option ${currentGame.scores.team1 === score ? 'selected' : ''}`}
                      onClick={() => handleScoreChange('team1', score)}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="team-section">
              <h4>队伍2（选择2人）</h4>
              <div className="player-selection">
                {players.map(player => (
                  <div key={player} className="player-checkbox">
                    <input
                      type="checkbox"
                      id={`team2-${player}`}
                      checked={currentGame.team2.includes(player)}
                      onChange={() => handleTeamChange('team2', player)}
                    />
                    <label htmlFor={`team2-${player}`}>{player}</label>
                  </div>
                ))}
              </div>
              <div className="team-score-section">
                <label>比分</label>
                <div className="score-grid">
                  {regularScoreOptions.map(score => (
                    <button
                      key={score}
                      type="button"
                      className={`score-option ${currentGame.scores.team2 === score ? 'selected' : ''}`}
                      onClick={() => handleScoreChange('team2', score)}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <div className="score-grid win-score-grid">
                  {winScoreOptions.map(score => (
                    <button
                      key={score}
                      type="button"
                      className={`score-option win-score-option ${currentGame.scores.team2 === score ? 'selected' : ''}`}
                      onClick={() => handleScoreChange('team2', score)}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {isScoreTie(currentGame.scores) && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#fff3cd', 
              border: '1px solid #ffc107', 
              borderRadius: '4px', 
              marginBottom: '16px',
              color: '#856404'
            }}>
              ⚠️ 比分平局！请选择一方为 WIN
            </div>
          )}
          
          <div className="form-actions">
            <button type="submit" disabled={!canSaveGame(currentGame) || isLoading}>
              {isLoading ? '保存中...' : '保存'}
            </button>
            <button type="button" className="save-continue-btn" onClick={handleSaveAndContinue} disabled={!canSaveGame(currentGame) || isLoading}>
              保存并继续
            </button>
            <button type="button" onClick={handleCancel}>
              取消
            </button>
          </div>
        </form>
      </Modal>

      <div className="game-list">
        {isLoading ? (
          <p>加载中...</p>
        ) : games.length === 0 ? (
          <p>暂无打牌记录</p>
        ) : (
          <>
            <div className="desktop-table">
              <table>
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>胜方</th>
                    <th>败方</th>
                    <th>比分</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAll ? games : games.slice(0, 3)).map(game => {
                    const team1Str = Array.isArray(game.team1) ? game.team1.join(', ') : game.team1
                    const team2Str = Array.isArray(game.team2) ? game.team2.join(', ') : game.team2
                    const winnerStr = game.winner || ''
                    
                    const isTeam1Winner = winnerStr.includes(team1Str) || team1Str.split(', ').some(p => winnerStr.includes(p))
                    const isTeam2Winner = winnerStr.includes(team2Str) || team2Str.split(', ').some(p => winnerStr.includes(p))
                    
                    let winnerTeam, loserTeam, winnerScore, loserScore
                    
                    if (isTeam1Winner) {
                      winnerTeam = team1Str
                      loserTeam = team2Str
                      winnerScore = game.scores?.team1
                      loserScore = game.scores?.team2
                    } else if (isTeam2Winner) {
                      winnerTeam = team2Str
                      loserTeam = team1Str
                      winnerScore = game.scores?.team2
                      loserScore = game.scores?.team1
                    } else {
                      winnerTeam = team1Str
                      loserTeam = team2Str
                      winnerScore = game.scores?.team1
                      loserScore = game.scores?.team2
                    }
                    
                    return (
                      <tr key={game.id}>
                        <td>{game.date}</td>
                        <td style={{ color: 'var(--soft-cyan)', fontWeight: '600' }}>{winnerTeam}</td>
                        <td>{loserTeam}</td>
                        <td>{winnerScore}:{loserScore}</td>
                        <td>
                          {!showRecordsOnly && (
                            <>
                              <button className="edit-btn" onClick={() => handleEdit(game)} disabled={isLoading}>
                                编辑
                              </button>
                              <button className="delete-btn" onClick={() => handleDelete(game.id)} disabled={isLoading}>
                                删除
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mobile-cards">
              {(showAll ? games : games.slice(0, 3)).map(game => {
                const team1Str = Array.isArray(game.team1) ? game.team1.join(', ') : game.team1
                const team2Str = Array.isArray(game.team2) ? game.team2.join(', ') : game.team2
                const winnerStr = game.winner || ''
                
                const isTeam1Winner = winnerStr.includes(team1Str) || team1Str.split(', ').some(p => winnerStr.includes(p))
                const isTeam2Winner = winnerStr.includes(team2Str) || team2Str.split(', ').some(p => winnerStr.includes(p))
                
                let winnerTeam, loserTeam, winnerScore, loserScore
                
                if (isTeam1Winner) {
                  winnerTeam = team1Str
                  loserTeam = team2Str
                  winnerScore = game.scores?.team1
                  loserScore = game.scores?.team2
                } else if (isTeam2Winner) {
                  winnerTeam = team2Str
                  loserTeam = team1Str
                  winnerScore = game.scores?.team2
                  loserScore = game.scores?.team1
                } else {
                  winnerTeam = team1Str
                  loserTeam = team2Str
                  winnerScore = game.scores?.team1
                  loserScore = game.scores?.team2
                }
                
                return (
                  <div key={game.id} className="mobile-card">
                    <div className="mobile-card-header">
                      <div className="mobile-card-date">📅 {game.date}</div>
                    </div>
                    <div className="mobile-card-teams">
                      <div className="mobile-card-team">
                        <span className="team-label">胜方:</span>
                        <span className="team-players" style={{ color: 'var(--soft-cyan)', fontWeight: '600' }}>{winnerTeam}</span>
                      </div>
                      <div className="mobile-card-score">
                        <span className="score-value">{winnerScore} : {loserScore}</span>
                      </div>
                      <div className="mobile-card-team">
                        <span className="team-label">败方:</span>
                        <span className="team-players">{loserTeam}</span>
                      </div>
                    </div>
                    {!showRecordsOnly && (
                      <div className="mobile-card-actions">
                        <button className="edit-btn" onClick={() => handleEdit(game)} disabled={isLoading}>
                          编辑
                        </button>
                        <button className="delete-btn" onClick={() => handleDelete(game.id)} disabled={isLoading}>
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {games.length > 3 && (
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
    </div>
  )
}

export default CardGames
