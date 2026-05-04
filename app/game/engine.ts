export interface GameConfig {
  level: number
  speed: number
  spawnRate: number
  targetScore: number
}

export class GameSession {
  level = 1
  unlockedLevels = 1
  totalScore = 0
  highScore = 0
  
  private levelThresholds = [
    3000, 7000, 12000, 18000, 25000, 35000, 48000, 65000, 85000, 110000
  ]

  constructor() {
    if (typeof window !== 'undefined') {
      this.highScore = parseInt(localStorage.getItem('highScore') || '0')
      this.unlockedLevels = parseInt(localStorage.getItem('unlockedLevels') || '1')
    }
  }

  getConfig(): GameConfig {
    const target = this.levelThresholds[this.level - 1] || 999999
    return {
      level: this.level,
      speed: 300 + (this.level - 1) * 80,
      spawnRate: Math.max(1200 - (this.level - 1) * 100, 400),
      targetScore: target
    }
  }

  setLevel(l: number) {
    if (l <= this.unlockedLevels) {
      this.level = l
    }
  }

  checkLevelUp(currentScore: number): boolean {
    const target = this.levelThresholds[this.level - 1]
    if (currentScore >= target && this.level < 10) {
      this.level += 1
      if (this.level > this.unlockedLevels) {
        this.unlockedLevels = this.level
        if (typeof window !== 'undefined') {
          localStorage.setItem('unlockedLevels', this.unlockedLevels.toString())
        }
      }
      return true
    }
    return false
  }

  endRun(score: number) {
    if (score > this.highScore) {
      this.highScore = score
      if (typeof window !== 'undefined') {
        localStorage.setItem('highScore', score.toString())
      }
    }
    this.totalScore += score
  }

  reset() {
    this.level = 1
    this.totalScore = 0
  }
}

export interface QueueStatus {
  position: number
  total: number
  estimatedMinutes: number
}

export const getMockQueueStatus = (progress: number): QueueStatus => {
  const totalInQueue = 42
  const position = Math.max(1, Math.floor(totalInQueue * (1 - progress)))
  return {
    position,
    total: totalInQueue,
    estimatedMinutes: Math.ceil(position * 1.5)
  }
}
