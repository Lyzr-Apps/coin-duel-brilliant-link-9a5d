'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { HiMiniTrophy, HiChevronDown, HiChevronUp } from 'react-icons/hi2'
import { IoWallet, IoFlame, IoDice, IoSkull, IoHeart, IoBulb, IoEye, IoSparkles } from 'react-icons/io5'
import { FaCoins } from 'react-icons/fa'

// ---- Constants ----

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

const SF_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif'

// iOS system colors
const IOS = {
  black: '#000000',
  gray6: '#1c1c1e',
  gray5: '#2c2c2e',
  gray4: '#3a3a3c',
  gray3: '#48484a',
  secondaryLabel: 'rgba(235, 235, 245, 0.6)',
  tertiaryLabel: 'rgba(235, 235, 245, 0.3)',
  quaternaryLabel: 'rgba(235, 235, 245, 0.18)',
  gold: '#FFD60A',
  green: '#30D158',
  red: '#FF453A',
  blue: '#0A84FF',
  purple: '#BF5AF2',
  orange: '#FF9F0A',
  teal: '#64D2FF',
}

// ---- Types ----

type GameState = 'idle' | 'matching' | 'matched' | 'picking' | 'flipping' | 'result'
type CoinSide = 'heads' | 'tails'

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

// ---- ErrorBoundary ----

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
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: IOS.black, fontFamily: SF_FONT }}>
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2 text-white">Something went wrong</h2>
            <p className="mb-4 text-[15px]" style={{ color: IOS.secondaryLabel }}>{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-6 py-3 rounded-2xl text-[15px] font-semibold text-white"
              style={{ backgroundColor: IOS.blue }}
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

// ---- Helpers ----

function getMoodIcon(mood: string) {
  switch (mood) {
    case 'hype':
      return <IoFlame style={{ color: IOS.orange }} />
    case 'celebration':
      return <IoSparkles style={{ color: IOS.green }} />
    case 'consolation':
      return <IoHeart style={{ color: IOS.blue }} />
    case 'anticipation':
      return <IoEye style={{ color: IOS.purple }} />
    case 'tip':
      return <IoBulb style={{ color: IOS.gold }} />
    default:
      return <FaCoins style={{ color: IOS.gold }} />
  }
}

function getMoodAccent(mood: string): string {
  switch (mood) {
    case 'hype': return IOS.orange
    case 'celebration': return IOS.green
    case 'consolation': return IOS.blue
    case 'anticipation': return IOS.purple
    case 'tip': return IOS.gold
    default: return IOS.gold
  }
}

function getRandomOpponent(): string {
  return OPPONENT_NAMES[Math.floor(Math.random() * OPPONENT_NAMES.length)]
}

function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ---- Companion Widget ----

function CompanionWidget({
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
  const accentColor = getMoodAccent(mood)

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: IOS.gray6 }}>
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: IOS.tertiaryLabel }}>
        AI Companion
      </p>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5 text-[18px]">{getMoodIcon(mood)}</div>
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] italic" style={{ color: IOS.secondaryLabel }}>Thinking</span>
              <span className="inline-flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: IOS.tertiaryLabel, animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: IOS.tertiaryLabel, animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: IOS.tertiaryLabel, animationDelay: '300ms' }} />
              </span>
            </div>
          ) : (
            <>
              <p className="text-[15px] leading-relaxed text-white/90">{commentary || 'Ready for action!'}</p>
              {emojiReaction && (
                <p className="text-[13px] mt-1.5 italic" style={{ color: IOS.tertiaryLabel }}>{emojiReaction}</p>
              )}
            </>
          )}
        </div>
        {/* Small accent dot */}
        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: accentColor, opacity: 0.6 }} />
      </div>
    </div>
  )
}

// ---- Win Particles (Refined) ----

function WinParticles() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; color: string; delay: number; size: number }>>([])

  useEffect(() => {
    const colors = [IOS.gold, '#FFFFFF', IOS.gold, '#FFFFFF', IOS.green, IOS.gold]
    const newParticles = Array.from({ length: 16 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 800,
      size: Math.random() * 4 + 3,
    }))
    setParticles(newParticles)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full opacity-70"
          style={{
            left: `${p.x}%`,
            bottom: '-8px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animation: `particleRise 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${p.delay}ms forwards`,
          }}
        />
      ))}
    </div>
  )
}

// ---- Coin Component ----

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
        className="relative w-[104px] h-[104px] md:w-[120px] md:h-[120px]"
        style={{
          transformStyle: 'preserve-3d',
          transition: flipping ? 'none' : 'transform 0.3s ease',
          animation: flipping ? `coinSpin 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards` : 'none',
          ...(flipping ? { '--coin-final': `${finalRotation}deg` } as React.CSSProperties : {}),
          transform: !flipping && result ? `rotateY(${result === 'tails' ? 180 : 0}deg)` : 'rotateY(0deg)',
        }}
      >
        {/* Front - Heads */}
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center text-[32px] md:text-[36px] font-bold text-black"
          style={{
            backfaceVisibility: 'hidden',
            background: `linear-gradient(145deg, ${IOS.gold} 0%, #E8C200 40%, #B8960A 100%)`,
            boxShadow: `0 4px 24px ${IOS.gold}33, inset 0 1px 1px rgba(255,255,255,0.3)`,
          }}
        >
          H
        </div>
        {/* Back - Tails */}
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center text-[32px] md:text-[36px] font-bold text-black"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: `linear-gradient(145deg, #E8C200 0%, #B8960A 40%, #8B7008 100%)`,
            boxShadow: `0 4px 24px ${IOS.gold}22, inset 0 1px 1px rgba(255,255,255,0.2)`,
          }}
        >
          T
        </div>
      </div>
    </div>
  )
}

// ---- Game History (iOS List Style) ----

function GameHistoryList({ history }: { history: GameRecord[] }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: IOS.gray6 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 active:opacity-70 transition-opacity duration-150"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: IOS.tertiaryLabel }}>
          Recent Games ({history.length})
        </span>
        {expanded ? (
          <HiChevronUp className="text-[16px]" style={{ color: IOS.tertiaryLabel }} />
        ) : (
          <HiChevronDown className="text-[16px]" style={{ color: IOS.tertiaryLabel }} />
        )}
      </button>
      {expanded && (
        <div className="max-h-60 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-center text-[15px] py-6" style={{ color: IOS.tertiaryLabel }}>No games yet</p>
          ) : (
            <div>
              {history.map((game, idx) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderTop: idx > 0 ? `0.5px solid rgba(255,255,255,0.05)` : 'none' }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-7 h-7 flex items-center justify-center rounded-full text-[11px] font-bold"
                      style={{
                        backgroundColor: game.result === 'win' ? `${IOS.green}20` : `${IOS.red}20`,
                        color: game.result === 'win' ? IOS.green : IOS.red,
                      }}
                    >
                      {game.result === 'win' ? 'W' : 'L'}
                    </span>
                    <span className="text-[15px] text-white/80">vs {game.opponent}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="font-mono text-[13px] font-semibold"
                      style={{ color: game.result === 'win' ? IOS.green : IOS.red }}
                    >
                      {game.result === 'win' ? '+$0.95' : '-$1.00'}
                    </span>
                    <span className="text-[11px]" style={{ color: IOS.tertiaryLabel }}>{game.timestamp}</span>
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

// ---- Agent Status ----

function AgentStatus({ active }: { active: boolean }) {
  return (
    <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: IOS.gray6 }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: active ? IOS.green : IOS.gray3,
              boxShadow: active ? `0 0 6px ${IOS.green}66` : 'none',
            }}
          />
          <span className="text-[13px]" style={{ color: IOS.secondaryLabel }}>CoinFlip Companion AI</span>
        </div>
        <span className="text-[11px] font-mono" style={{ color: IOS.tertiaryLabel }}>
          {active ? 'Active' : 'Idle'}
        </span>
      </div>
    </div>
  )
}

// ---- Stats Widget Row ----

function StatsRow({ totalGames, winRate, netProfit }: { totalGames: number; winRate: number; netProfit: number }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: IOS.gray6 }}>
        <p className="text-[11px] font-medium uppercase tracking-wider mb-1" style={{ color: IOS.tertiaryLabel }}>Games</p>
        <p className="text-[22px] font-bold text-white">{totalGames}</p>
      </div>
      <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: IOS.gray6 }}>
        <p className="text-[11px] font-medium uppercase tracking-wider mb-1" style={{ color: IOS.tertiaryLabel }}>Win Rate</p>
        <p className="text-[22px] font-bold" style={{ color: winRate >= 50 ? IOS.green : winRate > 0 ? IOS.red : 'white' }}>
          {winRate}%
        </p>
      </div>
      <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: IOS.gray6 }}>
        <p className="text-[11px] font-medium uppercase tracking-wider mb-1" style={{ color: IOS.tertiaryLabel }}>Net P/L</p>
        <p className="text-[22px] font-bold font-mono" style={{ color: netProfit >= 0 ? IOS.green : IOS.red }}>
          {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(2)}
        </p>
      </div>
    </div>
  )
}

// ---- Main Page ----

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

  // Balance animation
  const [balanceBump, setBalanceBump] = useState(false)

  // Timers ref
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const autoResetRef = useRef<NodeJS.Timeout | null>(null)

  // ---- AI Agent Call ----

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

  // ---- Cleanup timers ----

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (autoResetRef.current) clearTimeout(autoResetRef.current)
    }
  }, [])

  // ---- Welcome message on load ----

  useEffect(() => {
    callCompanion(
      `Player just opened CoinFlip Duel. Balance: $10.00. Record: 0W-0L. Give a welcome tip or encouragement.`
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Balance bump animation ----

  useEffect(() => {
    if (balanceBump) {
      const t = setTimeout(() => setBalanceBump(false), 400)
      return () => clearTimeout(t)
    }
  }, [balanceBump])

  // ---- Game Flow Functions ----

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

    const landed: CoinSide = Math.random() < 0.5 ? 'heads' : 'tails'
    setFlipResult(landed)

    timerRef.current = setTimeout(() => {
      setIsFlipping(false)
      const won = side === landed
      setDidWin(won)
      setGameState('result')
      setBalanceBump(true)

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

      autoResetRef.current = setTimeout(() => {
        setGameState('idle')
      }, 5000)
    }, 2500)
  }

  const playAgain = () => {
    if (autoResetRef.current) clearTimeout(autoResetRef.current)
    setGameState('idle')
  }

  // ---- Stats ----

  const totalGames = wins + losses
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0
  const netProfit = parseFloat((balance - 10.0).toFixed(2))

  // ---- Render ----

  return (
    <ErrorBoundary>
      <div
        className="min-h-screen flex flex-col text-white"
        style={{ backgroundColor: IOS.black, fontFamily: SF_FONT }}
      >
        {/* ---- Frosted Header (iOS Nav Bar) ---- */}
        <header
          className="flex items-center justify-between px-5 sticky top-0 z-50 backdrop-blur-2xl"
          style={{
            height: '56px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <FaCoins className="text-[20px]" style={{ color: IOS.gold }} />
            <h1 className="text-[17px] font-semibold text-white">CoinFlip Duel</h1>
          </div>

          {/* Balance Pill */}
          <div
            className="flex items-center gap-2 rounded-full px-3.5 py-1.5 transition-transform duration-300"
            style={{
              backgroundColor: IOS.gray6,
              transform: balanceBump ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            <IoWallet className="text-[14px]" style={{ color: IOS.gold }} />
            <span
              className="font-mono font-bold text-[15px] transition-colors duration-500"
              style={{
                color: balance >= 10 ? IOS.green : balance >= 5 ? IOS.gold : IOS.red,
              }}
            >
              ${balance.toFixed(2)}
            </span>
          </div>
        </header>

        {/* ---- Main Content ---- */}
        <main className="flex-1 flex flex-col items-center justify-start px-4 py-5 overflow-y-auto">
          <div className="w-full max-w-lg space-y-4">

            {/* ---- Game Area Card ---- */}
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                backgroundColor: IOS.gray6,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              {/* Win particles overlay */}
              {gameState === 'result' && didWin && <WinParticles />}

              <div className="p-6 space-y-6">

                {/* -- STATE: IDLE -- */}
                {gameState === 'idle' && (
                  <div className="text-center space-y-6">
                    <div className="space-y-3">
                      <IoDice className="text-[48px] mx-auto" style={{ color: IOS.tertiaryLabel }} />
                      <p className="text-[15px]" style={{ color: IOS.secondaryLabel }}>
                        Tap to find an opponent
                      </p>
                    </div>

                    {/* PLAY Button - iOS Hero CTA */}
                    <button
                      onClick={startMatchmaking}
                      disabled={balance < 1}
                      className="relative w-full max-w-xs mx-auto flex items-center justify-center gap-2.5 rounded-2xl font-bold text-[17px] transition-transform duration-150 active:scale-[0.97]"
                      style={{
                        height: '56px',
                        backgroundColor: balance < 1 ? IOS.gray4 : IOS.gold,
                        color: balance < 1 ? IOS.tertiaryLabel : '#000000',
                        cursor: balance < 1 ? 'not-allowed' : 'pointer',
                        boxShadow: balance >= 1 ? `0 4px 20px ${IOS.gold}33` : 'none',
                      }}
                    >
                      <FaCoins className="text-[18px]" />
                      <span>PLAY $1</span>
                    </button>

                    {balance < 1 && (
                      <p className="text-[13px]" style={{ color: IOS.red }}>Insufficient balance</p>
                    )}

                    {/* Win streak badge */}
                    {winStreak >= 2 && (
                      <div
                        className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold"
                        style={{
                          backgroundColor: `${IOS.purple}18`,
                          color: IOS.purple,
                        }}
                      >
                        <IoFlame className="text-[14px]" />
                        <span>{winStreak} Win Streak</span>
                      </div>
                    )}
                  </div>
                )}

                {/* -- STATE: MATCHING -- */}
                {gameState === 'matching' && (
                  <div className="text-center space-y-6 py-2">
                    {/* Concentric rings animation */}
                    <div className="relative w-[128px] h-[128px] mx-auto">
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{ border: `2px solid ${IOS.purple}15` }}
                      />
                      <div
                        className="absolute inset-3 rounded-full"
                        style={{ border: `2px solid ${IOS.purple}25` }}
                      />
                      <div
                        className="absolute inset-6 rounded-full"
                        style={{ border: `2px solid ${IOS.purple}35` }}
                      />
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          borderTop: `2px solid ${IOS.purple}`,
                          borderRight: '2px solid transparent',
                          borderBottom: '2px solid transparent',
                          borderLeft: '2px solid transparent',
                          animation: 'spin 1.2s linear infinite',
                        }}
                      />
                      <div
                        className="absolute inset-4 rounded-full"
                        style={{
                          borderTop: '2px solid transparent',
                          borderRight: `2px solid ${IOS.teal}`,
                          borderBottom: '2px solid transparent',
                          borderLeft: '2px solid transparent',
                          animation: 'spin 1.8s linear infinite reverse',
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <IoDice className="text-[28px] animate-pulse" style={{ color: IOS.purple }} />
                      </div>
                    </div>

                    <div>
                      <p className="text-[17px] font-semibold text-white">Finding Opponent</p>
                      <p className="text-[13px] flex items-center justify-center gap-0.5 mt-1.5" style={{ color: IOS.tertiaryLabel }}>
                        Searching
                        <span className="inline-flex gap-0.5 ml-0.5">
                          <span className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: IOS.tertiaryLabel, animationDelay: '0ms' }} />
                          <span className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: IOS.tertiaryLabel, animationDelay: '200ms' }} />
                          <span className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: IOS.tertiaryLabel, animationDelay: '400ms' }} />
                        </span>
                      </p>
                    </div>

                    {/* Player vs ? */}
                    <div className="flex items-center justify-center gap-8">
                      <div className="text-center">
                        <div
                          className="w-14 h-14 rounded-full flex items-center justify-center text-[15px] font-bold text-white"
                          style={{
                            background: `linear-gradient(145deg, ${IOS.blue}, ${IOS.purple})`,
                            boxShadow: `0 4px 12px ${IOS.blue}33`,
                          }}
                        >
                          You
                        </div>
                        <p className="text-[11px] mt-1.5" style={{ color: IOS.secondaryLabel }}>Player</p>
                      </div>
                      <span className="text-[13px] font-semibold" style={{ color: IOS.tertiaryLabel }}>VS</span>
                      <div className="text-center">
                        <div
                          className="w-14 h-14 rounded-full flex items-center justify-center text-[22px] font-bold animate-pulse"
                          style={{
                            backgroundColor: IOS.gray4,
                            color: IOS.tertiaryLabel,
                          }}
                        >
                          ?
                        </div>
                        <p className="text-[11px] mt-1.5" style={{ color: IOS.tertiaryLabel }}>Opponent</p>
                      </div>
                    </div>

                    <button
                      onClick={cancelMatchmaking}
                      className="text-[13px] transition-opacity duration-150 active:opacity-50"
                      style={{ color: IOS.secondaryLabel }}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* -- STATE: MATCHED -- */}
                {gameState === 'matched' && (
                  <div className="text-center space-y-6 py-2">
                    <p
                      className="text-[11px] font-semibold uppercase tracking-widest"
                      style={{ color: IOS.green }}
                    >
                      Opponent Found
                    </p>

                    <div className="flex items-center justify-center gap-8">
                      <div className="text-center">
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center text-[17px] font-bold text-white"
                          style={{
                            background: `linear-gradient(145deg, ${IOS.blue}, ${IOS.purple})`,
                            boxShadow: `0 6px 16px ${IOS.blue}33`,
                          }}
                        >
                          You
                        </div>
                        <p className="text-[15px] text-white font-medium mt-2">Player</p>
                      </div>

                      <div className="relative">
                        <span
                          className="text-[17px] font-bold"
                          style={{ color: IOS.secondaryLabel }}
                        >
                          VS
                        </span>
                      </div>

                      <div className="text-center">
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center text-[17px] font-bold text-white"
                          style={{
                            background: `linear-gradient(145deg, ${IOS.red}, ${IOS.orange})`,
                            boxShadow: `0 6px 16px ${IOS.red}33`,
                          }}
                        >
                          {opponent.charAt(0)}
                        </div>
                        <p className="text-[15px] text-white font-medium mt-2">{opponent}</p>
                      </div>
                    </div>

                    <p className="text-[13px] animate-pulse" style={{ color: IOS.tertiaryLabel }}>
                      Get ready...
                    </p>
                  </div>
                )}

                {/* -- STATE: PICKING -- */}
                {gameState === 'picking' && (
                  <div className="text-center space-y-6 py-2">
                    <div>
                      <p className="text-[17px] font-semibold text-white">Make Your Call</p>
                      <p className="text-[13px] mt-1" style={{ color: IOS.tertiaryLabel }}>
                        vs <span className="text-white/70 font-medium">{opponent}</span>
                      </p>
                    </div>

                    <CoinDisplay flipping={false} result={null} />

                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => pickSide('heads')}
                        className="flex-1 max-w-[150px] rounded-full font-bold text-[17px] text-black transition-transform duration-150 active:scale-[0.97]"
                        style={{
                          height: '52px',
                          backgroundColor: IOS.gold,
                          boxShadow: `0 4px 16px ${IOS.gold}33`,
                        }}
                      >
                        Heads
                      </button>
                      <button
                        onClick={() => pickSide('tails')}
                        className="flex-1 max-w-[150px] rounded-full font-bold text-[17px] text-white transition-transform duration-150 active:scale-[0.97]"
                        style={{
                          height: '52px',
                          backgroundColor: IOS.gray4,
                          boxShadow: `0 4px 16px rgba(0,0,0,0.3)`,
                        }}
                      >
                        Tails
                      </button>
                    </div>
                  </div>
                )}

                {/* -- STATE: FLIPPING -- */}
                {gameState === 'flipping' && (
                  <div className="text-center space-y-6 py-2">
                    <p className="text-[13px]" style={{ color: IOS.tertiaryLabel }}>
                      You called:{' '}
                      <span className="font-semibold uppercase" style={{ color: IOS.gold }}>{playerCall}</span>
                    </p>

                    <CoinDisplay flipping={isFlipping} result={flipResult} />

                    <p className="text-[15px] animate-pulse" style={{ color: IOS.secondaryLabel }}>
                      Flipping...
                    </p>
                  </div>
                )}

                {/* -- STATE: RESULT -- */}
                {gameState === 'result' && (
                  <div className="text-center space-y-5 py-2 relative">
                    {/* Subtle ambient glow */}
                    <div
                      className="absolute inset-0 rounded-2xl pointer-events-none"
                      style={{
                        background: didWin
                          ? `radial-gradient(circle at 50% 50%, ${IOS.green}12 0%, transparent 70%)`
                          : `radial-gradient(circle at 50% 50%, ${IOS.red}08 0%, transparent 70%)`,
                      }}
                    />

                    <div className="relative z-10 space-y-5">
                      <p className="text-[13px]" style={{ color: IOS.tertiaryLabel }}>
                        Called:{' '}
                        <span className="font-semibold uppercase" style={{ color: IOS.gold }}>{playerCall}</span>
                        {' / '}
                        Landed:{' '}
                        <span className="font-semibold uppercase text-white/80">{flipResult}</span>
                      </p>

                      <CoinDisplay flipping={false} result={flipResult} />

                      {didWin ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-center gap-2.5">
                            <HiMiniTrophy className="text-[24px]" style={{ color: IOS.gold }} />
                            <h2 className="text-[34px] font-bold tracking-tight" style={{ color: IOS.green }}>
                              YOU WIN
                            </h2>
                            <HiMiniTrophy className="text-[24px]" style={{ color: IOS.gold }} />
                          </div>
                          <p className="font-mono font-bold text-[28px]" style={{ color: IOS.green }}>
                            +$0.95
                          </p>
                          <p className="text-[13px]" style={{ color: IOS.tertiaryLabel }}>
                            vs {opponent}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-center gap-2.5">
                            <IoSkull className="text-[20px]" style={{ color: IOS.red }} />
                            <h2 className="text-[28px] font-bold tracking-tight" style={{ color: IOS.red }}>
                              YOU LOSE
                            </h2>
                            <IoSkull className="text-[20px]" style={{ color: IOS.red }} />
                          </div>
                          <p className="font-mono font-bold text-[24px]" style={{ color: IOS.red }}>
                            -$1.00
                          </p>
                          <p className="text-[13px]" style={{ color: IOS.tertiaryLabel }}>
                            vs {opponent} -- Better luck next time
                          </p>
                        </div>
                      )}

                      <button
                        onClick={playAgain}
                        className="w-full max-w-xs mx-auto flex items-center justify-center rounded-2xl font-bold text-[17px] text-white transition-transform duration-150 active:scale-[0.97]"
                        style={{
                          height: '52px',
                          backgroundColor: IOS.blue,
                          boxShadow: `0 4px 16px ${IOS.blue}33`,
                        }}
                      >
                        PLAY AGAIN
                      </button>

                      <p className="text-[11px]" style={{ color: IOS.tertiaryLabel }}>
                        Auto-continuing in a few seconds...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ---- Stats Widget Row ---- */}
            <StatsRow totalGames={totalGames} winRate={winRate} netProfit={netProfit} />

            {/* ---- Companion Widget ---- */}
            <CompanionWidget
              commentary={companionData.commentary}
              mood={companionData.mood}
              emojiReaction={companionData.emoji_reaction}
              loading={companionLoading}
            />

            {/* ---- Game History ---- */}
            <GameHistoryList history={gameHistory} />

            {/* ---- Agent Status ---- */}
            <AgentStatus active={agentActive} />

            {/* Bottom spacer for safe area */}
            <div className="h-4" />
          </div>
        </main>

        {/* ---- CSS Keyframes injection ---- */}
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
                    opacity: 0.7;
                  }
                  100% {
                    transform: translateY(-350px) rotate(540deg) scale(0);
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
