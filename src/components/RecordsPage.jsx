import { useState, useEffect } from 'react'
import CardGames from './CardGames'
import MealRecords from './MealRecords'

function RecordsPage() {
  return (
    <div className="records-page">
      <h2>所有记录</h2>
      
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

export default RecordsPage