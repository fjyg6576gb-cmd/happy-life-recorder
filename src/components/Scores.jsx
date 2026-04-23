import { useState, useEffect } from 'react'
import { PlayerWinRateChart, TeamWinRateChart } from './Charts'
import { cardGamesApi, profilesApi, supabase } from '../supabase'

function Scores() {
  const [yearlyScores, setYearlyScores] = useState([])
  const [winRates, setWinRates] = useState([])
  const [teamWinRates, setTeamWinRates] = useState([])
  const [funStats, setFunStats] = useState({})
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [isLoading, setIsLoading] = useState(true)
  const [players, setPlayers] = useState([])
  const [linkedPreUsers, setLinkedPreUsers] = useState([])

  useEffect(() => {
    loadPlayers()
  }, [])

  useEffect(() => {
    if (players.length > 0) {
      loadScores()
    }
  }, [selectedYear, players, linkedPreUsers])

  const formatPlayerName = (playerName) => {
    // 首先检查是否是已关联的预注册用户
    for (const preUser of linkedPreUsers) {
      const preUserKeywords = new Set()
      const preUserFormatted = preUser.nickname && preUser.name 
        ? `${preUser.nickname}（${preUser.name}）`
        : preUser.nickname || preUser.name
      preUserKeywords.add(preUserFormatted)
      preUserKeywords.add(preUser.nickname)
      preUserKeywords.add(preUser.name)
      preUserKeywords.add(`${preUserFormatted} (预注册)`)
      if (preUser.nickname) preUserKeywords.add(`${preUser.nickname} (预注册)`)
      if (preUser.name) preUserKeywords.add(`${preUser.name} (预注册)`)
      
      if (preUserKeywords.has(playerName)) {
        const linkedUser = players.find(p => p.id === preUser.linked_user_id)
        if (linkedUser) {
          if (linkedUser?.nickname && linkedUser?.name) {
            return `${linkedUser.nickname}（${linkedUser.name}）`
          } else if (linkedUser?.nickname) {
            return linkedUser.nickname
          } else if (linkedUser?.name) {
            return linkedUser.name
          }
        }
      }
    }
    
    // 从 players 数组中找到对应的用户对象
    const player = players.find(p => 
      p.nickname === playerName || 
      p.name === playerName || 
      p.email === playerName
    );
    
    if (player?.nickname && player?.name) {
      return `${player.nickname}（${player.name}）`;
    } else if (player?.nickname) {
      return player.nickname;
    } else if (player?.name) {
      return player.name;
    } else {
      return playerName;
    }
  };

  const getMappedPlayerName = (playerName) => {
    // 首先检查是否是已关联的预注册用户
    for (const preUser of linkedPreUsers) {
      const preUserKeywords = new Set()
      const preUserFormatted = preUser.nickname && preUser.name 
        ? `${preUser.nickname}（${preUser.name}）`
        : preUser.nickname || preUser.name
      preUserKeywords.add(preUserFormatted)
      preUserKeywords.add(preUser.nickname)
      preUserKeywords.add(preUser.name)
      preUserKeywords.add(`${preUserFormatted} (预注册)`)
      if (preUser.nickname) preUserKeywords.add(`${preUser.nickname} (预注册)`)
      if (preUser.name) preUserKeywords.add(`${preUser.name} (预注册)`)
      
      if (preUserKeywords.has(playerName)) {
        const linkedUser = players.find(p => p.id === preUser.linked_user_id)
        if (linkedUser) {
          if (linkedUser?.nickname && linkedUser?.name) {
            return `${linkedUser.nickname}（${linkedUser.name}）`
          } else if (linkedUser?.nickname) {
            return linkedUser.nickname
          } else if (linkedUser?.name) {
            return linkedUser.name
          }
        }
      }
    }
    return playerName
  };

  const loadPlayers = async () => {
    try {
      const [profilesResult, preRegisteredResult] = await Promise.all([
        profilesApi.getAll(),
        supabase.from('pre_registered_users').select('*')
      ])
      
      if (!profilesResult.error && profilesResult.data) {
        setPlayers(profilesResult.data)
      }
      
      if (!preRegisteredResult.error && preRegisteredResult.data) {
        setLinkedPreUsers(preRegisteredResult.data.filter(u => u.is_linked))
      }
    } catch (e) {
      console.error('加载用户失败:', e)
    }
  }

  const loadScores = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await cardGamesApi.getAll()
      if (!error && data) {
        calculateStats(data)
      }
    } catch (e) {
      console.error('加载打牌记录失败:', e)
    }
    setIsLoading(false)
  }

  const calculateStats = (games) => {
    const playerStats = {}
    const teamStats = {}
    const scoreStats = {}
    const yearPlayerStats = {}
    const yearTeamStats = {}
    const scoreCounts = {}
    const playerGameHistory = {}

    // 筛选该年份的记录
    const filteredGames = games.filter(game => {
      const gameYear = new Date(game.date).getFullYear().toString()
      return gameYear === selectedYear
    }).sort((a, b) => new Date(a.date) - new Date(b.date))

    // 处理所有记录（用于胜率统计）和该年份记录（用于趣味数据）
    games.forEach(game => {
      let team1Players = Array.isArray(game.team1) ? game.team1 : game.team1.split(', ')
      let team2Players = Array.isArray(game.team2) ? game.team2 : game.team2.split(', ')
      let winner = game.winner ? game.winner.split(', ') : []
      
      team1Players = team1Players.map(p => getMappedPlayerName(p))
      team2Players = team2Players.map(p => getMappedPlayerName(p))
      winner = winner.map(p => getMappedPlayerName(p))

      // 胜率统计（所有年份）
      team1Players.forEach(player => {
        if (!playerStats[player]) {
          playerStats[player] = { total_games: 0, wins: 0 }
        }
        playerStats[player].total_games++
        if (winner.includes(player)) {
          playerStats[player].wins++
        }
      })

      team2Players.forEach(player => {
        if (!playerStats[player]) {
          playerStats[player] = { total_games: 0, wins: 0 }
        }
        playerStats[player].total_games++
        if (winner.includes(player)) {
          playerStats[player].wins++
        }
      })

      const teamKey1 = team1Players.sort().join('+')
      const teamKey2 = team2Players.sort().join('+')
      
      if (!teamStats[teamKey1]) {
        teamStats[teamKey1] = { total_games: 0, wins: 0, players: team1Players }
      }
      teamStats[teamKey1].total_games++
      if (winner.length > 0 && team1Players.every(p => winner.includes(p))) {
        teamStats[teamKey1].wins++
      }

      if (!teamStats[teamKey2]) {
        teamStats[teamKey2] = { total_games: 0, wins: 0, players: team2Players }
      }
      teamStats[teamKey2].total_games++
      if (winner.length > 0 && team2Players.every(p => winner.includes(p))) {
        teamStats[teamKey2].wins++
      }
    })

    // 处理该年份记录用于趣味数据
    filteredGames.forEach(game => {
      let team1Players = Array.isArray(game.team1) ? game.team1 : game.team1.split(', ')
      let team2Players = Array.isArray(game.team2) ? game.team2 : game.team2.split(', ')
      let winner = game.winner ? game.winner.split(', ') : []
      
      team1Players = team1Players.map(p => getMappedPlayerName(p))
      team2Players = team2Players.map(p => getMappedPlayerName(p))
      winner = winner.map(p => getMappedPlayerName(p))

      // 判断哪队赢了
      const team1Won = winner.length > 0 && team1Players.every(p => winner.includes(p))
      const team2Won = winner.length > 0 && team2Players.every(p => winner.includes(p))

      // 积分计算
      team1Players.forEach(player => {
        if (!scoreStats[player]) {
          scoreStats[player] = { user_id: player, user_name: player, total_score: 0 }
        }
        if (team1Won) {
          scoreStats[player].total_score += 2
        } else {
          scoreStats[player].total_score -= 1
        }
      })

      team2Players.forEach(player => {
        if (!scoreStats[player]) {
          scoreStats[player] = { user_id: player, user_name: player, total_score: 0 }
        }
        if (team2Won) {
          scoreStats[player].total_score += 2
        } else {
          scoreStats[player].total_score -= 1
        }
      })

      // 该年份的玩家统计
      team1Players.forEach(player => {
        if (!yearPlayerStats[player]) {
          yearPlayerStats[player] = { total_games: 0, wins: 0 }
        }
        yearPlayerStats[player].total_games++
        if (winner.includes(player)) {
          yearPlayerStats[player].wins++
        }
      })

      team2Players.forEach(player => {
        if (!yearPlayerStats[player]) {
          yearPlayerStats[player] = { total_games: 0, wins: 0 }
        }
        yearPlayerStats[player].total_games++
        if (winner.includes(player)) {
          yearPlayerStats[player].wins++
        }
      })

      // 该年份的组合统计
      const yearTeamKey1 = team1Players.sort().join('+')
      const yearTeamKey2 = team2Players.sort().join('+')
      
      if (!yearTeamStats[yearTeamKey1]) {
        yearTeamStats[yearTeamKey1] = { total_games: 0, wins: 0, players: team1Players }
      }
      yearTeamStats[yearTeamKey1].total_games++
      if (team1Won) {
        yearTeamStats[yearTeamKey1].wins++
      }

      if (!yearTeamStats[yearTeamKey2]) {
        yearTeamStats[yearTeamKey2] = { total_games: 0, wins: 0, players: team2Players }
      }
      yearTeamStats[yearTeamKey2].total_games++
      if (team2Won) {
        yearTeamStats[yearTeamKey2].wins++
      }

      // 比分统计
      const scoreKey = `${game.scores?.team1 || '?'}:${game.scores?.team2 || '?'}`
      scoreCounts[scoreKey] = (scoreCounts[scoreKey] || 0) + 1

      // 记录玩家胜负历史用于计算连胜连败
      team1Players.concat(team2Players).forEach(player => {
        if (!playerGameHistory[player]) {
          playerGameHistory[player] = []
        }
        const isWin = winner.includes(player)
        playerGameHistory[player].push(isWin)
      })
    })

    // 计算趣味数据
    const newFunStats = {
      totalGames: filteredGames.length,
      
      // 劳模选手
      hardestWorker: Object.entries(yearPlayerStats)
        .sort((a, b) => b[1].total_games - a[1].total_games)[0],
      
      // 常胜将军
      bestPlayer: Object.entries(yearPlayerStats)
        .filter(([_, stats]) => stats.total_games >= 3)
        .sort((a, b) => (b[1].wins / b[1].total_games) - (a[1].wins / a[1].total_games))[0],
      
      // 屡败之士
      worstPlayer: Object.entries(yearPlayerStats)
        .filter(([_, stats]) => stats.total_games >= 3)
        .sort((a, b) => (a[1].wins / a[1].total_games) - (b[1].wins / b[1].total_games))[0],
      
      // 最佳搭档
      bestTeam: Object.entries(yearTeamStats)
        .filter(([_, stats]) => stats.total_games >= 3)
        .sort((a, b) => (b[1].wins / b[1].total_games) - (a[1].wins / a[1].total_games))[0],
      
      // 最常见比分
      mostCommonScore: Object.entries(scoreCounts)
        .sort((a, b) => b[1] - a[1])[0],
      
      // 最长连胜和连败
      longestWinStreak: null,
      longestLoseStreak: null
    }

    // 计算每个玩家的最长连胜和连败
    Object.entries(playerGameHistory).forEach(([player, history]) => {
      let currentWinStreak = 0
      let currentLoseStreak = 0
      let maxWinStreak = 0
      let maxLoseStreak = 0

      history.forEach(isWin => {
        if (isWin) {
          currentWinStreak++
          currentLoseStreak = 0
          if (currentWinStreak > maxWinStreak) {
            maxWinStreak = currentWinStreak
          }
        } else {
          currentLoseStreak++
          currentWinStreak = 0
          if (currentLoseStreak > maxLoseStreak) {
            maxLoseStreak = currentLoseStreak
          }
        }
      })

      if (!newFunStats.longestWinStreak || maxWinStreak > newFunStats.longestWinStreak.streak) {
        newFunStats.longestWinStreak = { player, streak: maxWinStreak }
      }
      if (!newFunStats.longestLoseStreak || maxLoseStreak > newFunStats.longestLoseStreak.streak) {
        newFunStats.longestLoseStreak = { player, streak: maxLoseStreak }
      }
    })

    setFunStats(newFunStats)

    const winRatesList = Object.entries(playerStats)
      .map(([player, stats]) => ({
        user_id: player,
        user_name: formatPlayerName(player),
        total_games: stats.total_games,
        wins: stats.wins,
        win_rate: stats.total_games > 0 ? Math.round((stats.wins / stats.total_games) * 10000) / 100 : 0
      }))
      .sort((a, b) => b.win_rate - a.win_rate)

    const teamWinRatesList = Object.entries(teamStats)
      .map(([key, stats]) => ({
        user1: stats.players[0],
        user1_name: formatPlayerName(stats.players[0]),
        user2: stats.players[1],
        user2_name: formatPlayerName(stats.players[1]),
        total_games: stats.total_games,
        wins: stats.wins,
        win_rate: stats.total_games > 0 ? Math.round((stats.wins / stats.total_games) * 10000) / 100 : 0
      }))
      .filter(stat => stat.total_games > 0)
      .sort((a, b) => b.win_rate - a.win_rate)

    const yearlyScoresList = Object.values(scoreStats)
      .map(score => ({
        ...score,
        user_name: formatPlayerName(score.user_name)
      }))
      .sort((a, b) => b.total_score - a.total_score)

    setWinRates(winRatesList)
    setTeamWinRates(teamWinRatesList)
    setYearlyScores(yearlyScoresList)
  }

  if (isLoading) {
    return <div>加载中...</div>
  }

  return (
    <div className="scores">
      <h2>积分排名</h2>

      {/* 趣味数据卡片区域 */}
      {funStats.totalGames > 0 && (
        <div className="fun-stats-section">
          <h3>趣味数据</h3>
          <div className="fun-stats-grid">
            {/* 总场次 */}
            <div className="fun-stat-card">
              <div className="fun-stat-icon">🎮</div>
              <div className="fun-stat-content">
                <div className="fun-stat-title">总场次</div>
                <div className="fun-stat-value">{funStats.totalGames}</div>
                <div className="fun-stat-desc">该年份进行的比赛</div>
              </div>
            </div>

            {/* 劳模选手 */}
            {funStats.hardestWorker && (
              <div className="fun-stat-card">
                <div className="fun-stat-icon">🏃</div>
                <div className="fun-stat-content">
                  <div className="fun-stat-title">劳模选手</div>
                  <div className="fun-stat-value">{formatPlayerName(funStats.hardestWorker[0])}</div>
                  <div className="fun-stat-desc">参赛 {funStats.hardestWorker[1].total_games} 场</div>
                </div>
              </div>
            )}

            {/* 常胜将军 */}
            {funStats.bestPlayer && (
              <div className="fun-stat-card">
                <div className="fun-stat-icon">👑</div>
                <div className="fun-stat-content">
                  <div className="fun-stat-title">常胜将军</div>
                  <div className="fun-stat-value">{formatPlayerName(funStats.bestPlayer[0])}</div>
                  <div className="fun-stat-desc">胜率 {((funStats.bestPlayer[1].wins / funStats.bestPlayer[1].total_games) * 100).toFixed(1)}%</div>
                </div>
              </div>
            )}

            {/* 屡败之士 */}
            {funStats.worstPlayer && (
              <div className="fun-stat-card">
                <div className="fun-stat-icon">😵</div>
                <div className="fun-stat-content">
                  <div className="fun-stat-title">屡败之士</div>
                  <div className="fun-stat-value">{formatPlayerName(funStats.worstPlayer[0])}</div>
                  <div className="fun-stat-desc">胜率 {((funStats.worstPlayer[1].wins / funStats.worstPlayer[1].total_games) * 100).toFixed(1)}%</div>
                </div>
              </div>
            )}

            {/* 最佳搭档 */}
            {funStats.bestTeam && (
              <div className="fun-stat-card">
                <div className="fun-stat-icon">🤝</div>
                <div className="fun-stat-content">
                  <div className="fun-stat-title">最佳搭档</div>
                  <div className="fun-stat-value">
                    {formatPlayerName(funStats.bestTeam[1].players[0])} + {formatPlayerName(funStats.bestTeam[1].players[1])}
                  </div>
                  <div className="fun-stat-desc">胜率 {((funStats.bestTeam[1].wins / funStats.bestTeam[1].total_games) * 100).toFixed(1)}%</div>
                </div>
              </div>
            )}

            {/* 最常见比分 */}
            {funStats.mostCommonScore && (
              <div className="fun-stat-card">
                <div className="fun-stat-icon">📈</div>
                <div className="fun-stat-content">
                  <div className="fun-stat-title">最常见比分</div>
                  <div className="fun-stat-value">{funStats.mostCommonScore[0]}</div>
                  <div className="fun-stat-desc">出现 {funStats.mostCommonScore[1]} 次</div>
                </div>
              </div>
            )}

            {/* 最长连胜 */}
            {funStats.longestWinStreak && funStats.longestWinStreak.streak > 0 && (
              <div className="fun-stat-card">
                <div className="fun-stat-icon">🔥</div>
                <div className="fun-stat-content">
                  <div className="fun-stat-title">最长连胜</div>
                  <div className="fun-stat-value">{formatPlayerName(funStats.longestWinStreak.player)}</div>
                  <div className="fun-stat-desc">连胜 {funStats.longestWinStreak.streak} 场</div>
                </div>
              </div>
            )}

            {/* 最长连败 */}
            {funStats.longestLoseStreak && funStats.longestLoseStreak.streak > 0 && (
              <div className="fun-stat-card">
                <div className="fun-stat-icon">😅</div>
                <div className="fun-stat-content">
                  <div className="fun-stat-title">最长连败</div>
                  <div className="fun-stat-value">{formatPlayerName(funStats.longestLoseStreak.player)}</div>
                  <div className="fun-stat-desc">连败 {funStats.longestLoseStreak.streak} 场</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="score-section">
        <h3>年度积分排名</h3>
        <div className="year-selector">
          <label>选择年份：</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '5px', color: '#856404' }}>
          积分规则：赢的一方每人 +2 分，输的一方每人 -1 分
        </div>
        <div className="score-list">
          {yearlyScores.length === 0 ? (
            <p>暂无积分记录</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>排名</th>
                  <th>用户</th>
                  <th>总积分</th>
                </tr>
              </thead>
              <tbody>
                {yearlyScores.map((score, index) => (
                  <tr key={score.user_id}>
                    <td>{index + 1}</td>
                    <td>{score.user_name}</td>
                    <td>{score.total_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="score-section">
        <h3>个人胜率排名</h3>
        <div className="score-list">
          {winRates.length === 0 ? (
            <p>暂无胜率记录</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>排名</th>
                  <th>用户</th>
                  <th>总场次</th>
                  <th>获胜场次</th>
                  <th>胜率</th>
                </tr>
              </thead>
              <tbody>
                {winRates.map((rate, index) => (
                  <tr key={rate.user_id}>
                    <td>{index + 1}</td>
                    <td>{rate.user_name}</td>
                    <td>{rate.total_games}</td>
                    <td>{rate.wins}</td>
                    <td>{rate.win_rate.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="score-section">
        <h3>组合胜率排名</h3>
        <div className="score-list">
          {teamWinRates.length === 0 ? (
            <p>暂无组合胜率记录</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>排名</th>
                  <th>组合</th>
                  <th>总场次</th>
                  <th>获胜场次</th>
                  <th>胜率</th>
                </tr>
              </thead>
              <tbody>
                {teamWinRates.map((rate, index) => (
                  <tr key={`${rate.user1}-${rate.user2}`}>
                    <td>{index + 1}</td>
                    <td>{rate.user1_name} + {rate.user2_name}</td>
                    <td>{rate.total_games}</td>
                    <td>{rate.wins}</td>
                    <td>{rate.win_rate.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {winRates.length > 0 && (
        <div className="score-section">
          <h3>个人胜率图表</h3>
          <div className="chart-container">
            <PlayerWinRateChart winRates={winRates} />
          </div>
        </div>
      )}
      
      {teamWinRates.length > 0 && (
        <div className="score-section">
          <h3>组合胜率图表</h3>
          <div className="chart-container">
            <TeamWinRateChart teamWinRates={teamWinRates} />
          </div>
        </div>
      )}
    </div>
  )
}

export default Scores
