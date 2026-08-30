import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { SETTING_KEYS, type AppInfo, type SettingsMap } from '../../../shared/types'

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsMap | null>(null)
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.api.settings
      .all()
      .then(setForm)
      .catch((err) => console.error('加载设置失败', err))
    window.api.app
      .info()
      .then(setAppInfo)
      .catch(() => {})
  }, [])

  if (!form) {
    return <div className="px-10 py-8 text-sm text-slate-400">加载中…</div>
  }

  function update(key: string, value: string) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function save() {
    if (!form) return
    for (const [key, value] of Object.entries(form)) {
      await window.api.settings.set(key, value)
    }
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  const inputClass =
    'rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400'

  return (
    <div className="mx-auto max-w-3xl px-10 py-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">设置</h1>
        <p className="mt-1 text-sm text-slate-500">考试信息与学习参数</p>
      </header>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-slate-700">考试</h3>
        <label className="mt-4 block text-xs text-slate-500">初试日期</label>
        <input
          type="date"
          value={form[SETTING_KEYS.examDate] ?? ''}
          onChange={(e) => update(SETTING_KEYS.examDate, e.target.value)}
          className={`mt-1 w-56 ${inputClass}`}
        />
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-slate-700">番茄钟</h3>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <NumberField
            label="专注时长(分钟)"
            value={form[SETTING_KEYS.pomodoroFocus] ?? ''}
            onChange={(v) => update(SETTING_KEYS.pomodoroFocus, v)}
            inputClass={inputClass}
          />
          <NumberField
            label="短休息(分钟)"
            value={form[SETTING_KEYS.pomodoroBreak] ?? ''}
            onChange={(v) => update(SETTING_KEYS.pomodoroBreak, v)}
            inputClass={inputClass}
          />
          <NumberField
            label="长休息(分钟)"
            value={form[SETTING_KEYS.pomodoroLongBreak] ?? ''}
            onChange={(v) => update(SETTING_KEYS.pomodoroLongBreak, v)}
            inputClass={inputClass}
          />
          <NumberField
            label="长休息间隔(个)"
            value={form[SETTING_KEYS.pomodoroLongEvery] ?? ''}
            onChange={(v) => update(SETTING_KEYS.pomodoroLongEvery, v)}
            inputClass={inputClass}
          />
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-slate-700">复习间隔</h3>
        <label className="mt-4 block text-xs text-slate-500">
          艾宾浩斯间隔序列(天,逗号分隔)
        </label>
        <input
          value={form[SETTING_KEYS.reviewIntervals] ?? ''}
          onChange={(e) => update(SETTING_KEYS.reviewIntervals, e.target.value)}
          placeholder="1,2,4,7,15,30"
          className={`mt-1 w-72 ${inputClass}`}
        />
      </section>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={save}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          保存设置
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-emerald-600">
            <Check size={16} />
            已保存
          </span>
        )}
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-slate-700">数据</h3>
        <p className="mt-2 break-all text-xs text-slate-500">
          数据文件:{appInfo?.dbPath ?? '…'}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          版本 v{appInfo?.version ?? '-'} · JSON 备份导出将在 V0.6 提供
        </p>
      </section>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  inputClass
}: {
  label: string
  value: string
  onChange: (value: string) => void
  inputClass: string
}) {
  return (
    <div>
      <label className="block text-xs text-slate-500">{label}</label>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 w-full ${inputClass}`}
      />
    </div>
  )
}
