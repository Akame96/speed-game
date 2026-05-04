'use client'

import { useEffect, useRef, useState } from 'react'
import { GameSession, getMockQueueStatus } from '@/app/game/engine'
import { createGame } from '@/app/game/game'

export default function GamePage() {
  const session = useRef(new GameSession())
  const gameRef = useRef<any>(null)
  const initialized = useRef(false)

  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [unlockedLevels, setUnlockedLevels] = useState(1)
  const [queueProgress, setQueueProgress] = useState(0.2)
  const [isReady, setIsReady] = useState(false)
  
  const [showLevelUpModal, setShowLevelUpModal] = useState(false)
  const [showGameOverModal, setShowGameOverModal] = useState(false)
  const [showLevelSelector, setShowLevelSelector] = useState(false)

  const [gameStarted, setGameStarted] = useState(false)
  const [gamePaused, setGamePaused] = useState(false)

  const currentConfig = session.current.getConfig()
  const queueStatus = getMockQueueStatus(queueProgress)
  const levelProgress = Math.min((score / currentConfig.targetScore) * 100, 100)

  const initGame = async (targetLevel?: number) => {
    if (gameRef.current) {
      gameRef.current.destroy(true)
      gameRef.current = null
    }
    
    if (targetLevel) {
      session.current.setLevel(targetLevel)
      setLevel(targetLevel)
    }

    const config = session.current.getConfig()
    setGameStarted(true)
    setGamePaused(false)
    
    setTimeout(async () => {
      gameRef.current = await createGame(
        'game-container',
        config,
        (s) => setScore(s),
        (s) => {
          session.current.endRun(s)
          setHighScore(session.current.highScore)
          setShowGameOverModal(true)
        },
        (s) => {
          session.current.endRun(s)
          setHighScore(session.current.highScore)
          setShowLevelUpModal(true)
        }
      )
    }, 100)
  }

  const togglePause = () => {
    if (!gameRef.current) return
    const sceneManager = gameRef.current.scene
    if (gamePaused) {
      sceneManager.resume('MainScene')
      setGamePaused(false)
    } else {
      sceneManager.pause('MainScene')
      setGamePaused(true)
    }
  }

  const handleNextLevel = () => {
    session.current.checkLevelUp(score)
    setLevel(session.current.level)
    setUnlockedLevels(session.current.unlockedLevels)
    setShowLevelUpModal(false)
    setScore(0)
    initGame()
  }

  const handleRetry = () => {
    setShowGameOverModal(false)
    setScore(0)
    initGame()
  }

  const selectLevel = (l: number) => {
    setShowLevelSelector(false)
    setScore(0)
    initGame(l)
  }

  // --- INDEPENDENT QUEUE LOOP ---
  useEffect(() => {
    const queueInterval = setInterval(() => {
      setQueueProgress((q) => {
        if (q >= 1) {
          setIsReady(true)
          return 1
        }
        return q + 0.005
      })
    }, 4000)
    return () => clearInterval(queueInterval)
  }, [])

  // --- INITIAL LOAD ---
  useEffect(() => {
    setHighScore(session.current.highScore)
    setUnlockedLevels(session.current.unlockedLevels)
    setLevel(session.current.level)
    
    return () => {
      if (gameRef.current) gameRef.current.destroy(true)
    }
  }, [])

  return (
    <div className="h-screen w-full bg-neutral-950 text-white flex flex-col p-4 md:p-6 gap-4 font-sans select-none overflow-hidden text-sm md:text-base">
      
      {/* HEADER */}
      <div className="w-full flex justify-between items-center bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 shadow-xl backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center font-black text-black text-xl shadow-[0_0_20px_rgba(34,197,94,0.3)]">G</div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 leading-none uppercase text-nowrap">Gardlieri Rent</h1>
            <p className="text-[8px] text-zinc-500 uppercase tracking-[0.4em] font-bold mt-1 text-nowrap">Speed Queue Lounge</p>
          </div>
        </div>

        <div className="flex gap-4 md:gap-8 items-center">
          {gameStarted && (
            <button 
              onClick={togglePause}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all active:scale-95 font-bold uppercase text-[10px] ${
                gamePaused 
                  ? 'bg-green-500/20 border-green-500 text-green-400 hover:bg-green-500/30' 
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {gamePaused ? (
                <>
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Riprendi
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-zinc-500 rounded-full" />
                  Pausa
                </>
              )}
            </button>
          )}

          <button 
            onClick={() => {
              setUnlockedLevels(session.current.unlockedLevels)
              setShowLevelSelector(!showLevelSelector)
            }}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-xl border border-zinc-700 transition-all active:scale-95"
          >
            <span className="text-[10px] font-bold uppercase text-zinc-400 hidden xs:block">Mappa</span>
            <span className="text-lg font-black text-green-400">{level}</span>
          </button>
          <div className="text-right border-l border-zinc-800 pl-4 md:pl-8">
            <p className="text-[10px] text-zinc-500 uppercase font-bold">Record</p>
            <p className="text-xl font-black text-white leading-none">{highScore}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 relative">
        
        {/* LEVEL SELECTOR SIDEBAR (ROUNDED FLOATING PANEL) */}
        {showLevelSelector && (
          <div className="absolute left-4 top-4 bottom-4 w-64 bg-zinc-900/95 backdrop-blur-xl z-50 border border-zinc-800 p-6 flex flex-col gap-4 animate-in slide-in-from-left duration-300 rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center mb-2 text-nowrap">
              <h3 className="font-black uppercase tracking-tighter text-zinc-400">Livelli Sbloccati</h3>
              <button onClick={() => setShowLevelSelector(false)} className="text-zinc-600 hover:text-white px-2 text-xl">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-2 custom-scrollbar">
              {[...Array(10)].map((_, i) => {
                const l = i + 1
                const isUnlocked = l <= unlockedLevels
                const isCurrent = l === level
                return (
                  <button
                    key={l}
                    disabled={!isUnlocked}
                    onClick={() => selectLevel(l)}
                    className={`h-20 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${
                      isCurrent 
                        ? 'border-green-500 bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]' 
                        : isUnlocked 
                          ? 'border-zinc-700 bg-zinc-800 hover:border-zinc-500 hover:bg-zinc-700' 
                          : 'border-zinc-800 bg-zinc-900 opacity-40 grayscale cursor-not-allowed'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase opacity-50">Lvl</span>
                    <span className="text-2xl font-black">{l}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* GAME AREA (FULL SPACE) */}
        <div className="flex-1 min-h-0 flex items-center justify-center relative bg-zinc-900/30 rounded-[3rem] border border-zinc-800/50 shadow-inner overflow-hidden">
             <div id="game-container" className="h-full w-full bg-[#0a0a0a]" />

          {/* OVERLAYS */}
          {!gameStarted && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40 p-8 rounded-[3rem]">
              <div className="bg-zinc-900 border border-green-500/30 p-10 rounded-[3rem] text-center shadow-2xl max-w-sm w-full animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-500 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-12 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                  <svg className="w-12 h-12 text-black ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </div>
                <h3 className="text-3xl font-black text-white mb-2 uppercase italic tracking-tighter">PRONTO?</h3>
                <p className="text-zinc-500 text-xs uppercase font-bold mb-10 tracking-widest">Evita il traffico e raggiungi il desk!</p>
                <button onClick={() => initGame()} className="w-full bg-green-500 hover:bg-green-400 text-black py-5 rounded-[2rem] font-black transition-all active:scale-95 uppercase text-xl tracking-tighter shadow-lg shadow-green-500/20">Inizia Gioco</button>
              </div>
            </div>
          )}

          {gamePaused && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-40 p-8 rounded-[3rem]">
              <div className="bg-zinc-900 border border-zinc-700 p-10 rounded-[3rem] text-center shadow-2xl max-w-sm w-full animate-in zoom-in duration-200">
                <div className="w-20 h-20 bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                </div>
                <h3 className="text-3xl font-black text-white mb-2 uppercase italic tracking-tighter">IN PAUSA</h3>
                <p className="text-zinc-500 text-xs uppercase font-bold mb-10 tracking-widest">Il tempo è fermo, riprendi quando vuoi.</p>
                <button onClick={togglePause} className="w-full bg-white hover:bg-zinc-200 text-black py-5 rounded-[2rem] font-black transition-all active:scale-95 uppercase text-xl tracking-tighter">Riprendi</button>
              </div>
            </div>
          )}

          {showGameOverModal && (
            <div className="absolute inset-0 bg-red-500/20 backdrop-blur-md flex items-center justify-center z-40 p-8 rounded-[3rem]">
              <div className="bg-zinc-900 border border-red-500/30 p-8 rounded-[2.5rem] text-center shadow-2xl max-w-sm w-full animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-black text-white">!</span>
                </div>
                <h3 className="text-2xl font-black text-white mb-2 uppercase italic text-nowrap">MISSIONE FALLITA</h3>
                <p className="text-zinc-500 text-xs uppercase font-bold mb-8">L'auto ha subito troppi danni!</p>
                <button onClick={handleRetry} className="w-full bg-red-500 hover:bg-red-400 text-white py-4 rounded-2xl font-black transition-all active:scale-95 uppercase text-lg tracking-tighter">Riprova</button>
              </div>
            </div>
          )}

          {showLevelUpModal && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-40 p-8 rounded-[3rem]">
              <div className="bg-zinc-900 border border-green-500/30 p-8 rounded-[2.5rem] text-center shadow-2xl max-w-sm w-full animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                   <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-2xl font-black text-white mb-2 uppercase italic">TRAGUARDO!</h3>
                <p className="text-zinc-500 text-xs uppercase font-bold mb-8 text-nowrap">Livello superato con successo.</p>
                <button onClick={handleNextLevel} className="w-full bg-green-500 hover:bg-green-400 text-black py-4 rounded-2xl font-black transition-all active:scale-95 uppercase text-lg tracking-tighter">Prossimo</button>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR RIGHT */}
        <div className="w-full md:w-80 flex flex-col gap-4 shrink-0 overflow-hidden">
            <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-lg flex-1 flex flex-col justify-center">
              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1 tracking-wider opacity-60">Score Attuale</p>
              <p className="text-6xl font-black text-white tabular-nums leading-none mb-8">{score}</p>
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-500"><span>Avanzamento Livello</span><span className="text-green-500 font-black">{Math.floor(levelProgress)}%</span></div>
                <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden p-0.5">
                  <div className="bg-green-500 h-full rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(34,197,94,0.4)]" style={{ width: `${levelProgress}%` }} />
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-lg flex-1 flex flex-col justify-center gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-bold flex items-center gap-2 text-zinc-400 uppercase tracking-widest"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />Coda Gardlieri</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase">Pos: <span className="text-white font-black">{queueStatus.position}°</span></p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex-1 bg-zinc-800 h-4 rounded-full overflow-hidden p-1 shadow-inner">
                  <div className="bg-gradient-to-r from-green-500 to-teal-400 h-full rounded-full transition-all duration-1000" style={{ width: `${queueProgress * 100}%` }} />
                </div>
                <div className="text-right">
                   <p className="text-[9px] text-zinc-500 font-bold uppercase mb-1">Attesa</p>
                   <p className="text-2xl font-black text-emerald-400 leading-none">~{queueStatus.estimatedMinutes}m</p>
                </div>
              </div>
            </div>
        </div>
      </div>

      {/* FINAL TURN OVERLAY */}
      {isReady && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-50 p-6">
          <div className="bg-zinc-900 border border-green-500/30 p-10 rounded-[4rem] text-center max-w-md w-full shadow-[0_0_150px_rgba(34,197,94,0.2)]">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(34,197,94,0.3)] animate-bounce">
              <svg className="w-12 h-12 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-3xl font-black mb-2 text-white tracking-tighter italic uppercase leading-none">È IL TUO TURNO!</h2>
            <p className="text-zinc-400 mb-10 leading-relaxed font-medium">L'auto di <span className="text-green-400 font-bold">Gardlieri Rent</span> è pronta al desk.</p>
            <button className="w-full bg-white hover:bg-zinc-200 text-black p-6 rounded-3xl font-black text-xl transition-all shadow-2xl active:scale-95 uppercase tracking-tighter">Inizia Noleggio</button>
          </div>
        </div>
      )}
    </div>
  )
}
