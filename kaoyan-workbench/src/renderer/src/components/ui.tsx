import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Check as CheckIcon, X } from 'lucide-react'
import type { Subject } from '@shared/types'

export function Card({
  title,
  right,
  children,
  className = ''
}: {
  title?: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`glass rounded-[22px] p-5 ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink/80">{title}</h2>
          {right}
        </div>
      )}
      {children}
    </section>
  )
}

const BTN_VARIANTS = {
  primary:
    'bg-gradient-to-b from-[#2f9bff] to-[#0a7aff] text-white border border-white/25 shadow-[0_6px_18px_rgba(0,122,255,0.32),inset_0_1px_0_rgba(255,255,255,0.35)] hover:from-[#1f90ff] hover:to-[#0068e8]',
  ghost: 'bg-white/60 text-ink border border-white/70 hover:bg-white/90 shadow-sm',
  danger: 'bg-[#ff3b30]/10 text-[#e5342a] border border-[#ff3b30]/20 hover:bg-[#ff3b30]/20',
  warn: 'bg-[#ff9500]/12 text-[#a85800] border border-[#ff9500]/25 hover:bg-[#ff9500]/22',
  ok: 'bg-[#34c759]/12 text-[#1e9e43] border border-[#34c759]/25 hover:bg-[#34c759]/22'
} as const

export function Btn({
  variant = 'ghost',
  size = 'md',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BTN_VARIANTS
  size?: 'md' | 'sm'
}) {
  const sizeCls = size === 'sm' ? 'h-8 rounded-[11px] px-3 text-xs' : 'h-10 rounded-[13px] px-4 text-sm'
  return (
    <button
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 font-medium transition-all active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40 ${BTN_VARIANTS[variant]} ${sizeCls} ${className}`}
      {...rest}
    />
  )
}

export function IconBtn({
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`cursor-pointer rounded-[10px] p-1.5 text-mute transition-colors hover:bg-black/[.06] hover:text-ink ${className}`}
      {...rest}
    />
  )
}

const FIELD =
  'rounded-[13px] border border-white/70 bg-white/55 text-sm text-ink outline-none transition-all placeholder:text-mute/70 focus:border-brand/60 focus:bg-white/85 focus:ring-4 focus:ring-brand/10'

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`h-10 px-3.5 ${FIELD} ${className}`} {...rest} />
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`h-10 cursor-pointer px-3 ${FIELD} ${className}`} {...rest}>
      {children}
    </select>
  )
}

export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`w-full py-2.5 leading-relaxed ${FIELD} ${className}`} {...rest} />
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-mute">{label}</span>
      {children}
    </label>
  )
}

const BADGE_TONES = {
  ok: 'bg-[#34c759]/15 text-[#1e9e43]',
  warn: 'bg-[#ff9500]/15 text-[#b25c00]',
  bad: 'bg-[#ff3b30]/12 text-[#e5342a]',
  brand: 'bg-[#007aff]/12 text-[#0064d2]',
  muted: 'bg-black/[.05] text-mute'
} as const

export function Badge({
  tone = 'muted',
  children
}: {
  tone?: keyof typeof BADGE_TONES
  children: ReactNode
}) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium leading-none ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  )
}

export function Check({ done, onClick }: { done: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all ${
        done
          ? 'border-transparent bg-[#34c759] text-white shadow-[0_2px_6px_rgba(52,199,89,0.4)]'
          : 'border-black/15 bg-white/70 hover:border-[#34c759]/70'
      }`}
    >
      {done && <CheckIcon size={12} strokeWidth={3.5} />}
    </button>
  )
}

export function SubjectChip({ subjects, subjectId }: { subjects: Subject[]; subjectId: string | null }) {
  const s = subjects.find(x => x.id === subjectId)
  if (!s) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-mute">
        <span className="size-1.5 rounded-full bg-mute/60" />
        未分类
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium" style={{ color: s.color }}>
      <span className="size-1.5 rounded-full" style={{ background: s.color }} />
      {s.name}
    </span>
  )
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-[16px] border border-dashed border-black/12 bg-white/35 py-8 text-center text-sm text-mute">
      {text}
    </div>
  )
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-[26px] w-[46px] shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
        checked ? 'bg-[#34c759]' : 'bg-black/[.16]'
      }`}
    >
      <span
        className={`absolute top-[2px] size-[22px] rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,0.25)] transition-all duration-200 ${
          checked ? 'left-[22px]' : 'left-[2px]'
        }`}
      />
    </button>
  )
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d1830]/30 p-6 backdrop-blur-[4px]" onMouseDown={onClose}>
      <div
        className={`glass-strong max-h-[85vh] w-full overflow-y-auto rounded-[26px] p-6 ${wide ? 'max-w-2xl' : 'max-w-lg'}`}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-full p-1.5 text-mute transition-colors hover:bg-black/[.06] hover:text-ink"
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
