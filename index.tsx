import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  memo
} from "react"
import ReactDOM from "react-dom/client"
import { Users, ChevronLeft, ChevronRight } from "lucide-react"

/* ================== CONFIG ================== */

const STORAGE_KEY = "thcs_teaching_fast_v1"

const SUBJECTS = [
  { name: "Toán", p6: 4, p7: 4, p8: 4, p9: 4 },
  { name: "Văn", p6: 4, p7: 4, p8: 4, p9: 4 },
  { name: "Anh", p6: 3, p7: 3, p8: 3, p9: 3 }
]

/* ================== UTILS ================== */

const isValidClass = (c: string) => /^[6-9][A-Z0-9]+$/i.test(c)

const calcTKB = (assign: string, subjMap: Map<string, any>) => {
  if (!assign) return 0
  let total = 0
  assign.split(";").forEach(p => {
    const [sub, cls] = p.split(":")
    const conf = subjMap.get(sub?.trim().toLowerCase())
    if (!conf) return
    cls?.split(",").forEach(c => {
      const g = c.trim()[0]
      total += conf[`p${g}`] || 0
    })
  })
  return total
}

/* ================== INPUT ================== */

const NumberInput = memo(
  ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
    const [v, setV] = useState(value)
    useEffect(() => setV(value), [value])
    return (
      <input
        type="number"
        value={v}
        className="w-16 text-center p-1 border rounded"
        onChange={e => setV(+e.target.value)}
        onBlur={() => onChange(v)}
      />
    )
  }
)

const AssignmentInput = memo(
  ({
    value,
    onSave,
    conflictMap
  }: {
    value: string
    onSave: (v: string) => void
    conflictMap: Record<string, string>
  }) => {
    const [v, setV] = useState(value)
    const [err, setErr] = useState("")
    useEffect(() => setV(value), [value])

    const commit = () => {
      if (v === value) return
      const norm = v.trim()
      if (!norm) return onSave("")
      for (const p of norm.split(";")) {
        const [s, c] = p.split(":")
        if (!s || !c) continue
        for (const cls of c.split(",")) {
          if (!isValidClass(cls.trim())) {
            setErr("Sai định dạng lớp")
            return
          }
          const key = `${s.trim()}:${cls.trim()}`
          if (conflictMap[key]) {
            setErr(`Trùng ${conflictMap[key]}`)
            return
          }
        }
      }
      setErr("")
      onSave(norm)
    }

    return (
      <>
        <input
          value={v}
          onChange={e => setV(e.target.value)}
          onBlur={commit}
          className="w-full p-2 border rounded"
        />
        {err && <div className="text-red-500 text-xs">{err}</div>}
      </>
    )
  }
)

/* ================== ROW ================== */

const TeacherRow = memo(
  ({
    t,
    assign,
    log,
    tkb,
    conflicts,
    onAssign,
    onLog
  }: any) => (
    <tr>
      <td className="p-2 font-bold">{t.name}</td>
      <td className="p-2">
        <AssignmentInput
          value={assign}
          conflictMap={conflicts}
          onSave={v => onAssign(t.id, v)}
        />
      </td>
      <td className="p-2 text-center">{tkb}</td>
      <td className="p-2 text-center">
        <NumberInput value={log.bu} onChange={v => onLog(t.id, { ...log, bu: v })} />
      </td>
      <td className="p-2 text-center">
        <NumberInput
          value={log.tang}
          onChange={v => onLog(t.id, { ...log, tang: v })}
        />
      </td>
    </tr>
  )
)

/* ================== APP ================== */

const App = () => {
  const [week, setWeek] = useState(1)
  const [data, setData] = useState<any>(() => {
    const s = localStorage.getItem(STORAGE_KEY)
    return (
      (s && JSON.parse(s)) || {
        weeks: {}
      }
    )
  })

  useEffect(() => {
    const t = setTimeout(
      () => localStorage.setItem(STORAGE_KEY, JSON.stringify(data)),
      400
    )
    return () => clearTimeout(t)
  }, [data])

  const weekData = data.weeks[week] || {
    teachers: [],
    assigns: {},
    logs: {}
  }

  const subjMap = useMemo(() => {
    const m = new Map()
    SUBJECTS.forEach(s => m.set(s.name.toLowerCase(), s))
    return m
  }, [])

  const teacherMap = useMemo(() => {
    const m = new Map()
    weekData.teachers.forEach((t: any) => m.set(t.id, t.name))
    return m
  }, [weekData.teachers])

  const conflictMap = useMemo(() => {
    const m: any = {}
    Object.entries(weekData.assigns).forEach(([id, str]: any) => {
      const name = teacherMap.get(id)
      str?.split(";").forEach((p: any) => {
        const [s, c] = p.split(":")
        c?.split(",").forEach((cls: any) => {
          m[`${s.trim()}:${cls.trim()}`] = name
        })
      })
    })
    return m
  }, [weekData.assigns, teacherMap])

  const tkbMap = useMemo(() => {
    const m = new Map()
    weekData.teachers.forEach((t: any) =>
      m.set(t.id, calcTKB(weekData.assigns[t.id], subjMap))
    )
    return m
  }, [weekData.assigns, weekData.teachers, subjMap])

  const updateWeek = useCallback(
    (patch: any) =>
      setData((p: any) => ({
        ...p,
        weeks: {
          ...p.weeks,
          [week]: { ...weekData, ...patch }
        }
      })),
    [week, weekData]
  )

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => setWeek(w => Math.max(1, w - 1))}>
          <ChevronLeft />
        </button>
        <div className="font-bold text-xl">Tuần {week}</div>
        <button onClick={() => setWeek(w => w + 1)}>
          <ChevronRight />
        </button>
      </div>

      <button
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded"
        onClick={() =>
          updateWeek({
            teachers: [
              {
                id: Date.now().toString(),
                name: "GV mới"
              },
              ...weekData.teachers
            ]
          })
        }
      >
        + Thêm GV
      </button>

      <table className="w-full border">
        <thead>
          <tr className="bg-slate-100">
            <th>GV</th>
            <th>Phân công</th>
            <th>TKB</th>
            <th>Bù</th>
            <th>Tăng</th>
          </tr>
        </thead>
        <tbody>
          {weekData.teachers.map((t: any) => (
            <TeacherRow
              key={t.id}
              t={t}
              assign={weekData.assigns[t.id] || ""}
              log={weekData.logs[t.id] || { bu: 0, tang: 0 }}
              tkb={tkbMap.get(t.id) || 0}
              conflicts={conflictMap}
              onAssign={(id: string, v: string) =>
                updateWeek({
                  assigns: { ...weekData.assigns, [id]: v }
                })
              }
              onLog={(id: string, v: any) =>
                updateWeek({
                  logs: { ...weekData.logs, [id]: v }
                })
              }
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />)
