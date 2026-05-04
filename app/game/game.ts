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
    width: 1200,
    height: 1200,
    parent: containerId,
    backgroundColor: '#0a0a0a',
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
        const lanes = [300, 600, 900]
        let currentLane = 1

        const DEPTH = {
          SHADOW: 1,
          GRASS: 2,
          TREES: 3,
          ROAD: 4,
          CURBS: 5,
          LINES: 6,
          OBSTACLES: 50,
          PLAYER: 100
        }

        // --- BACKGROUND / GRASS ---
        this.add.rectangle(0, 0, 150, 1200, 0x1a4a1a).setOrigin(0).setDepth(DEPTH.GRASS)
        this.add.rectangle(1050, 0, 150, 1200, 0x1a4a1a).setOrigin(0).setDepth(DEPTH.GRASS)
        
        // --- MOVING SCENERY (TREES) ---
        const trees = this.add.group()
        for (let i = 0; i < 10; i++) {
          const x = i % 2 === 0 ? 70 : 1130
          const tree = this.add.circle(x, i * 150, 40 + Math.random() * 30, 0x0d2b0d).setDepth(DEPTH.TREES)
          trees.add(tree)
        }

        // --- ROAD ---
        this.add.rectangle(600, 600, 900, 1200, 0x222222).setDepth(DEPTH.ROAD)
        
        // --- CURBS ---
        const curbs = this.add.group()
        for (let i = 0; i < 30; i++) {
          const color = i % 2 === 0 ? 0xdddddd : 0xcc0000
          curbs.add(this.add.rectangle(145, i * 40, 15, 40, color).setOrigin(0.5).setDepth(DEPTH.CURBS))
          curbs.add(this.add.rectangle(1055, i * 40, 15, 40, color).setOrigin(0.5).setDepth(DEPTH.CURBS))
        }

        const roadLines = this.add.group()
        for (let i = 0; i < 15; i++) {
          const l1 = this.add.rectangle(450, i * 100, 8, 40, 0xffffff, 0.2).setDepth(DEPTH.LINES)
          const l2 = this.add.rectangle(750, i * 100, 8, 40, 0xffffff, 0.2).setDepth(DEPTH.LINES)
          roadLines.add(l1)
          roadLines.add(l2)
        }

        // --- HELPER TO CREATE CAR VISUALS ---
        const createCarContainer = (scene: any, color: number, isPlayer: boolean = false) => {
          const container = scene.add.container(0, 0)
          
          // Shadow
          const shadow = scene.add.rectangle(5, 5, 145, 240, 0x000000, 0.3).setOrigin(0.5)
          
          // Wheels
          const w1 = scene.add.rectangle(-70, -85, 20, 45, 0x111111).setOrigin(0.5)
          const w2 = scene.add.rectangle(70, -85, 20, 45, 0x111111).setOrigin(0.5)
          const w3 = scene.add.rectangle(-70, 85, 20, 45, 0x111111).setOrigin(0.5)
          const w4 = scene.add.rectangle(70, 85, 20, 45, 0x111111).setOrigin(0.5)
          
          // Body
          const body = scene.add.rectangle(0, 0, 140, 230, color).setOrigin(0.5)
          const roof = scene.add.rectangle(0, 15, 110, 120, color).setOrigin(0.5)
          roof.setStrokeStyle(5, 0x000000, 0.1)

          // Windows
          const windshield = scene.add.rectangle(0, -45, 100, 30, 0x223344).setOrigin(0.5)
          const rearWindow = scene.add.rectangle(0, 70, 100, 20, 0x223344).setOrigin(0.5)
          
          // Lights
          const headL = scene.add.rectangle(-50, -110, 25, 15, 0xffffaa).setOrigin(0.5)
          const headR = scene.add.rectangle(50, -110, 25, 15, 0xffffaa).setOrigin(0.5)
          const tailL = scene.add.rectangle(-50, 112, 30, 10, 0xaa0000).setOrigin(0.5)
          const tailR = scene.add.rectangle(50, 112, 30, 10, 0xaa0000).setOrigin(0.5)

          if (isPlayer) {
             const stripe = scene.add.rectangle(0, 0, 12, 230, 0xffffff, 0.2).setOrigin(0.5)
             container.add([shadow, w1, w2, w3, w4, body, stripe, roof, windshield, rearWindow, headL, headR, tailL, tailR])
          } else {
             container.add([shadow, w1, w2, w3, w4, body, roof, windshield, rearWindow, headL, headR, tailL, tailR])
          }
          
          return container
        }

        // --- PLAYER ---
        const player = this.add.rectangle(lanes[currentLane], 1000, 140, 230, 0x00ff00, 0).setDepth(DEPTH.PLAYER)
        this.physics.add.existing(player)
        const playerVisuals = createCarContainer(this, 0x22ee66, true).setDepth(DEPTH.PLAYER)

        // --- OBSTACLES GROUP ---
        const obstacles = this.physics.add.group()

        // --- SPAWN FUNCTION ---
        const spawnObstacle = () => {
          if (isLevelEnding || isGameOver) return
          const lane = Phaser.Math.Between(0, 2)
          const isTruck = Phaser.Math.Between(0, 10) > 7
          const x = lanes[lane]
          const y = -400
          
          const obsColor = isTruck ? 0xcc7722 : [0x3366ff, 0xcc3333, 0x777777, 0xeeeeee][Phaser.Math.Between(0, 3)]
          const obs = this.add.rectangle(x, y, 140, isTruck ? 400 : 230, 0xffffff, 0).setDepth(DEPTH.OBSTACLES)
          this.physics.add.existing(obs)
          
          let visual: any
          if (isTruck) {
            visual = this.add.container(0, 0)
            const shadow = this.add.rectangle(7, 7, 150, 400, 0x000000, 0.3).setOrigin(0.5)
            const trailer = this.add.rectangle(0, 50, 140, 300, obsColor).setOrigin(0.5)
            const cab = this.add.rectangle(0, -140, 130, 100, obsColor).setOrigin(0.5)
            const wind = this.add.rectangle(0, -160, 110, 25, 0x223344).setOrigin(0.5)
            const lightL = this.add.rectangle(-45, -185, 25, 12, 0xffffaa).setOrigin(0.5)
            const lightR = this.add.rectangle(45, -185, 25, 12, 0xffffaa).setOrigin(0.5)
            visual.add([shadow, trailer, cab, wind, lightL, lightR])
          } else {
            visual = createCarContainer(this, obsColor)
          }
          
          visual.setDepth(DEPTH.OBSTACLES)
          obstacles.add(obs)
          obs.setData('visual', visual)
          obs.body.setVelocityY(config.speed * 2.8) 
        }

        this.time.addEvent({ delay: config.spawnRate, loop: true, callback: spawnObstacle })

        // --- MOVEMENT ---
        const movePlayer = (direction: 'left' | 'right') => {
          if (isLevelEnding || isGameOver) return
          if (direction === 'left') currentLane = Math.max(0, currentLane - 1)
          else currentLane = Math.min(2, currentLane + 1)
          this.tweens.add({ targets: player, x: lanes[currentLane], duration: 150, ease: 'Cubic.easeOut' })
        }

        this.input.keyboard.on('keydown-LEFT', () => movePlayer('left'))
        this.input.keyboard.on('keydown-RIGHT', () => movePlayer('right'))
        this.input.keyboard.on('keydown-A', () => movePlayer('left'))
        this.input.keyboard.on('keydown-D', () => movePlayer('right'))
        this.input.on('pointerdown', (p: any) => p.x < 600 ? movePlayer('left') : movePlayer('right'))

        // --- UPDATE LOOP ---
        this.events.on('update', () => {
          if (isGameOver) return
          playerVisuals.setPosition(player.x, player.y)
          
          const scrollSpeed = (isLevelEnding ? config.speed / 8 : config.speed / 20)
          roadLines.getChildren().forEach((line: any) => { line.y += scrollSpeed; if (line.y > 1200) line.y = -100 })
          curbs.getChildren().forEach((curb: any) => { curb.y += scrollSpeed; if (curb.y > 1200) curb.y = -40 })
          trees.getChildren().forEach((tree: any) => { tree.y += scrollSpeed * 0.8; if (tree.y > 1300) { tree.y = -100; tree.x = Math.random() > 0.5 ? 70 : 1130 } })

          obstacles.getChildren().forEach((obs: any) => {
            const visual = obs.getData('visual')
            if (visual) visual.setPosition(obs.x, obs.y)
            if (obs.y > 1600) { if (visual) visual.destroy(); obs.destroy() }
          })

          if (score >= config.targetScore && !isLevelEnding) {
            isLevelEnding = true
            this.physics.pause()
            this.cameras.main.flash(500, 255, 255, 255)
            this.tweens.add({ targets: [player, playerVisuals], y: -500, duration: 1500, ease: 'Power2.easeIn', onComplete: () => onLevelComplete(score) })
          }
        })

        // --- COLLISIONS ---
        this.physics.add.overlap(player, obstacles, (p: any, o: any) => {
          if (isLevelEnding || isGameOver) return
          isGameOver = true
          this.physics.pause()
          this.cameras.main.shake(300, 0.05)
          this.cameras.main.flash(200, 255, 0, 0)
          for (let i = 0; i < 20; i++) {
            const part = this.add.rectangle(player.x, player.y, 25, 25, 0xffaa00).setDepth(DEPTH.PLAYER + 1)
            this.physics.add.existing(part)
            part.body.setVelocity(Phaser.Math.Between(-500, 500), Phaser.Math.Between(-500, 500))
            this.tweens.add({ targets: part, alpha: 0, scale: 2, duration: 800, onComplete: () => part.destroy() })
          }
          this.time.delayedCall(800, () => onGameOver(score))
        })

        this.time.addEvent({ delay: 100, loop: true, callback: () => { if (!isLevelEnding && !isGameOver) { score += 10; onScore(score) } } })
      }
    }
  })
}
