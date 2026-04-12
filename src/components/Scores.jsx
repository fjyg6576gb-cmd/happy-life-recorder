import { useState, useEffect } from 'react'
import { PlayerWinRateChart, TeamWinRateChart } from './Charts'
import { cardGamesApi, profilesApi } from '../supabase'

function Scores() {
  const [yearlyScores, setYearlyScores] = useState([])
  const [winRates, setWinRates] = useState([])
  const [teamWinRates, setTeamWinRates] = useState([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [isLoading, setIsLoading] = useState(true)
  const [players, setPlayers] = useState([])

  useEffect(() => {
    loadPlayers()
    loadScores()
  }, [selectedYear])

  const formatPlayerName = (playerName) => {
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

  const loadPlayers = async () => {
    try {
      const { data, error } = await profilesApi.getAll()
      if (!error && data) {
        setPlayers(data)
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

    // 过滤所选年份的记录
    const filteredGames = games.filter(game => {
      const gameYear = new Date(game.date).getFullYear().toString()
      return gameYear === selectedYear
    })

    filteredGames.forEach(game => {
      const team1Players = Array.isArray(game.team1) ? game.team1 : game.team1.split(', ')
      const team2Players = Array.isArray(game.team2) ? game.team2 : game.team2.split(', ')
      const winner = game.winner ? game.winner.split(', ') : []

      // 判断哪队赢了
      const team1Won = winner.length > 0 && team1Players.every(p => winner.includes(p))
      const team2Won = winner.length > 0 && team2Players.every(p => winner.includes(p))

      // 积分计算：赢的一方每人 +2 分，输的一方每人 -1 分
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
                    <td>{formatPlayerName(score.user_name)}</td>
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
                    <td>{formatPlayerName(rate.user_name)}</td>
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
                    <td>{formatPlayerName(rate.user1_name)} + {formatPlayerName(rate.user2_name)}</td>
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
