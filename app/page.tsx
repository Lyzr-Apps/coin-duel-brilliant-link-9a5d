'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import {
  FaCoins,
  FaTrophy,
  FaSkull,
  FaWallet,
  FaFire,
  FaGlassCheers,
  FaHeart,
  FaBinoculars,
  FaLightbulb,
  FaChevronDown,
  FaChevronUp,
  FaDice,
} from 'react-icons/fa'

// ─── Constants ──────────────────────────────────────────────────────

const AGENT_ID = '699a0c496c4c5162bafb2ba1'

const OPPONENT_NAMES = [
  'CoinKing',
  'FlipMaster',
  'LuckyDime',
  'PennyWise',
  'QuarterBack',
  'NickelNinja',
  'DimeDrop',
  'CashCow',
  'BitBoss',
  'TossKing',
]

// ─── Types ──────────────────────────────────────────────────────────

type GameState = 'idle' | 'matching' | 'matched' | 'picking' | 'flipping' | 'result'
type CoinSide = 'heads' | 'tails'
type Mood = 'hype' | 'celebration' | 'consolation' | 'anticipation' | 'tip'

interface GameRecord {
  id: number
  opponent: string
  result: 'win' | 'loss'
  amount: number
  call: CoinSide
  landed: CoinSide
  timestamp: string
}

interface CompanionData {
  commentary: string
  mood: string
  emoji_reaction: string
}

// ─── ErrorBoundary ──────────────────────────────────────────────────

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-400 mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-amber-500 text-gray-950 rounded-md text-sm font-semibold"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function getMoodIcon(mood: string) {
  switch (mood) {
    case 'hype':
      return <FaFire className="text-orange-400" />
    case 'celebration':
      return <FaGlassCheers className="text-green-400" />
    case 'consolation':
      return <FaHeart className="text-blue-400" />
    case 'anticipation':
      return <FaBinoculars className="text-purple-400" />
    case 'tip':
      return <FaLightbulb className="text-yellow-400" />
    default:
      return <FaCoins className="text-amber-400" />
  }
}

function getMoodBorderColor(mood: string) {
  switch (mood) {
    case 'hype':
      return 'border-orange-500/40'
    case 'celebration':
      return 'border-green-500/40'
    case 'consolation':
      return 'border-blue-500/40'
    case 'anticipation':
      return 'border-purple-500/40'
    case 'tip':
      return 'border-yellow-500/40'
    default:
      return 'border-amber-500/40'
  }
}

function getMoodBgColor(mood: string) {
  switch (mood) {
    case 'hype':
      return 'bg-orange-500/10'
    case 'celebration':
      return 'bg-green-500/10'
    case 'consolation':
      return 'bg-blue-500/10'
    case 'anticipation':
      return 'bg-purple-500/10'
    case 'tip':
      return 'bg-yellow-500/10'
    default:
      return 'bg-amber-500/10'
  }
}

function getRandomOpponent(): string {
  return OPPONENT_NAMES[Math.floor(Math.random() * OPPONENT_NAMES.length)]
}

function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ─── Companion Panel ────────────────────────────────────────────────

function CompanionPanel({
  commentary,
  mood,
  emojiReaction,
  loading,
}: {
  commentary: string
  mood: string
  emojiReaction: string
  loading: boolean
}) {
  return (
    <div
      className={`rounded-xl border ${getMoodBorderColor(mood)} ${getMoodBgColor(mood)} p-4 transition-all duration-500`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5 text-lg">{getMoodIcon(mood)}</div>
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-sm italic">Thinking</span>
              <span className="inline-flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          ) : (
            <>
              <p className="text-gray-200 text-sm leading-relaxed">{commentary || 'Ready for action!'}</p>
              {emojiReaction && (
                <p className="text-xs text-gray-500 mt-1 italic">{emojiReaction}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Win Particles ──────────────────────────────────────────────────

function WinParticles() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; color: string; delay: number; size: number }>>([])

  useEffect(() => {
    const newParticles = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: ['bg-amber-400', 'bg-green-400', 'bg-yellow-300', 'bg-purple-400', 'bg-pink-400', 'bg-blue-400'][Math.floor(Math.random() * 6)],
      delay: Math.random() * 1000,
      size: Math.random() * 6 + 4,
    }))
    setParticles(newParticles)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute rounded-sm ${p.color} opacity-80`}
          style={{
            left: `${p.x}%`,
            bottom: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            animation: `particleRise 2s ease-out ${p.delay}ms forwards`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Coin Component ─────────────────────────────────────────────────

function CoinDisplay({
  flipping,
  result,
}: {
  flipping: boolean
  result: CoinSide | null
}) {
  const finalRotation = result === 'tails' ? 1980 : 1800

  return (
    <div className="flex items-center justify-center" style={{ perspective: '600px' }}>
      <div
        className="relative w-28 h-28 md:w-32 md:h-32"
        style={{
          transformStyle: 'preserve-3d',
          transition: flipping ? 'none' : 'transform 0.3s ease',
          animation: flipping ? `coinSpin 2.5s cubic-bezier(0.22,1,0.36,1) forwards` : 'none',
          // Use CSS custom property for final rotation
          ...(flipping ? { '--coin-final': `${finalRotation}deg` } as React.CSSProperties : {}),
          transform: !flipping && result ? `rotateY(${result === 'tails' ? 180 : 0}deg)` : 'rotateY(0deg)',
        }}
      >
        {/* Front - Heads */}
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center text-3xl md:text-4xl font-extrabold text-white shadow-lg shadow-amber-500/30"
          style={{
            backfaceVisibility: 'hidden',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
            border: '3px solid #fbbf24',
          }}
        >
          H
        </div>
        {/* Back - Tails */}
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center text-3xl md:text-4xl font-extrabold text-white shadow-lg shadow-amber-700/30"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(135deg, #d97706 0%, #b45309 50%, #92400e 100%)',
            border: '3px solid #d97706',
          }}
        >
          T
        </div>
      </div>
    </div>
  )
}

// ─── Game History Panel ─────────────────────────────────────────────

function GameHistoryPanel({ history }: { history: GameRecord[] }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/40 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-300 hover:bg-gray-700/30 transition-colors"
      >
        <span className="font-medium">Game History ({history.length})</span>
        {expanded ? <FaChevronUp className="text-gray-500" /> : <FaChevronDown className="text-gray-500" />}
      </button>
      {expanded && (
        <div className="border-t border-gray-700/50 max-h-60 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-4">No games yet</p>
          ) : (
            <div className="divide-y divide-gray-700/30">
              {history.map((game) => (
                <div key={game.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${game.result === 'win' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                    >
                      {game.result === 'win' ? 'W' : 'L'}
                    </span>
                    <span className="text-gray-300">vs {game.opponent}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono text-xs font-semibold ${game.result === 'win' ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {game.result === 'win' ? '+$0.95' : '-$1.00'}
                    </span>
                    <span className="text-gray-600 text-xs">{game.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Agent Status ───────────────────────────────────────────────────

function AgentStatusPanel({ active }: { active: boolean }) {
  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/40 p-3">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-gray-400">CoinFlip Companion AI</span>
        </div>
        <span className="text-gray-600 font-mono">{active ? 'Active' : 'Idle'}</span>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function Page() {
  // Game state
  const [gameState, setGameState] = useState<GameState>('idle')
  const [balance, setBalance] = useState(10.0)
  const [wins, setWins] = useState(0)
  const [losses, setLosses] = useState(0)
  const [opponent, setOpponent] = useState('')
  const [playerCall, setPlayerCall] = useState<CoinSide | null>(null)
  const [flipResult, setFlipResult] = useState<CoinSide | null>(null)
  const [didWin, setDidWin] = useState<boolean | null>(null)
  const [gameHistory, setGameHistory] = useState<GameRecord[]>([])
  const [isFlipping, setIsFlipping] = useState(false)
  const [gameIdCounter, setGameIdCounter] = useState(0)

  // Companion state
  const [companionData, setCompanionData] = useState<CompanionData>({
    commentary: '',
    mood: 'tip',
    emoji_reaction: '',
  })
  const [companionLoading, setCompanionLoading] = useState(false)
  const [agentActive, setAgentActive] = useState(false)

  // Streak tracking
  const [winStreak, setWinStreak] = useState(0)

  // Timers ref
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const autoResetRef = useRef<NodeJS.Timeout | null>(null)

  // ─── AI Agent Call ─────────────────────────────────────────────

  const callCompanion = useCallback(async (message: string) => {
    setCompanionLoading(true)
    setAgentActive(true)
    try {
      const result = await callAIAgent(message, AGENT_ID)
      if (result.success) {
        let parsed = result?.response?.result
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed)
          } catch {
            // use as-is
          }
        }
        setCompanionData({
          commentary: parsed?.commentary ?? '',
          mood: parsed?.mood ?? 'tip',
          emoji_reaction: parsed?.emoji_reaction ?? '',
        })
      }
    } catch {
      // Silently fail - game still works without companion
    } finally {
      setCompanionLoading(false)
      setAgentActive(false)
    }
  }, [])

  // ─── Cleanup timers ───────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (autoResetRef.current) clearTimeout(autoResetRef.current)
    }
  }, [])

  // ─── Welcome message on load ─────────────────────────────────

  useEffect(() => {
    callCompanion(
      `Player just opened CoinFlip Duel. Balance: $10.00. Record: 0W-0L. Give a welcome tip or encouragement.`
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Game Flow Functions ──────────────────────────────────────

  const startMatchmaking = () => {
    if (balance < 1) return
    setGameState('matching')
    setPlayerCall(null)
    setFlipResult(null)
    setDidWin(null)

    callCompanion(`Player is searching for an opponent. Balance: $${balance.toFixed(2)}. Record: ${wins}W-${losses}L. Build anticipation!`)

    const delay = getRandomDelay(2000, 4000)
    timerRef.current = setTimeout(() => {
      const opp = getRandomOpponent()
      setOpponent(opp)
      setGameState('matched')

      callCompanion(`Player matched against ${opp}! Hype up the duel! Balance: $${balance.toFixed(2)}.`)

      // Auto-transition to picking after 1.5s
      timerRef.current = setTimeout(() => {
        setGameState('picking')
      }, 1500)
    }, delay)
  }

  const cancelMatchmaking = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setGameState('idle')
  }

  const pickSide = (side: CoinSide) => {
    setPlayerCall(side)
    setGameState('flipping')
    setIsFlipping(true)

    // Determine random result
    const landed: CoinSide = Math.random() < 0.5 ? 'heads' : 'tails'
    setFlipResult(landed)

    // After animation completes (2.5s), show result
    timerRef.current = setTimeout(() => {
      setIsFlipping(false)
      const won = side === landed
      setDidWin(won)
      setGameState('result')

      if (won) {
        setBalance((prev) => parseFloat((prev + 0.95).toFixed(2)))
        setWins((prev) => prev + 1)
        setWinStreak((prev) => prev + 1)
        const newStreak = winStreak + 1
        const newBalance = parseFloat((balance + 0.95).toFixed(2))
        setGameIdCounter((prev) => {
          const newId = prev + 1
          setGameHistory((h) => [
            {
              id: newId,
              opponent,
              result: 'win',
              amount: 0.95,
              call: side,
              landed,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
            ...h,
          ])
          return newId
        })
        callCompanion(
          `Player WON against ${opponent}! They called ${side} correctly - it landed ${landed}. Balance now: $${newBalance.toFixed(2)}. Win streak: ${newStreak}! Celebrate!`
        )
      } else {
        setBalance((prev) => parseFloat((prev - 1.0).toFixed(2)))
        setLosses((prev) => prev + 1)
        setWinStreak(0)
        const newBalance = parseFloat((balance - 1.0).toFixed(2))
        setGameIdCounter((prev) => {
          const newId = prev + 1
          setGameHistory((h) => [
            {
              id: newId,
              opponent,
              result: 'loss',
              amount: -1.0,
              call: side,
              landed,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
            ...h,
          ])
          return newId
        })
        callCompanion(
          `Player LOST against ${opponent}. They called ${side} but it was ${landed}. Balance now: $${newBalance.toFixed(2)}. Console them.`
        )
      }

      // Auto-return to idle after 5s
      autoResetRef.current = setTimeout(() => {
        setGameState('idle')
      }, 5000)
    }, 2500)
  }

  const playAgain = () => {
    if (autoResetRef.current) clearTimeout(autoResetRef.current)
    setGameState('idle')
  }

  // ─── Stats ────────────────────────────────────────────────────

  const totalGames = wins + losses
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0
  const netProfit = parseFloat((balance - 10.0).toFixed(2))

  // ─── Render ───────────────────────────────────────────────────

  return (
    <ErrorBoundary>
      {/* Inline keyframes via a hidden style tag alternative: using a global-safe technique */}
      <div
        className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/50 to-gray-950 text-white flex flex-col"
        style={{
          // @ts-ignore -- injecting keyframes via CSS custom property trick
        }}
      >
        {/* CSS Keyframes injected via dangerouslySetInnerHTML on a noscript-like workaround */}
        {/* We use Tailwind animate classes + inline styles instead to avoid <style> tags */}

        {/* ─── Header ───────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-4 py-3 bg-gray-900/80 border-b border-gray-800/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <FaCoins className="text-amber-400 text-xl" />
            <h1 className="text-lg font-bold bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
              CoinFlip Duel
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <FaWallet className="text-amber-400 text-xs" />
              <span
                className={`font-mono font-bold transition-colors duration-500 ${balance >= 10 ? 'text-green-400' : balance >= 5 ? 'text-amber-400' : 'text-red-400'}`}
              >
                ${balance.toFixed(2)}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <FaTrophy className="text-green-400" /> {wins}
              </span>
              <span className="flex items-center gap-1">
                <FaSkull className="text-red-400" /> {losses}
              </span>
            </div>
            {/* Mobile W/L */}
            <div className="sm:hidden flex items-center gap-2 text-xs text-gray-400">
              <span className="text-green-400">{wins}W</span>
              <span className="text-red-400">{losses}L</span>
            </div>
          </div>
        </header>

        {/* ─── Main Content ─────────────────────────────────────── */}
        <main className="flex-1 flex flex-col items-center justify-start px-4 py-6 overflow-y-auto">
          <div className="w-full max-w-lg space-y-5">

            {/* ─── Game Area ────────────────────────────────────── */}
            <div className="relative rounded-2xl border border-gray-700/50 bg-gray-900/60 backdrop-blur-sm overflow-hidden">

              {/* Win particles overlay */}
              {gameState === 'result' && didWin && <WinParticles />}

              <div className="p-6 space-y-6">

                {/* ── STATE: IDLE ─────────────────────────────── */}
                {gameState === 'idle' && (
                  <div className="text-center space-y-5">
                    <div className="space-y-2">
                      <FaDice className="text-5xl text-amber-400/60 mx-auto" />
                      <p className="text-gray-400 text-sm">Tap to find an opponent</p>
                    </div>

                    <button
                      onClick={startMatchmaking}
                      disabled={balance < 1}
                      className={`relative w-full max-w-xs mx-auto min-h-[56px] rounded-xl font-bold text-lg transition-all duration-300 ${
                        balance < 1
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-amber-500 to-amber-600 text-gray-950 hover:from-amber-400 hover:to-amber-500 hover:shadow-lg hover:shadow-amber-500/25 active:scale-95'
                      }`}
                      style={
                        balance >= 1
                          ? {
                              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                            }
                          : undefined
                      }
                    >
                      <span className="flex items-center justify-center gap-2">
                        <FaCoins /> PLAY $1
                      </span>
                    </button>

                    {balance < 1 && (
                      <p className="text-red-400 text-xs">Insufficient balance</p>
                    )}

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-3 text-center pt-2">
                      <div className="rounded-lg bg-gray-800/50 p-3">
                        <p className="text-xs text-gray-500">Games</p>
                        <p className="text-lg font-bold text-gray-200">{totalGames}</p>
                      </div>
                      <div className="rounded-lg bg-gray-800/50 p-3">
                        <p className="text-xs text-gray-500">Win Rate</p>
                        <p className={`text-lg font-bold ${winRate >= 50 ? 'text-green-400' : winRate > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                          {winRate}%
                        </p>
                      </div>
                      <div className="rounded-lg bg-gray-800/50 p-3">
                        <p className="text-xs text-gray-500">Net P/L</p>
                        <p className={`text-lg font-bold font-mono ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Win streak badge */}
                    {winStreak >= 2 && (
                      <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full px-3 py-1 text-xs font-semibold">
                        <FaFire /> {winStreak} Win Streak!
                      </div>
                    )}
                  </div>
                )}

                {/* ── STATE: MATCHING ────────────────────────── */}
                {gameState === 'matching' && (
                  <div className="text-center space-y-6 py-4">
                    {/* Radar-like search animation */}
                    <div className="relative w-32 h-32 mx-auto">
                      <div className="absolute inset-0 rounded-full border-2 border-purple-500/20" />
                      <div className="absolute inset-3 rounded-full border-2 border-purple-500/30" />
                      <div className="absolute inset-6 rounded-full border-2 border-purple-500/40" />
                      <div
                        className="absolute inset-0 rounded-full border-t-2 border-purple-400"
                        style={{ animation: 'spin 1.5s linear infinite' }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FaDice className="text-3xl text-purple-400 animate-pulse" />
                      </div>
                    </div>

                    <div>
                      <p className="text-lg font-semibold text-gray-200">Finding opponent</p>
                      <p className="text-sm text-gray-500 flex items-center justify-center gap-0.5 mt-1">
                        Searching
                        <span className="inline-flex gap-0.5 ml-0.5">
                          <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                          <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                        </span>
                      </p>
                    </div>

                    {/* Player vs ? */}
                    <div className="flex items-center justify-center gap-6">
                      <div className="text-center">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg font-bold border-2 border-indigo-400/50">
                          You
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Player</p>
                      </div>
                      <span className="text-gray-600 text-sm font-bold">VS</span>
                      <div className="text-center">
                        <div className="w-14 h-14 rounded-full bg-gray-700/50 flex items-center justify-center text-2xl font-bold text-gray-500 border-2 border-gray-600/50 animate-pulse">
                          ?
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Opponent</p>
                      </div>
                    </div>

                    <button
                      onClick={cancelMatchmaking}
                      className="text-sm text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* ── STATE: MATCHED ─────────────────────────── */}
                {gameState === 'matched' && (
                  <div className="text-center space-y-5 py-4">
                    <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Opponent Found!</p>

                    <div className="flex items-center justify-center gap-6">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold border-2 border-indigo-400/50 shadow-lg shadow-indigo-500/20">
                          You
                        </div>
                        <p className="text-sm text-gray-300 mt-2 font-medium">Player</p>
                      </div>

                      <div className="relative">
                        <span
                          className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-amber-600"
                          style={{
                            textShadow: '0 0 30px rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          VS
                        </span>
                        <div className="absolute -inset-2 bg-amber-500/10 rounded-full blur-xl" />
                      </div>

                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-xl font-bold border-2 border-red-400/50 shadow-lg shadow-red-500/20">
                          {opponent.charAt(0)}
                        </div>
                        <p className="text-sm text-gray-300 mt-2 font-medium">{opponent}</p>
                      </div>
                    </div>

                    <p className="text-gray-500 text-xs animate-pulse">Get ready...</p>
                  </div>
                )}

                {/* ── STATE: PICKING ──────────────────────────── */}
                {gameState === 'picking' && (
                  <div className="text-center space-y-5 py-4">
                    <p className="text-sm text-gray-400">Make your call!</p>
                    <p className="text-xs text-gray-600">
                      vs <span className="text-gray-400 font-medium">{opponent}</span>
                    </p>

                    <CoinDisplay flipping={false} result={null} />

                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => pickSide('heads')}
                        className="flex-1 max-w-[140px] min-h-[56px] rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-gray-950 font-bold text-lg hover:from-amber-400 hover:to-amber-500 active:scale-95 transition-all shadow-lg shadow-amber-500/20"
                      >
                        Heads
                      </button>
                      <button
                        onClick={() => pickSide('tails')}
                        className="flex-1 max-w-[140px] min-h-[56px] rounded-xl bg-gradient-to-br from-amber-700 to-amber-800 text-amber-100 font-bold text-lg hover:from-amber-600 hover:to-amber-700 active:scale-95 transition-all shadow-lg shadow-amber-700/20"
                      >
                        Tails
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STATE: FLIPPING ────────────────────────── */}
                {gameState === 'flipping' && (
                  <div className="text-center space-y-5 py-4">
                    <p className="text-xs text-gray-500">
                      You called:{' '}
                      <span className="text-amber-400 font-semibold uppercase">{playerCall}</span>
                    </p>

                    <CoinDisplay flipping={isFlipping} result={flipResult} />

                    <p className="text-sm text-gray-400 animate-pulse">Flipping...</p>
                  </div>
                )}

                {/* ── STATE: RESULT ───────────────────────────── */}
                {gameState === 'result' && (
                  <div className="text-center space-y-5 py-4 relative">
                    {/* Result glow */}
                    <div
                      className={`absolute inset-0 rounded-2xl opacity-20 blur-3xl pointer-events-none ${
                        didWin ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />

                    <div className="relative z-10 space-y-4">
                      <p className="text-xs text-gray-500">
                        You called:{' '}
                        <span className="text-amber-400 font-semibold uppercase">{playerCall}</span>
                        {' | '}
                        Landed:{' '}
                        <span className="text-amber-300 font-semibold uppercase">{flipResult}</span>
                      </p>

                      <CoinDisplay flipping={false} result={flipResult} />

                      {didWin ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-2">
                            <FaTrophy className="text-amber-400 text-2xl" />
                            <h2 className="text-3xl font-black text-green-400">YOU WIN!</h2>
                            <FaTrophy className="text-amber-400 text-2xl" />
                          </div>
                          <p className="text-green-400 font-bold text-xl font-mono">+$0.95</p>
                          <p className="text-gray-500 text-xs">
                            vs {opponent}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-2">
                            <FaSkull className="text-red-400 text-xl" />
                            <h2 className="text-2xl font-bold text-red-400">YOU LOSE</h2>
                            <FaSkull className="text-red-400 text-xl" />
                          </div>
                          <p className="text-red-400 font-bold text-lg font-mono">-$1.00</p>
                          <p className="text-gray-500 text-xs">
                            vs {opponent} -- Better luck next time!
                          </p>
                        </div>
                      )}

                      <button
                        onClick={playAgain}
                        className="min-h-[48px] px-8 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold hover:from-indigo-400 hover:to-purple-500 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
                      >
                        PLAY AGAIN
                      </button>

                      <p className="text-gray-600 text-xs">
                        Auto-continuing in a few seconds...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Companion Panel ──────────────────────────────── */}
            <CompanionPanel
              commentary={companionData.commentary}
              mood={companionData.mood}
              emojiReaction={companionData.emoji_reaction}
              loading={companionLoading}
            />

            {/* ─── Game History ──────────────────────────────────── */}
            <GameHistoryPanel history={gameHistory} />

            {/* ─── Agent Status ──────────────────────────────────── */}
            <AgentStatusPanel active={agentActive} />
          </div>
        </main>

        {/* ─── CSS Keyframes via inline style attribute on an empty div ─── */}
        {/* Using a portal-safe approach: a zero-size div with inline animation keyframes */}
        <div
          aria-hidden="true"
          className="fixed pointer-events-none"
          style={{ width: 0, height: 0, overflow: 'hidden' }}
          ref={(el) => {
            if (el && !document.getElementById('coinflip-keyframes')) {
              const styleEl = document.createElement('style')
              styleEl.id = 'coinflip-keyframes'
              styleEl.textContent = `
                @keyframes coinSpin {
                  0% { transform: rotateY(0deg); }
                  100% { transform: rotateY(var(--coin-final, 1800deg)); }
                }
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
                @keyframes particleRise {
                  0% {
                    transform: translateY(0) rotate(0deg) scale(1);
                    opacity: 1;
                  }
                  100% {
                    transform: translateY(-400px) rotate(720deg) scale(0);
                    opacity: 0;
                  }
                }
              `
              document.head.appendChild(styleEl)
            }
          }}
        />
      </div>
    </ErrorBoundary>
  )
}
