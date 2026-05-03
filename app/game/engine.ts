export interface GameConfig {
  level: number
  speed: number
  spawnRate: number
  targetScore: number
}

export class GameSession {
  level = 1
  totalScore = 0
  highScore = 0
  unlockedLevels = 1

  private levelThresholds = [
    500, 1200, 2000, 3000, 4200, 5500, 7000, 8800, 11000, 15000
  ]

  constructor() {
    if (typeof window !== 'undefined') {
      this.highScore = parseInt(localStorage.getItem('highScore') || '0')
      this.unlockedLevels = parseInt(localStorage.getItem('unlockedLevels') || '1')
      this.level = this.unlockedLevels
    }
  }

  getConfig(targetLevel?: number): GameConfig {
    const l = targetLevel || this.level
    const target = this.levelThresholds[l - 1] || 999999
    return {
      level: l,
      speed: 250 + (l - 1) * 75,
      spawnRate: Math.max(1000 - (l - 1) * 100, 250),
      targetScore: target
    }
  }

  checkLevelUp(currentScore: number): boolean {
    const target = this.levelThresholds[this.level - 1]
    if (currentScore >= target && this.level < 10) {
      if (this.level === this.unlockedLevels) {
        this.unlockedLevels += 1
        if (typeof window !== 'undefined') {
          localStorage.setItem('unlockedLevels', this.unlockedLevels.toString())
        }
      }
      this.level += 1
      return true
    }
    return false
  }

  setLevel(l: number) {
    if (l <= this.unlockedLevels) {
      this.level = l
    }
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