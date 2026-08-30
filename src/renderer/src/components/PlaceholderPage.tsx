import type { LucideIcon } from 'lucide-react'

export default function PlaceholderPage({
  icon: Icon,
  title,
  version,
  description
}: {
  icon: LucideIcon
  title: string
  version: string
  description: string
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
        <Icon size={30} />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-slate-800">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">该模块将在 {version} 上线</p>
      <p className="mt-1 max-w-md text-sm text-slate-400">{description}</p>
    </div>
  )
}
