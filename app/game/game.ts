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
    width: 800,
    height: 1200,
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
        const lanes = [200, 400, 600]
        let currentLane = 1

        const DEPTH = {
          GRASS: 1,
          ROAD: 2,
          LINES: 3,
          OBSTACLES: 50,
          PLAYER: 100
        }

        // --- BACKGROUND ---
        this.add.rectangle(0, 0, 100, 1200, 0x2d5a27).setOrigin(0).setDepth(DEPTH.GRASS)
        this.add.rectangle(700, 0, 100, 1200, 0x2d5a27).setOrigin(0).setDepth(DEPTH.GRASS)
        
        const curbs = this.add.group()
        for (let i = 0; i < 20; i++) {
          const color = i % 2 === 0 ? 0xffffff : 0xff0000
          curbs.add(this.add.rectangle(90, i * 80, 25, 80, color).setOrigin(0.5).setDepth(DEPTH.ROAD))
          curbs.add(this.add.rectangle(710, i * 80, 25, 80, color).setOrigin(0.5).setDepth(DEPTH.ROAD))
        }

        this.add.rectangle(400, 600, 600, 1200, 0x333333).setDepth(DEPTH.ROAD)

        const roadLines = this.add.group()
        for (let i = 0; i < 12; i++) {
          const l1 = this.add.rectangle(300, i * 120, 10, 60, 0xffffff, 0.4).setDepth(DEPTH.LINES)
          const l2 = this.add.rectangle(500, i * 120, 10, 60, 0xffffff, 0.4).setDepth(DEPTH.LINES)
          roadLines.add(l1)
          roadLines.add(l2)
        }

        // --- PLAYER ---
        const player = this.add.rectangle(lanes[currentLane], 1000, 110, 190, 0x00ff00, 0).setDepth(DEPTH.PLAYER)
        this.physics.add.existing(player)
        
        const carBody = this.add.rectangle(0, 0, 115, 200, 0x00ff44).setOrigin(0.5)
        const carHood = this.add.rectangle(0, -55, 105, 80, 0x00cc33).setOrigin(0.5)
        const carWind = this.add.rectangle(0, -15, 95, 32, 0xaaddff).setOrigin(0.5)
        const playerVisuals = this.add.container(0, 0, [carBody, carHood, carWind]).setDepth(DEPTH.PLAYER)

        // --- OBSTACLES GROUP ---
        const obstacles = this.physics.add.group()

        // --- SPAWN FUNCTION ---
        const spawnObstacle = () => {
          if (isLevelEnding || isGameOver) return
          const lane = Phaser.Math.Between(0, 2)
          const isTruck = Phaser.Math.Between(0, 10) > 7
          const x = lanes[lane]
          const y = -250
          
          const obs = this.add.rectangle(x, y, 110, isTruck ? 300 : 200, isTruck ? 0xff8800 : 0xff3333).setDepth(DEPTH.OBSTACLES)
          this.physics.add.existing(obs)
          obs.body.setVelocityY(config.speed * 2.5) 
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
        this.input.on('pointerdown', (p: any) => p.x < 400 ? movePlayer('left') : movePlayer('right'))

        // --- UPDATE LOOP ---
        this.events.on('update', () => {
          if (isGameOver) return
          playerVisuals.setPosition(player.x, player.y)
          const scrollSpeed = (isLevelEnding ? config.speed / 8 : config.speed / 25)
          roadLines.getChildren().forEach((line: any) => { line.y += scrollSpeed; if (line.y > 1200) line.y = -120 })
          curbs.getChildren().forEach((curb: any) => { curb.y += scrollSpeed; if (curb.y > 1200) curb.y = -80 })

          if (score >= config.targetScore && !isLevelEnding) {
            isLevelEnding = true
            this.physics.pause()
            this.cameras.main.flash(500, 255, 255, 255)
            this.tweens.add({ targets: [player, playerVisuals], y: -500, duration: 1500, ease: 'Power2.easeIn', onComplete: () => onLevelComplete(score) })
          }
          obstacles.getChildren().forEach((obs: any) => { if (obs.y > 1500) obs.destroy() })
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
