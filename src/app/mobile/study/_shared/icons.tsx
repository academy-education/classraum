"use client"

/**
 * Central study icon system — the single source of truth for every icon
 * rendered anywhere in study mode.
 *
 * The whole product draws from the Phosphor set at one pinned weight
 * ("bold") so lines share a consistent quality that sits naturally next
 * to Raumi's soft-flat mascot. A handful of celebratory "hero" icons ship
 * as duotone variants (`*Hero`) whose two-tone fill echoes Raumi on the
 * big gradient cards.
 *
 * Why everything routes through here:
 *  - Study files import icons from THIS module, never from
 *    `@phosphor-icons/react` (or `lucide-react`) directly. Re-theming the
 *    entire app — weight, hero treatment, or a wholesale set swap — is
 *    then a one-file change.
 *  - Export names deliberately mirror the lucide identifiers the codebase
 *    grew up on (Sparkles, ChevronRight, Loader2, …) so adopting the
 *    module is a pure import-path change at each call site.
 *
 * Sizing/colour follow lucide's contract: pass `className="w-4 h-4"` and
 * colour via `text-*` (icons inherit `currentColor`). Phosphor's `size`/
 * `color`/`weight` props still pass through. `strokeWidth` is accepted
 * (it's a valid SVG prop) but has no effect — Phosphor uses `weight`.
 */

import type { ComponentType } from 'react'
import type { IconProps, IconWeight } from '@phosphor-icons/react'
import {
  // feature
  Sparkle as PhSparkle,
  Trophy as PhTrophy,
  Target as PhTarget,
  Flame as PhFlame,
  Snowflake as PhSnowflake,
  Crown as PhCrown,
  Medal as PhMedal,
  Coins as PhCoins,
  Coin as PhCoin,
  Ticket as PhTicket,
  Gift as PhGift,
  GraduationCap as PhGraduationCap,
  Student as PhStudent,
  BookOpen as PhBookOpen,
  Books as PhBooks,
  Cards as PhCards,
  ListChecks as PhListChecks,
  ClipboardText as PhClipboardText,
  Exam as PhExam,
  Camera as PhCamera,
  Microphone as PhMicrophone,
  MicrophoneSlash as PhMicrophoneSlash,
  SpeakerHigh as PhSpeakerHigh,
  Waveform as PhWaveform,
  Users as PhUsers,
  UserPlus as PhUserPlus,
  Sword as PhSword,
  Shuffle as PhShuffle,
  Compass as PhCompass,
  Lightbulb as PhLightbulb,
  BookmarkSimple as PhBookmarkSimple,
  TrendUp as PhTrendUp,
  TrendDown as PhTrendDown,
  ChartBar as PhChartBar,
  ClockCounterClockwise as PhClockCounterClockwise,
  Play as PhPlay,
  Lightning as PhLightning,
  Baby as PhBaby,
  Flag as PhFlag,
  CalendarCheck as PhCalendarCheck,
  Calendar as PhCalendar,
  FileText as PhFileText,
  Image as PhImage,
  At as PhAt,
  Repeat as PhRepeat,
  Confetti as PhConfetti,
  Brain as PhBrain,
  Barbell as PhBarbell,
  // chrome / utility
  CircleNotch as PhCircleNotch,
  ArrowRight as PhArrowRight,
  ArrowLeft as PhArrowLeft,
  CaretRight as PhCaretRight,
  CaretLeft as PhCaretLeft,
  CaretDown as PhCaretDown,
  CaretUp as PhCaretUp,
  Check as PhCheck,
  CheckCircle as PhCheckCircle,
  XCircle as PhXCircle,
  X as PhX,
  MagnifyingGlass as PhMagnifyingGlass,
  Minus as PhMinus,
  Plus as PhPlus,
  Clock as PhClock,
  Warning as PhWarning,
  WarningCircle as PhWarningCircle,
  ArrowsClockwise as PhArrowsClockwise,
  ArrowClockwise as PhArrowClockwise,
  ArrowCounterClockwise as PhArrowCounterClockwise,
  Lock as PhLock,
  Globe as PhGlobe,
  Copy as PhCopy,
  ShareNetwork as PhShareNetwork,
  GearSix as PhGearSix,
  PaperPlaneRight as PhPaperPlaneRight,
  Printer as PhPrinter,
  PencilSimple as PhPencilSimple,
  ChatCircle as PhChatCircle,
  ListNumbers as PhListNumbers,
  Info as PhInfo,
  Question as PhQuestion,
  Hash as PhHash,
  EyeSlash as PhEyeSlash,
  Eye as PhEye,
  DotsThree as PhDotsThree,
  ArrowSquareOut as PhArrowSquareOut,
  Square as PhSquare,
  CreditCard as PhCreditCard,
  House as PhHouse,
  User as PhUser,
  Path as PhPath,
  Bell as PhBell,
  Chat as PhChat,
  // subject grid
  Calculator as PhCalculator,
  Translate as PhTranslate,
  Atom as PhAtom,
  GlobeHemisphereWest as PhGlobeHemisphereWest,
  Palette as PhPalette,
  Code as PhCode,
  MusicNotes as PhMusicNotes,
  PencilLine as PhPencilLine,
  Briefcase as PhBriefcase,
  Scroll as PhScroll,
  BookBookmark as PhBookBookmark,
} from '@phosphor-icons/react'

const DEFAULT_WEIGHT: IconWeight = 'bold'
const HERO_WEIGHT: IconWeight = 'duotone'

/** Icon component shape used by call sites that store icons in typed
 *  structures (`icon: LucideIcon`). Kept as a loose ComponentType so both
 *  our wrapped icons and raw Phosphor icons satisfy it. */
export type IconType = ComponentType<IconProps>
// Back-compat aliases so files typed against lucide swap by path only.
export type LucideIcon = IconType
export type LucideProps = IconProps
export type { IconProps }

/** Wrap a Phosphor icon at a pinned default weight while forwarding every
 *  prop (className, size, an explicit weight override, …). */
function make(Base: ComponentType<IconProps>, weight: IconWeight = DEFAULT_WEIGHT): IconType {
  const Wrapped = (props: IconProps) => <Base weight={weight} {...props} />
  Wrapped.displayName = 'StudyIcon'
  return Wrapped
}

// ── Feature icons (light) — names mirror the former lucide identifiers ──
export const Sparkles = make(PhSparkle)
export const Trophy = make(PhTrophy)
export const Target = make(PhTarget)
export const Flame = make(PhFlame)
export const Snowflake = make(PhSnowflake)
export const Crown = make(PhCrown)
export const Award = make(PhMedal)
// Single coin — Phosphor's two-coin `Coins` glyph turns into overlapping
// ellipses at chip/card sizes (w-4/w-5); the hero variant keeps the stack.
export const Coins = make(PhCoin)
export const Ticket = make(PhTicket)
export const Gift = make(PhGift)
export const GraduationCap = make(PhGraduationCap)
export const Student = make(PhStudent)
export const BookOpen = make(PhBookOpen)
export const Library = make(PhBooks)
export const Layers = make(PhCards)
export const ListChecks = make(PhListChecks)
export const ClipboardList = make(PhClipboardText)
export const Exam = make(PhExam)
export const Camera = make(PhCamera)
export const Mic = make(PhMicrophone)
export const MicOff = make(PhMicrophoneSlash)
export const Volume2 = make(PhSpeakerHigh)
export const Waveform = make(PhWaveform)
export const Users = make(PhUsers)
export const UserPlus = make(PhUserPlus)
// Phosphor has no crossed-swords glyph; a single sword is clean and reads
// clearly as "duel/challenge" alongside its card label (layering two
// swords just produces visual mesh).
export const Swords = make(PhSword)
export const Shuffle = make(PhShuffle)
export const Compass = make(PhCompass)
export const Lightbulb = make(PhLightbulb)
export const Bookmark = make(PhBookmarkSimple)
// The "saved" half of a bookmark toggle — solid fill so it reads clearly
// distinct from the outline Bookmark, without a CSS fill hack.
export const BookmarkCheck = make(PhBookmarkSimple, 'fill')
export const TrendingUp = make(PhTrendUp)
export const TrendingDown = make(PhTrendDown)
export const BarChart3 = make(PhChartBar)
export const History = make(PhClockCounterClockwise)
export const Play = make(PhPlay)
export const Zap = make(PhLightning)
export const Baby = make(PhBaby)
export const Flag = make(PhFlag)
export const CalendarCheck = make(PhCalendarCheck)
export const Calendar = make(PhCalendar)
export const FileText = make(PhFileText)
export const Image = make(PhImage)
export const AtSign = make(PhAt)
export const Repeat = make(PhRepeat)
export const Confetti = make(PhConfetti)
export const Brain = make(PhBrain)
export const Barbell = make(PhBarbell)

// ── Chrome / utility (light) — navigational plumbing, one line language ──
export const Loader2 = make(PhCircleNotch)
export const ArrowRight = make(PhArrowRight)
export const ArrowLeft = make(PhArrowLeft)
export const ChevronRight = make(PhCaretRight)
export const ChevronLeft = make(PhCaretLeft)
export const ChevronDown = make(PhCaretDown)
export const ChevronUp = make(PhCaretUp)
export const Check = make(PhCheck)
export const CheckCircle2 = make(PhCheckCircle)
export const XCircle = make(PhXCircle)
export const X = make(PhX)
export const Search = make(PhMagnifyingGlass)
export const Minus = make(PhMinus)
export const Plus = make(PhPlus)
export const Clock = make(PhClock)
export const AlertTriangle = make(PhWarning)
export const AlertCircle = make(PhWarningCircle)
export const RefreshCw = make(PhArrowsClockwise)
export const RefreshCcw = make(PhArrowsClockwise)
export const RotateCcw = make(PhArrowCounterClockwise)
export const RotateCw = make(PhArrowClockwise)
export const Lock = make(PhLock)
export const Globe = make(PhGlobe)
export const Copy = make(PhCopy)
export const Share2 = make(PhShareNetwork)
export const Settings = make(PhGearSix)
export const Send = make(PhPaperPlaneRight)
export const Printer = make(PhPrinter)
export const Pencil = make(PhPencilSimple)
export const MessageCircle = make(PhChatCircle)
export const ListOrdered = make(PhListNumbers)
export const Info = make(PhInfo)
export const HelpCircle = make(PhQuestion)
export const Hash = make(PhHash)
export const EyeOff = make(PhEyeSlash)
export const Eye = make(PhEye)
export const MoreHorizontal = make(PhDotsThree)
export const ExternalLink = make(PhArrowSquareOut)
export const Square = make(PhSquare)
export const CreditCard = make(PhCreditCard)
// Bottom-nav / sidebar tabs
export const Home = make(PhHouse)
export const User = make(PhUser)
export const Route = make(PhPath)
export const Bell = make(PhBell)
export const MessageSquare = make(PhChat)

// ── Subject-grid icons (light) — used by the locked "browse subjects" grid ──
export const Calculator = make(PhCalculator)
export const Languages = make(PhTranslate)
export const Atom = make(PhAtom)
export const Globe2 = make(PhGlobeHemisphereWest)
export const Palette = make(PhPalette)
export const Code2 = make(PhCode)
export const Music = make(PhMusicNotes)
export const PenLine = make(PhPencilLine)
export const ClipboardCheck = make(PhClipboardText)
export const Briefcase = make(PhBriefcase)
export const Scroll = make(PhScroll)
export const BookMarked = make(PhBookBookmark)

// ── Hero icons (duotone) — for big gradient cards & celebrations ──
export const TrophyHero = make(PhTrophy, HERO_WEIGHT)
export const FlameHero = make(PhFlame, HERO_WEIGHT)
export const CoinsHero = make(PhCoins, HERO_WEIGHT)
export const CrownHero = make(PhCrown, HERO_WEIGHT)
export const SparklesHero = make(PhSparkle, HERO_WEIGHT)
export const TargetHero = make(PhTarget, HERO_WEIGHT)
export const GraduationHero = make(PhGraduationCap, HERO_WEIGHT)
export const MedalHero = make(PhMedal, HERO_WEIGHT)
export const ConfettiHero = make(PhConfetti, HERO_WEIGHT)
export const SwordsHero = make(PhSword, HERO_WEIGHT)
