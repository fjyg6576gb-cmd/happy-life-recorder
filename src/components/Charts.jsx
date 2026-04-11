import React from 'react'
import ReactECharts from 'echarts-for-react'

function MealLocationChart({ locationStats }) {
  const option = {
    title: {
      text: '用餐地点分布',
      left: 'center',
      textStyle: {
        color: '#4ecdc4',
        fontSize: 18,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      textStyle: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold'
      }
    },
    series: [
      {
        name: '用餐次数',
        type: 'pie',
        radius: '50%',
        data: Object.entries(locationStats).map(([location, count]) => ({
          value: count,
          name: location
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        label: {
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 'bold'
        }
      }
    ]
  }

  return <ReactECharts option={option} style={{ height: '400px' }} />
}

function MealMonthlyChart({ monthlyStats }) {
  const months = Object.keys(monthlyStats).sort()
  const counts = months.map(month => monthlyStats[month])

  const option = {
    title: {
      text: '月度用餐趋势',
      left: 'center',
      textStyle: {
        color: '#4ecdc4',
        fontSize: 18,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: months,
      axisLabel: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold'
      },
      axisLine: {
        lineStyle: {
          color: '#7aa2f7'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '用餐次数',
      nameTextStyle: {
        color: '#ffffff'
      },
      axisLabel: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold'
      },
      axisLine: {
        lineStyle: {
          color: '#7aa2f7'
        }
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(122, 162, 247, 0.3)'
        }
      }
    },
    series: [
      {
        name: '用餐次数',
        type: 'bar',
        data: counts,
        itemStyle: {
          color: '#5470c6'
        },
        label: {
          show: true,
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 'bold'
        }
      }
    ]
  }

  return <ReactECharts option={option} style={{ height: '300px' }} />
}

function PlayerWinRateChart({ winRates }) {
  const option = {
    title: {
      text: '个人胜率排名',
      left: 'center',
      textStyle: {
        color: '#4ecdc4',
        fontSize: 18,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    xAxis: {
      type: 'value',
      name: '胜率 (%)',
      max: 100,
      nameTextStyle: {
        color: '#ffffff'
      },
      axisLabel: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold'
      },
      axisLine: {
        lineStyle: {
          color: '#7aa2f7'
        }
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(122, 162, 247, 0.3)'
        }
      }
    },
    yAxis: {
      type: 'category',
      data: winRates.map(r => r.user_name).reverse(),
      axisLabel: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold'
      },
      axisLine: {
        lineStyle: {
          color: '#7aa2f7'
        }
      }
    },
    series: [
      {
        name: '胜率',
        type: 'bar',
        data: winRates.map(r => r.win_rate).reverse(),
        itemStyle: {
          color: '#91cc75'
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{c}%',
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 'bold'
        }
      }
    ]
  }

  return <ReactECharts option={option} style={{ height: '400px' }} />
}

function ParticipationChart({ participationStats }) {
  const participants = Object.keys(participationStats).sort((a, b) => participationStats[b] - participationStats[a])
  const counts = participants.map(p => participationStats[p])

  const option = {
    title: {
      text: '个人参与次数排名',
      left: 'center',
      textStyle: {
        color: '#4ecdc4',
        fontSize: 18,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    xAxis: {
      type: 'value',
      name: '参与次数',
      nameTextStyle: {
        color: '#ffffff'
      },
      axisLabel: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold'
      },
      axisLine: {
        lineStyle: {
          color: '#7aa2f7'
        }
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(122, 162, 247, 0.3)'
        }
      }
    },
    yAxis: {
      type: 'category',
      data: participants.reverse(),
      axisLabel: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold'
      },
      axisLine: {
        lineStyle: {
          color: '#7aa2f7'
        }
      }
    },
    series: [
      {
        name: '参与次数',
        type: 'bar',
        data: counts.reverse(),
        itemStyle: {
          color: '#fac858'
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{c}次',
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 'bold'
        }
      }
    ]
  }

  return <ReactECharts option={option} style={{ height: '400px' }} />
}

export { MealLocationChart, MealMonthlyChart, PlayerWinRateChart, ParticipationChart }
