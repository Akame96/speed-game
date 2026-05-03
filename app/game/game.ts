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

        // --- AMBIENTE ---
        this.add.rectangle(0, 0, 40, 500, 0x2d5a27).setOrigin(0)
        this.add.rectangle(260, 0, 40, 500, 0x2d5a27).setOrigin(0)
        
        const curbs = this.add.group()
        for (let i = 0; i < 20; i++) {
          const color = i % 2 === 0 ? 0xffffff : 0xff0000
          curbs.add(this.add.rectangle(35, i * 30, 10, 30, color).setOrigin(0.5))
          curbs.add(this.add.rectangle(265, i * 30, 10, 30, color).setOrigin(0.5))
        }

        const roadGraphics = this.add.graphics()
        roadGraphics.fillStyle(0x333333, 1)
        roadGraphics.fillRect(40, 0, 220, 500)

        const roadLines = this.add.group()
        for (let i = 0; i < 12; i++) {
          const l1 = this.add.rectangle(112, i * 50, 4, 25, 0xffffff, 0.4)
          const l2 = this.add.rectangle(187, i * 50, 4, 25, 0xffffff, 0.4)
          roadLines.add(l1)
          roadLines.add(l2)
        }

        // --- PLAYER ---
        const playerContainer = this.add.container(lanes[currentLane], 420)
        const body = this.add.rectangle(0, 0, 42, 75, 0x00ff44).setOrigin(0.5)
        const hood = this.add.rectangle(0, -20, 38, 30, 0x00cc33).setOrigin(0.5)
        const windshield = this.add.rectangle(0, -5, 34, 12, 0xaaddff).setOrigin(0.5)
        const spoiler = this.add.rectangle(0, 35, 46, 8, 0x009922).setOrigin(0.5)
        const w1 = this.add.rectangle(-22, -25, 8, 15, 0x111111).setOrigin(0.5)
        const w2 = this.add.rectangle(22, -25, 8, 15, 0x111111).setOrigin(0.5)
        const w3 = this.add.rectangle(-22, 25, 8, 15, 0x111111).setOrigin(0.5)
        const w4 = this.add.rectangle(22, 25, 8, 15, 0x111111).setOrigin(0.5)

        playerContainer.add([w1, w2, w3, w4, body, hood, windshield, spoiler])
        this.physics.add.existing(playerContainer)
        // @ts-ignore
        playerContainer.body.setSize(38, 65)

        const obstacles = this.physics.add.group()

        // --- SPAWN LOGIC ---
        const spawnObstacle = () => {
          if (isLevelEnding || isGameOver) return
          
          const lane = Phaser.Math.Between(0, 2)
          const type = Phaser.Math.Between(0, 1)
          const obsContainer = this.add.container(lanes[lane], -100)
          
          let h = 70
          if (type === 0) {
            const oBody = this.add.rectangle(0, 0, 42, 75, 0xff3333).setOrigin(0.5)
            const oWind = this.add.rectangle(0, -5, 34, 12, 0x333333).setOrigin(0.5)
            obsContainer.add([oBody, oWind])
          } else {
            h = 100
            const oBody = this.add.rectangle(0, 0, 45, 110, 0xff8800).setOrigin(0.5)
            const oCab = this.add.rectangle(0, -40, 40, 25, 0xcc6600).setOrigin(0.5)
            obsContainer.add([oBody, oCab])
          }

          this.physics.add.existing(obsContainer)
          // @ts-ignore
          obsContainer.body.setSize(38, h)
          // @ts-ignore
          obsContainer.body.setVelocityY(config.speed)
          obstacles.add(obsContainer)
        }

        const spawnTimer = this.time.addEvent({
          delay: config.spawnRate,
          loop: true,
          callback: spawnObstacle
        })

        // --- MOVIMENTO ---
        const movePlayer = (direction: 'left' | 'right') => {
          if (isLevelEnding || isGameOver) return
          if (direction === 'left') {
            currentLane = Math.max(0, currentLane - 1)
          } else {
            currentLane = Math.min(2, currentLane + 1)
          }
          this.tweens.add({
            targets: playerContainer,
            x: lanes[currentLane],
            duration: 120,
            ease: 'Back.easeOut'
          })
        }

        this.input.keyboard.on('keydown-LEFT', () => movePlayer('left'))
        this.input.keyboard.on('keydown-RIGHT', () => movePlayer('right'))
        this.input.keyboard.on('keydown-A', () => movePlayer('left'))
        this.input.keyboard.on('keydown-D', () => movePlayer('right'))
        this.input.on('pointerdown', (p: any) => p.x < 150 ? movePlayer('left') : movePlayer('right'))

        // --- UPDATE ---
        this.events.on('update', () => {
          if (isGameOver) return

          const scrollSpeed = isLevelEnding ? config.speed / 20 : config.speed / 60
          roadLines.getChildren().forEach((line: any) => {
            line.y += scrollSpeed
            if (line.y > 500) line.y = -50
          })
          curbs.getChildren().forEach((curb: any) => {
            curb.y += scrollSpeed
            if (curb.y > 500) curb.y = -30
          })

          if (score >= config.targetScore && !isLevelEnding) {
            isLevelEnding = true
            spawnTimer.destroy()
            this.physics.pause()
            this.cameras.main.flash(500, 255, 255, 255)
            this.tweens.add({
              targets: playerContainer,
              y: -200,
              duration: 1500,
              ease: 'Power2.easeIn',
              onComplete: () => onLevelComplete(score)
            })
          }

          obstacles.getChildren().forEach((obs: any) => {
            if (obs.y > 650) obs.destroy()
          })
        })

        // --- COLLISION ---
        this.physics.add.overlap(playerContainer, obstacles, () => {
          if (isLevelEnding || isGameOver) return
          isGameOver = true
          this.physics.pause()
          this.cameras.main.shake(300, 0.04)
          this.cameras.main.flash(200, 255, 0, 0)
          
          this.time.delayedCall(500, () => {
            onGameOver(score)
          })
        })

        // --- SCORE ---
        this.time.addEvent({
          delay: 100,
          loop: true,
          callback: () => {
            if (!isLevelEnding && !isGameOver) {
              score += 10
              onScore(score)
            }
          }
        })
      }
    }
  })
}