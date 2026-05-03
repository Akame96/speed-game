import { GameConfig } from './engine'

export const createGame = async (
  containerId: string,
  config: GameConfig,
  onScore: (score: number) => void,
  onGameOver: (score: number) => void,
  onLevelComplete: (score: number) => void
) => {
  const Phaser = await import('phaser')

  return new Phaser.Game({
    type: Phaser.AUTO,
    width: 300,
    height: 500,
    parent: containerId,
    backgroundColor: '#1a1a1a',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    scene: {
      create(this: any) {
        let score = 0
        let isGameOver = false
        let isLevelEnding = false
        const lanes = [75, 150, 225]
        let currentLane = 1

        const DEPTH = {
          GRASS: 1,
          ROAD: 2,
          LINES: 3,
          OBSTACLES: 50,
          PLAYER: 100
        }

        // --- BACKGROUND ---
        this.add.rectangle(0, 0, 40, 500, 0x2d5a27).setOrigin(0).setDepth(DEPTH.GRASS)
        this.add.rectangle(260, 0, 40, 500, 0x2d5a27).setOrigin(0).setDepth(DEPTH.GRASS)
        
        const curbs = this.add.group()
        for (let i = 0; i < 20; i++) {
          const color = i % 2 === 0 ? 0xffffff : 0xff0000
          curbs.add(this.add.rectangle(35, i * 30, 10, 30, color).setOrigin(0.5).setDepth(DEPTH.ROAD))
          curbs.add(this.add.rectangle(265, i * 30, 10, 30, color).setOrigin(0.5).setDepth(DEPTH.ROAD))
        }

        this.add.rectangle(150, 250, 220, 500, 0x333333).setDepth(DEPTH.ROAD)

        const roadLines = this.add.group()
        for (let i = 0; i < 12; i++) {
          const l1 = this.add.rectangle(112, i * 50, 4, 25, 0xffffff, 0.4).setDepth(DEPTH.LINES)
          const l2 = this.add.rectangle(187, i * 50, 4, 25, 0xffffff, 0.4).setDepth(DEPTH.LINES)
          roadLines.add(l1)
          roadLines.add(l2)
        }

        // --- PLAYER ---
        const player = this.add.rectangle(lanes[currentLane], 420, 40, 70, 0x00ff00, 0).setDepth(DEPTH.PLAYER)
        this.physics.add.existing(player)
        
        const carBody = this.add.rectangle(0, 0, 42, 75, 0x00ff44).setOrigin(0.5)
        const carHood = this.add.rectangle(0, -20, 38, 30, 0x00cc33).setOrigin(0.5)
        const carWind = this.add.rectangle(0, -5, 34, 12, 0xaaddff).setOrigin(0.5)
        const playerVisuals = this.add.container(0, 0, [carBody, carHood, carWind]).setDepth(DEPTH.PLAYER)

        // --- OBSTACLES GROUP ---
        const obstacles = this.physics.add.group()

        // --- SPAWN FUNCTION ---
        const spawnObstacle = () => {
          if (isLevelEnding || isGameOver) return
          const lane = Phaser.Math.Between(0, 2)
          const isTruck = Phaser.Math.Between(0, 10) > 7
          const x = lanes[lane]
          const y = -100
          
          const obs = this.add.rectangle(x, y, 40, isTruck ? 110 : 75, isTruck ? 0xff8800 : 0xff3333).setDepth(DEPTH.OBSTACLES)
          this.physics.add.existing(obs)
          obs.body.setVelocityY(config.speed)
          obstacles.add(obs)
        }

        this.time.addEvent({
          delay: config.spawnRate,
          loop: true,
          callback: spawnObstacle
        })

        // --- MOVEMENT ---
        const movePlayer = (direction: 'left' | 'right') => {
          if (isLevelEnding || isGameOver) return
          if (direction === 'left') currentLane = Math.max(0, currentLane - 1)
          else currentLane = Math.min(2, currentLane + 1)
          this.tweens.add({ targets: player, x: lanes[currentLane], duration: 120, ease: 'Power2' })
        }

        this.input.keyboard.on('keydown-LEFT', () => movePlayer('left'))
        this.input.keyboard.on('keydown-RIGHT', () => movePlayer('right'))
        this.input.keyboard.on('keydown-A', () => movePlayer('left'))
        this.input.keyboard.on('keydown-D', () => movePlayer('right'))
        this.input.on('pointerdown', (p: any) => p.x < 150 ? movePlayer('left') : movePlayer('right'))

        // --- UPDATE LOOP ---
        this.events.on('update', () => {
          if (isGameOver) return
          playerVisuals.setPosition(player.x, player.y)
          const scrollSpeed = isLevelEnding ? config.speed / 20 : config.speed / 60
          roadLines.getChildren().forEach((line: any) => { line.y += scrollSpeed; if (line.y > 500) line.y = -50 })
          curbs.getChildren().forEach((curb: any) => { curb.y += scrollSpeed; if (curb.y > 500) curb.y = -30 })

          if (score >= config.targetScore && !isLevelEnding) {
            isLevelEnding = true
            this.physics.pause()
            this.cameras.main.flash(500, 255, 255, 255)
            this.tweens.add({ targets: [player, playerVisuals], y: -200, duration: 1500, ease: 'Power2.easeIn', onComplete: () => onLevelComplete(score) })
          }
          obstacles.getChildren().forEach((obs: any) => { if (obs.y > 600) obs.destroy() })
        })

        // --- COLLISIONS ---
        this.physics.add.overlap(player, obstacles, () => {
          if (isLevelEnding || isGameOver) return
          isGameOver = true
          this.physics.pause()
          this.cameras.main.shake(300, 0.05)
          this.cameras.main.flash(200, 255, 0, 0)
          this.time.delayedCall(500, () => onGameOver(score))
        })

        // --- SCORE TIMER ---
        this.time.addEvent({ delay: 100, loop: true, callback: () => { if (!isLevelEnding && !isGameOver) { score += 10; onScore(score) } } })
      }
    }
  })
}