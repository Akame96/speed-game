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
  const [queueProgress, setQueueProgress] = useState(0.2)
  const [isReady, setIsReady] = useState(false)
  const [showLevelUpModal, setShowLevelUpModal] = useState(false)

  const currentConfig = session.current.getConfig()
  const queueStatus = getMockQueueStatus(queueProgress)
  const levelProgress = Math.min((score / currentConfig.targetScore) * 100, 100)

  const initGame = async () => {
    if (gameRef.current) {
      gameRef.current.destroy(true)
    }
    
    const config = session.current.getConfig()
    gameRef.current = await createGame(
      'game-container',
      config,
      (s) => setScore(s),
      (finalScore) => {
        session.current.endRun(finalScore)
        setHighScore(session.current.highScore)
        setScore(0)
      },
      () => {
        setShowLevelUpModal(true)
      }
    )
  }

  const handleNextLevel = () => {
    session.current.checkLevelUp(score)
    setLevel(session.current.level)
    setShowLevelUpModal(false)
    setScore(0)
    initGame()
  }

  useEffect(() => {
    setHighScore(session.current.highScore)
    if (initialized.current) return
    initialized.current = true

    initGame()

    const queueInterval = setInterval(() => {
      setQueueProgress((q) => {
        if (q >= 1) {
          setIsReady(true)
          return 1
        }
        return q + 0.005
      })
    }, 5000)

    return () => {
      clearInterval(queueInterval)
      if (gameRef.current) gameRef.current.destroy(true)
    }
  }, [])

  return (
    <div className="h-screen w-full bg-neutral-950 text-white flex flex-col p-4 md:p-6 gap-4 font-sans select-none overflow-hidden">
      
      {/* HEADER - BRANDING (TOP) */}
      <div className="w-full flex justify-between items-center bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 shadow-xl backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center font-black text-black text-xl shadow-[0_0_20px_rgba(34,197,94,0.3)]">
            G
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 leading-none uppercase">
              Gardlieri Rent
            </h1>
            <p className="text-[8px] text-zinc-500 uppercase tracking-[0.4em] font-bold mt-1">Speed Queue Lounge</p>
          </div>
        </div>

        <div className="flex gap-6 items-center">
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 uppercase font-bold">Livello</p>
            <p className="text-xl font-black text-green-400 leading-none">{level}<span className="text-xs text-zinc-600 font-normal">/10</span></p>
          </div>
          <div className="text-right border-l border-zinc-800 pl-6">
            <p className="text-[10px] text-zinc-500 uppercase font-bold">Record</p>
            <p className="text-xl font-black text-white leading-none">{highScore}</p>
          </div>
        </div>
      </div>

      {/* GAME AREA (MIDDLE - EXPANDABLE) */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center relative bg-zinc-900/30 rounded-[3rem] border border-zinc-800/50 shadow-inner group">
        
        {/* GAME CONTAINER */}
        <div className="h-full w-full max-w-[500px] flex items-center justify-center p-2">
           <div
              id="game-container"
              className="h-full w-full rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.6)] border-4 border-zinc-800 bg-[#1a1a1a]"
            />
        </div>

        {/* LEVEL COMPLETE MODAL (OVERLAY ON GAME) */}
        {showLevelUpModal && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-30 p-8 rounded-[3rem]">
            <div className="bg-zinc-900 border border-green-500/30 p-8 rounded-[2.5rem] text-center shadow-2xl max-w-sm w-full">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter italic">LIVELLO {level} OK!</h3>
              <p className="text-zinc-500 text-xs uppercase font-bold mb-8 tracking-widest">Velocità aumentata per il prossimo!</p>
              <button 
                onClick={handleNextLevel}
                className="w-full bg-green-500 hover:bg-green-400 text-black py-4 rounded-2xl font-black transition-all active:scale-95 uppercase text-lg tracking-tighter"
              >
                Continua Corsa
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER - STATS & QUEUE (BOTTOM) */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
        
        {/* SCORE PANEL */}
        <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 shadow-lg flex items-center gap-6">
          <div className="flex-1">
            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1 tracking-wider">Score Attuale</p>
            <p className="text-4xl font-black text-white tabular-nums leading-none">{score}</p>
          </div>
          <div className="w-[1px] h-10 bg-zinc-800" />
          <div className="flex-1">
            <div className="flex justify-between text-[9px] uppercase font-bold text-zinc-500 mb-2">
              <span>Progresso Livello</span>
              <span className="text-green-500">{Math.floor(levelProgress)}%</span>
            </div>
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-green-500 h-full transition-all duration-300 shadow-[0_0_15px_rgba(34,197,94,0.5)]"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* QUEUE PANEL */}
        <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 shadow-lg flex flex-col justify-center gap-3">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-bold flex items-center gap-2 text-zinc-400 uppercase tracking-widest">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Stato Coda Gardlieri
            </h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase">Posizione: <span className="text-white font-black">{queueStatus.position}°</span></p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-zinc-800 h-3 rounded-full overflow-hidden p-0.5 shadow-inner">
              <div
                className="bg-gradient-to-r from-green-500 via-emerald-400 to-teal-400 h-full rounded-full transition-all duration-1000"
                style={{ width: `${queueProgress * 100}%` }}
              />
            </div>
            <p className="text-xl font-black text-emerald-400 w-20 text-right leading-none">~{queueStatus.estimatedMinutes}m</p>
          </div>
        </div>
      </div>

      {/* READY OVERLAY */}
      {isReady && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-50 p-6">
          <div className="bg-zinc-900 border border-green-500/30 p-10 rounded-[4rem] text-center max-w-md w-full shadow-[0_0_150px_rgba(34,197,94,0.2)]">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(34,197,94,0.3)] animate-bounce">
              <svg className="w-12 h-12 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-4xl font-black mb-2 text-white tracking-tighter italic uppercase">È il tuo turno!</h2>
            <p className="text-zinc-400 mb-10 leading-relaxed font-medium">L'auto di <span className="text-green-400 font-bold">Gardlieri Rent</span> è pronta al desk.</p>
            <button className="w-full bg-white hover:bg-zinc-200 text-black p-6 rounded-3xl font-black text-xl transition-all shadow-2xl active:scale-95 uppercase tracking-tighter">Inizia Noleggio</button>
          </div>
        </div>
      )}

    </div>
  )
}