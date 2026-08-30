import { useEffect, useState } from 'react'
import { Download, FolderOpen, Plus, Trash2, Upload } from 'lucide-react'
import type { BackupInfo, Phase, Settings, Subject } from '@shared/types'
import { daysBetween, todayStr } from '@shared/util'
import { useMeta } from '../ctx'
import { Btn, Card, Field, IconBtn, Input, Toggle } from '../components/ui'

export function SettingsPage() {
  const { settings, subjects, reloadMeta } = useMeta()
  const [form, setForm] = useState<Settings | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [info, setInfo] = useState<BackupInfo | null>(null)

  useEffect(() => {
    if (settings && !form) setForm(structuredClone(settings))
  }, [settings, form])

  useEffect(() => {
    window.api.backup.info().then(setInfo)
  }, [])

  if (!form) return null

  const flash = () => {
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  const commit = async (patch: Partial<Settings>) => {
    setForm(prev => (prev ? { ...prev, ...patch } : prev))
    await window.api.settings.set(patch)
    flash()
  }

  const refreshSubjects = async () => {
    await reloadMeta()
  }

  const addPhase = () => {
    const phases = [
      ...form.phases,
      { id: `p_${Math.random().toString(36).slice(2, 8)}`, name: '新阶段', start: todayStr(), end: todayStr() }
    ]
    commit({ phases })
  }

  const updatePhase = (idx: number, patch: Partial<Phase>) => {
    commit({ phases: form.phases.map((p, i) => (i === idx ? { ...p, ...patch } : p)) })
  }

  const removePhase = (idx: number) => {
    commit({ phases: form.phases.filter((_, i) => i !== idx) })
  }

  const doExport = async () => {
    try {
      const r = await window.api.backup.exportData()
      if (r.path) alert(`备份已导出到:\n${r.path}`)
    } catch (err) {
      alert(`导出失败:${(err as Error).message}`)
    }
  }

  const doImport = async () => {
    if (!confirm('导入备份将覆盖当前所有数据,确定继续?')) return
    try {
      const r = await window.api.backup.importData()
      if (!r.canceled) {
        alert(
          `导入成功:${r.tasks} 个任务、${r.sessions} 条专注记录、${r.mistakes} 条错题、${r.cards} 张复习卡`
        )
        setForm(null)
        await reloadMeta()
      }
    } catch (err) {
      alert(`导入失败:${(err as Error).message}`)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">设置</h1>
        {savedFlash && <span className="text-xs text-ok">已保存</span>}
      </div>

      <Card title="考试与阶段">
        <div className="grid grid-cols-2 gap-4">
          <Field label="初试日期(第一天)">
            <Input type="date" className="w-full" value={form.examDate} onChange={e => commit({ examDate: e.target.value })} />
          </Field>
          <Field label="倒计时">
            <div className="flex h-9 items-center text-sm text-mute">
              距离考试还有 {Math.max(0, daysBetween(todayStr(), form.examDate))} 天
            </div>
          </Field>
        </div>
        <div className="mt-5">
          <div className="mb-2 text-xs text-mute">阶段规划(今日页展示当前所处阶段)</div>
          <div className="space-y-2">
            {form.phases.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2">
                <Input className="w-36" value={p.name} onChange={e => updatePhase(i, { name: e.target.value })} />
                <Input type="date" className="flex-1" value={p.start} onChange={e => updatePhase(i, { start: e.target.value })} />
                <span className="text-mute">~</span>
                <Input type="date" className="flex-1" value={p.end} onChange={e => updatePhase(i, { end: e.target.value })} />
                <IconBtn className="hover:!text-bad" onClick={() => removePhase(i)} title="删除阶段">
                  <Trash2 size={14} />
                </IconBtn>
              </div>
            ))}
          </div>
          <Btn size="sm" className="mt-2" onClick={addPhase}>
            <Plus size={13} />
            添加阶段
          </Btn>
        </div>
      </Card>

      <Card title="科目管理">
        <div className="space-y-2">
          {subjects.map(s => (
            <SubjectRow key={s.id} subject={s} onSaved={refreshSubjects} />
          ))}
        </div>
        <AddSubjectRow onAdded={refreshSubjects} />
      </Card>

      <Card title="番茄钟">
        <div className="grid grid-cols-5 gap-3">
          <NumField label="专注(分)" value={form.focusMinutes} min={5} max={180} onCommit={v => commit({ focusMinutes: v })} />
          <NumField label="短休(分)" value={form.breakMinutes} min={1} max={30} onCommit={v => commit({ breakMinutes: v })} />
          <NumField label="长休(分)" value={form.longBreakMinutes} min={5} max={60} onCommit={v => commit({ longBreakMinutes: v })} />
          <NumField label="长休间隔(个)" value={form.longBreakEvery} min={2} max={10} onCommit={v => commit({ longBreakEvery: v })} />
          <NumField label="每日目标(个)" value={form.dailyGoalPomodoros} min={1} max={20} onCommit={v => commit({ dailyGoalPomodoros: v })} />
        </div>
      </Card>

      <Card title="复习">
        <IntervalsField value={form.reviewIntervals} onCommit={v => commit({ reviewIntervals: v })} />
        <p className="mt-2 text-xs text-mute">
          艾宾浩斯间隔(天):记得 → 进入下一档;模糊 → 档位不变、明天再见;忘了 → 回到第 1 档(明天再见)。
        </p>
      </Card>

      <Card title="通用">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm">关闭窗口时最小化到托盘</div>
              <div className="text-xs text-mute">计时继续,完成时弹系统通知;从托盘菜单退出才真正关闭</div>
            </div>
            <Toggle checked={form.closeToTray} onChange={v => commit({ closeToTray: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm">专注结束后自动开始休息</div>
              <div className="text-xs text-mute">关闭时,完成番茄后回到待开始状态</div>
            </div>
            <Toggle checked={form.autoStartBreak} onChange={v => commit({ autoStartBreak: v })} />
          </div>
        </div>
      </Card>

      <Card title="数据与备份">
        <div className="space-y-1 break-all text-xs text-mute">
          <div>数据文件:{info?.dataFile ?? '…'}</div>
          <div>截图目录:{info?.imagesDir ?? '…'}</div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn onClick={() => window.api.backup.openDataDir()}>
            <FolderOpen size={14} />
            打开数据目录
          </Btn>
          <Btn onClick={doExport}>
            <Download size={14} />
            导出备份
          </Btn>
          <Btn onClick={doImport}>
            <Upload size={14} />
            导入备份
          </Btn>
        </div>
        <p className="mt-2 text-xs text-mute">备份为单个 JSON 文件(含截图),可在任何一台电脑上导入恢复。</p>
      </Card>
    </div>
  )
}

function NumField({
  label,
  value,
  min,
  max,
  onCommit
}: {
  label: string
  value: number
  min: number
  max: number
  onCommit: (v: number) => void
}) {
  const [v, setV] = useState(String(value))
  useEffect(() => setV(String(value)), [value])
  return (
    <Field label={label}>
      <Input
        type="number"
        min={min}
        max={max}
        className="w-full"
        value={v}
        onChange={e => setV(e.target.value)}
        onBlur={() => {
          const n = Math.max(min, Math.min(max, Math.round(Number(v) || min)))
          onCommit(n)
        }}
      />
    </Field>
  )
}

function IntervalsField({
  value,
  onCommit
}: {
  value: number[]
  onCommit: (v: number[]) => void
}) {
  const [v, setV] = useState(value.join(','))
  useEffect(() => setV(value.join(',')), [value])
  return (
    <Field label="间隔序列(天,逗号分隔)">
      <Input
        className="w-64"
        value={v}
        onChange={e => setV(e.target.value)}
        onBlur={() => {
          const arr = v
            .split(',')
            .map(x => Number(x.trim()))
            .filter(x => Number.isFinite(x) && x >= 1)
          if (arr.length > 0) onCommit(arr)
        }}
      />
    </Field>
  )
}

function SubjectRow({ subject, onSaved }: { subject: Subject; onSaved: () => void }) {
  const [name, setName] = useState(subject.name)
  const [color, setColor] = useState(subject.color)

  const save = async (next: { name?: string; color?: string }) => {
    await window.api.subjects.update({ ...subject, name: next.name ?? name, color: next.color ?? color })
    onSaved()
  }

  const remove = async () => {
    if (!confirm(`删除科目「${subject.name}」?相关记录将归入「未分类」。`)) return
    await window.api.subjects.remove(subject.id)
    onSaved()
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={color}
        onChange={e => {
          setColor(e.target.value)
          save({ color: e.target.value })
        }}
        className="size-8 shrink-0 cursor-pointer rounded-lg"
      />
      <Input
        className="flex-1"
        value={name}
        onChange={e => setName(e.target.value)}
        onBlur={() => {
          if (name.trim() && name.trim() !== subject.name) save({ name: name.trim() })
        }}
      />
      <IconBtn className="hover:!text-bad" onClick={remove} title="删除科目">
        <Trash2 size={14} />
      </IconBtn>
    </div>
  )
}

function AddSubjectRow({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#5b8cff')

  const add = async () => {
    const n = name.trim()
    if (!n) return
    await window.api.subjects.add({ name: n, color })
    setName('')
    onAdded()
  }

  return (
    <div className="mt-3 flex items-center gap-2 border-t border-black/[.08] pt-3">
      <input type="color" value={color} onChange={e => setColor(e.target.value)} className="size-8 shrink-0 cursor-pointer rounded-lg" />
      <Input
        className="flex-1"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') add()
        }}
        placeholder="新科目名称,回车添加"
      />
      <Btn size="sm" onClick={add}>
        <Plus size={13} />
        添加
      </Btn>
    </div>
  )
}
