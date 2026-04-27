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
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [yearPlayerStats, setYearPlayerStats] = useState({})

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
    const yearPlayerStatsLocal = {}
    const yearTeamStats = {}
    const scoreCounts = {}
    const playerGameHistory = {}
    
    // 新增统计数据结构
    const headToHeadStats = {}       // 个人对战统计
    const teamVsTeamStats = {}       // 组合对战统计
    const partnershipStats = {}      // 搭档统计（猪队友/幸运星）
    const scoreDiffRecords = []      // 比分差记录
    const playerWinRateTrend = {}    // 玩家胜率趋势（黑马选手）

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
        if (!yearPlayerStatsLocal[player]) {
          yearPlayerStatsLocal[player] = { total_games: 0, wins: 0 }
        }
        yearPlayerStatsLocal[player].total_games++
        if (winner.includes(player)) {
          yearPlayerStatsLocal[player].wins++
        }
      })

      team2Players.forEach(player => {
        if (!yearPlayerStatsLocal[player]) {
          yearPlayerStatsLocal[player] = { total_games: 0, wins: 0 }
        }
        yearPlayerStatsLocal[player].total_games++
        if (winner.includes(player)) {
          yearPlayerStatsLocal[player].wins++
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

      // 计算比分差（给比分字符串赋值来计算）
      if (game.scores?.team1 && game.scores?.team2) {
        // 比分数值映射
        const getScoreValue = (score) => {
          const scoreMap = {
            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
            'J': 11, 'Q': 12, 'K': 13, 'A1': 14, 'A2': 15, 'A3': 16,
            'WIN A1': 14, 'WIN A2': 15, 'WIN A3': 16
          }
          return scoreMap[score] || 0
        }
        
        const score1 = game.scores.team1
        const score2 = game.scores.team2
        const score1Val = getScoreValue(score1)
        const score2Val = getScoreValue(score2)
        const diff = Math.abs(score1Val - score2Val)
        const isTeam1Win = score1Val > score2Val
        
        scoreDiffRecords.push({
          diff,
          score1,
          score2,
          isTeam1Win,
          date: game.date,
          team1Players,
          team2Players
        })
      }

      // 个人对战统计（头对头）
      team1Players.forEach(player1 => {
        team2Players.forEach(player2 => {
          const key1 = `${player1}-${player2}`
          const key2 = `${player2}-${player1}`
          
          if (!headToHeadStats[key1]) {
            headToHeadStats[key1] = { player1, player2, total: 0, wins1: 0, wins2: 0 }
          }
          headToHeadStats[key1].total++
          
          if (team1Won && winner.includes(player1)) {
            headToHeadStats[key1].wins1++
          } else if (team2Won && winner.includes(player2)) {
            headToHeadStats[key1].wins2++
          }
        })
      })

      // 组合对战统计
      const teamKey1 = team1Players.sort().join('+')
      const teamKey2 = team2Players.sort().join('+')
      const vsKey = `${teamKey1}-${teamKey2}`
      const vsKeyReverse = `${teamKey2}-${teamKey1}`
      
      let vsStatKey = vsKey
      if (!teamVsTeamStats[vsKey] && teamVsTeamStats[vsKeyReverse]) {
        vsStatKey = vsKeyReverse
      }
      
      if (!teamVsTeamStats[vsStatKey]) {
        teamVsTeamStats[vsStatKey] = {
          team1: team1Players,
          team2: team2Players,
          total: 0,
          team1Wins: 0,
          team2Wins: 0
        }
      }
      teamVsTeamStats[vsStatKey].total++
      
      if (team1Won) {
        if (vsStatKey === vsKey) {
          teamVsTeamStats[vsStatKey].team1Wins++
        } else {
          teamVsTeamStats[vsStatKey].team2Wins++
        }
      } else if (team2Won) {
        if (vsStatKey === vsKey) {
          teamVsTeamStats[vsStatKey].team2Wins++
        } else {
          teamVsTeamStats[vsStatKey].team1Wins++
        }
      }

      // 搭档统计（猪队友/幸运星）
      // 记录每个玩家和其他玩家搭档时的胜率
      team1Players.forEach((player, i) => {
        team1Players.slice(i + 1).forEach(partner => {
          const key = [player, partner].sort().join('+')
          if (!partnershipStats[key]) {
            partnershipStats[key] = {
              players: [player, partner],
              total: 0,
              wins: 0
            }
          }
          partnershipStats[key].total++
          if (team1Won) {
            partnershipStats[key].wins++
          }
        })
      })
      
      team2Players.forEach((player, i) => {
        team2Players.slice(i + 1).forEach(partner => {
          const key = [player, partner].sort().join('+')
          if (!partnershipStats[key]) {
            partnershipStats[key] = {
              players: [player, partner],
              total: 0,
              wins: 0
            }
          }
          partnershipStats[key].total++
          if (team2Won) {
            partnershipStats[key].wins++
          }
        })
      })
    })

    // 计算黑马选手（胜率提升最快）
    // 将比赛分成前后两半，比较胜率变化
    if (filteredGames.length > 3) {
      const midPoint = Math.floor(filteredGames.length / 2)
      const firstHalf = filteredGames.slice(0, midPoint)
      const secondHalf = filteredGames.slice(midPoint)
      
      const firstHalfStats = {}
      const secondHalfStats = {}
      
      firstHalf.forEach(game => {
        let team1Players = Array.isArray(game.team1) ? game.team1 : game.team1.split(', ')
        let team2Players = Array.isArray(game.team2) ? game.team2 : game.team2.split(', ')
        let winner = game.winner ? game.winner.split(', ') : []
        
        team1Players = team1Players.map(p => getMappedPlayerName(p))
        team2Players = team2Players.map(p => getMappedPlayerName(p))
        winner = winner.map(p => getMappedPlayerName(p))
        
        team1Players.concat(team2Players).forEach(player => {
          if (!firstHalfStats[player]) {
            firstHalfStats[player] = { total: 0, wins: 0 }
          }
          firstHalfStats[player].total++
          if (winner.includes(player)) {
            firstHalfStats[player].wins++
          }
        })
      })
      
      secondHalf.forEach(game => {
        let team1Players = Array.isArray(game.team1) ? game.team1 : game.team1.split(', ')
        let team2Players = Array.isArray(game.team2) ? game.team2 : game.team2.split(', ')
        let winner = game.winner ? game.winner.split(', ') : []
        
        team1Players = team1Players.map(p => getMappedPlayerName(p))
        team2Players = team2Players.map(p => getMappedPlayerName(p))
        winner = winner.map(p => getMappedPlayerName(p))
        
        team1Players.concat(team2Players).forEach(player => {
          if (!secondHalfStats[player]) {
            secondHalfStats[player] = { total: 0, wins: 0 }
          }
          secondHalfStats[player].total++
          if (winner.includes(player)) {
            secondHalfStats[player].wins++
          }
        })
      })
      
      // 计算每个玩家的胜率变化
      Object.keys(yearPlayerStatsLocal).forEach(player => {
        const firstStats = firstHalfStats[player]
        const secondStats = secondHalfStats[player]
        
        if (firstStats && secondStats && firstStats.total >= 2 && secondStats.total >= 2) {
          const firstRate = firstStats.wins / firstStats.total
          const secondRate = secondStats.wins / secondStats.total
          const improvement = secondRate - firstRate
          
          playerWinRateTrend[player] = {
            improvement,
            firstRate,
            secondRate,
            firstTotal: firstStats.total,
            secondTotal: secondStats.total
          }
        }
      })
    }

    // 计算趣味数据
    const newFunStats = {
      totalGames: filteredGames.length,
      
      // 劳模选手
      hardestWorker: Object.entries(yearPlayerStatsLocal)
        .sort((a, b) => b[1].total_games - a[1].total_games)[0],
      
      // 常胜将军
      bestPlayer: Object.entries(yearPlayerStatsLocal)
        .filter(([_, stats]) => stats.total_games >= 3)
        .sort((a, b) => (b[1].wins / b[1].total_games) - (a[1].wins / a[1].total_games))[0],
      
      // 屡败之士
      worstPlayer: Object.entries(yearPlayerStatsLocal)
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
      longestLoseStreak: null,
      
      // 新增趣味头衔
      blackHorse: Object.entries(playerWinRateTrend)
        .sort((a, b) => b[1].improvement - a[1].improvement)[0],
      
      // 最大分差记录
      biggestScoreDiff: scoreDiffRecords
        .sort((a, b) => b.diff - a.diff)[0],
      
      // 对手克星分析：个人对战胜率最高
      bestHeadToHead: Object.entries(headToHeadStats)
        .filter(([_, stat]) => stat.total >= 1)
        .sort((a, b) => {
          const rateA = Math.max(a[1].wins1, a[1].wins2) / a[1].total
          const rateB = Math.max(b[1].wins1, b[1].wins2) / b[1].total
          return rateB - rateA
        })[0],
      
      // 组合对战胜率最高
      bestTeamVsTeam: Object.entries(teamVsTeamStats)
        .filter(([_, stat]) => stat.total >= 1)
        .sort((a, b) => {
          const rateA = Math.max(a[1].team1Wins, a[1].team2Wins) / a[1].total
          const rateB = Math.max(b[1].team1Wins, b[1].team2Wins) / b[1].total
          return rateB - rateA
        })[0],
      
      // 搭档统计数据（用于猪队友/幸运星）
      partnershipStats: partnershipStats
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
    setYearPlayerStats(yearPlayerStatsLocal)
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
            
            {/* 黑马选手 */}
            {funStats.blackHorse && (
              <div className="fun-stat-card">
                <div className="fun-stat-icon">🏇</div>
                <div className="fun-stat-content">
                  <div className="fun-stat-title">黑马选手</div>
                  <div className="fun-stat-value">{formatPlayerName(funStats.blackHorse[0])}</div>
                  <div className="fun-stat-desc">胜率提升 {((funStats.blackHorse[1].improvement) * 100).toFixed(1)}%</div>
                </div>
              </div>
            )}
            
            {/* 最大分差 */}
            {funStats.biggestScoreDiff && (
              <div className="fun-stat-card">
                <div className="fun-stat-icon">💥</div>
                <div className="fun-stat-content">
                  <div className="fun-stat-title">最大分差</div>
                  <div className="fun-stat-value">{funStats.biggestScoreDiff.score1} : {funStats.biggestScoreDiff.score2}</div>
                  <div className="fun-stat-desc">
                    {funStats.biggestScoreDiff.isTeam1Win 
                      ? `${funStats.biggestScoreDiff.team1Players.map(p => formatPlayerName(p)).join('+')} 获胜，差 ${funStats.biggestScoreDiff.diff} 分`
                      : `${funStats.biggestScoreDiff.team2Players.map(p => formatPlayerName(p)).join('+')} 获胜，差 ${funStats.biggestScoreDiff.diff} 分`
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 趣味头衔 🏆 */}
      {funStats.totalGames > 0 && (
        <div className="fun-stats-section">
          <h3>趣味头衔 🏆</h3>
          <div className="fun-stats-grid">
            {/* 黑马选手 */}
            {funStats.blackHorse && (
              <div className="fun-stat-card">
                <div className="fun-stat-icon">🏇</div>
                <div className="fun-stat-content">
                  <div className="fun-stat-title">黑马选手</div>
                  <div className="fun-stat-value">{formatPlayerName(funStats.blackHorse[0])}</div>
                  <div className="fun-stat-desc">
                    胜率从 {((funStats.blackHorse[1].firstRate) * 100).toFixed(1)}% 提升至 {((funStats.blackHorse[1].secondRate) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 对手克星分析 ⚡ */}
      {funStats.totalGames > 0 && (
        <div className="fun-stats-section">
          <h3>对手克星分析 ⚡</h3>
          <div className="fun-stats-grid">
            {/* 个人对战胜率最高 */}
            {funStats.bestHeadToHead && (
              <div className="fun-stat-card">
                <div className="fun-stat-icon">⚔️</div>
                <div className="fun-stat-content">
                  <div className="fun-stat-title">个人克星</div>
                  <div className="fun-stat-value">
                    {(() => {
                      const stat = funStats.bestHeadToHead[1]
                      const isPlayer1Winner = stat.wins1 > stat.wins2
                      const winner = isPlayer1Winner ? stat.player1 : stat.player2
                      const loser = isPlayer1Winner ? stat.player2 : stat.player1
                      const winCount = isPlayer1Winner ? stat.wins1 : stat.wins2
                      const winRate = (winCount / stat.total * 100).toFixed(1)
                      return `${formatPlayerName(winner)} 克制 ${formatPlayerName(loser)}`
                    })()}
                  </div>
                  <div className="fun-stat-desc">
                    {(() => {
                      const stat = funStats.bestHeadToHead[1]
                      const isPlayer1Winner = stat.wins1 > stat.wins2
                      const winCount = isPlayer1Winner ? stat.wins1 : stat.wins2
                      const winRate = (winCount / stat.total * 100).toFixed(1)
                      return `战绩 ${winCount}胜 ${stat.total - winCount}负 胜率 ${winRate}%`
                    })()}
                  </div>
                </div>
              </div>
            )}
            
            {/* 组合对战胜率最高 */}
            {funStats.bestTeamVsTeam && (
              <div className="fun-stat-card">
                <div className="fun-stat-icon">🤺</div>
                <div className="fun-stat-content">
                  <div className="fun-stat-title">组合克星</div>
                  <div className="fun-stat-value">
                    {(() => {
                      const stat = funStats.bestTeamVsTeam[1]
                      const isTeam1Winner = stat.team1Wins > stat.team2Wins
                      const winnerTeam = isTeam1Winner ? stat.team1 : stat.team2
                      const loserTeam = isTeam1Winner ? stat.team2 : stat.team1
                      return `${winnerTeam.map(p => formatPlayerName(p)).join('+')} 克制 ${loserTeam.map(p => formatPlayerName(p)).join('+')}`
                    })()}
                  </div>
                  <div className="fun-stat-desc">
                    {(() => {
                      const stat = funStats.bestTeamVsTeam[1]
                      const isTeam1Winner = stat.team1Wins > stat.team2Wins
                      const winCount = isTeam1Winner ? stat.team1Wins : stat.team2Wins
                      const winRate = (winCount / stat.total * 100).toFixed(1)
                      return `战绩 ${winCount}胜 ${stat.total - winCount}负 胜率 ${winRate}%`
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 比分统计 📊 */}
      {funStats.totalGames > 0 && (
        <div className="fun-stats-section">
          <h3>比分统计 📊</h3>
          <div className="fun-stats-grid">
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
            
            {/* 最大分差 */}
            {funStats.biggestScoreDiff && (
              <div className="fun-stat-card">
                <div className="fun-stat-icon">💥</div>
                <div className="fun-stat-content">
                  <div className="fun-stat-title">最大分差</div>
                  <div className="fun-stat-value">{funStats.biggestScoreDiff.score1} : {funStats.biggestScoreDiff.score2}</div>
                  <div className="fun-stat-desc">
                    {funStats.biggestScoreDiff.isTeam1Win 
                      ? `${funStats.biggestScoreDiff.team1Players.map(p => formatPlayerName(p)).join('+')} 获胜，差 ${funStats.biggestScoreDiff.diff} 分`
                      : `${funStats.biggestScoreDiff.team2Players.map(p => formatPlayerName(p)).join('+')} 获胜，差 ${funStats.biggestScoreDiff.diff} 分`
                    }
                  </div>
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
      
      {/* 趣味数据 😄 - 猪队友/幸运星 */}
      {funStats.totalGames > 0 && funStats.partnershipStats && (
        <div className="fun-stats-section">
          <h3>趣味数据 😄</h3>
          
          {/* 玩家选择器 */}
          <div className="player-selector" style={{ marginBottom: '15px' }}>
            <label>选择玩家查看其搭档分析：</label>
            <select 
              value={selectedPlayer || ''} 
              onChange={(e) => setSelectedPlayer(e.target.value || null)}
              style={{ marginLeft: '10px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-glow)', background: 'var(--dark-card)', color: 'var(--text-primary)' }}
            >
              <option value="">-- 选择玩家 --</option>
              {Object.keys(yearPlayerStats).map(player => (
                <option key={player} value={player}>{formatPlayerName(player)}</option>
              ))}
            </select>
          </div>
          
          {/* 猪队友/幸运星显示 */}
          {selectedPlayer && (
            <div className="fun-stats-grid">
              {(() => {
                // 找出该玩家的所有搭档组合
                const playerPartnerships = Object.entries(funStats.partnershipStats)
                  .filter(([_, stat]) => stat.players.includes(selectedPlayer))
                  .map(([key, stat]) => {
                    const partner = stat.players.find(p => p !== selectedPlayer)
                    const winRate = stat.total > 0 ? (stat.wins / stat.total) * 100 : 0
                    return { partner, stat, winRate }
                  })
                  .filter(p => p.partner && p.stat.total >= 2)
                  .sort((a, b) => b.winRate - a.winRate)
                
                if (playerPartnerships.length === 0) return null
                
                const luckyStar = playerPartnerships[0]
                const badPartner = playerPartnerships[playerPartnerships.length - 1]
                
                return (
                  <>
                    {/* 幸运星 */}
                    <div className="fun-stat-card">
                      <div className="fun-stat-icon">⭐</div>
                      <div className="fun-stat-content">
                        <div className="fun-stat-title">幸运星</div>
                        <div className="fun-stat-value">{formatPlayerName(luckyStar.partner)}</div>
                        <div className="fun-stat-desc">
                          一起搭档胜率 {luckyStar.winRate.toFixed(1)}%
                          （{luckyStar.stat.wins}胜{luckyStar.stat.total - luckyStar.stat.wins}负）
                        </div>
                      </div>
                    </div>
                    
                    {/* 猪队友 */}
                    {badPartner.partner !== luckyStar.partner && (
                      <div className="fun-stat-card">
                        <div className="fun-stat-icon">🐷</div>
                        <div className="fun-stat-content">
                          <div className="fun-stat-title">猪队友</div>
                          <div className="fun-stat-value">{formatPlayerName(badPartner.partner)}</div>
                          <div className="fun-stat-desc">
                            一起搭档胜率 {badPartner.winRate.toFixed(1)}%
                            （{badPartner.stat.wins}胜{badPartner.stat.total - badPartner.stat.wins}负）
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}
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
