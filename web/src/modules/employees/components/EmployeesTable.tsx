import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { t, type MessageKey } from '../../../i18n/t'
import type { Employee } from '../api'

const salaryFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})
// hireDate is a date-only ISO string, parsed as UTC midnight: format in UTC or
// timezones west of UTC show the previous day.
const dateFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  dateStyle: 'medium',
})

type Column = {
  label: MessageKey
  text: (e: Employee) => string
  sortValue?: (e: Employee) => string | number
}

const COLUMNS: Column[] = [
  { label: 'employees.columns.id', text: (e) => e.id },
  { label: 'employees.columns.name', text: (e) => e.name },
  { label: 'employees.columns.email', text: (e) => e.email },
  { label: 'employees.columns.department', text: (e) => e.department },
  { label: 'employees.columns.jobTitle', text: (e) => e.jobTitle },
  { label: 'employees.columns.location', text: (e) => e.location },
  {
    label: 'employees.columns.hireDate',
    text: (e) => dateFormat.format(new Date(e.hireDate)),
    sortValue: (e) => e.hireDate,
  },
  {
    label: 'employees.columns.salary',
    text: (e) => salaryFormat.format(e.salary),
    sortValue: (e) => e.salary,
  },
  {
    label: 'employees.columns.contractType',
    text: (e) => t(`employees.contractType.${e.contractType}`),
  },
  { label: 'employees.columns.status', text: (e) => t(`employees.status.${e.status}`) },
  { label: 'employees.columns.manager', text: (e) => e.manager ?? t('employees.noManager') },
  {
    label: 'employees.columns.vacationDays',
    text: (e) => String(e.vacationDays),
    sortValue: (e) => e.vacationDays,
  },
]

type SortState = { label: MessageKey; dir: 'asc' | 'desc' }
type Filters = Partial<Record<MessageKey, string[]>>

function compare(col: Column, a: Employee, b: Employee): number {
  const x = (col.sortValue ?? col.text)(a)
  const y = (col.sortValue ?? col.text)(b)
  return typeof x === 'number' && typeof y === 'number'
    ? x - y
    : String(x).localeCompare(String(y), 'en-US')
}

export function EmployeesTable({ employees }: { employees: Employee[] }) {
  const [sort, setSort] = useState<SortState | null>(null)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>({})
  const [openLabel, setOpenLabel] = useState<MessageKey | null>(null)
  const uid = useId()

  function toggleSort(label: MessageKey) {
    setSort((s) => {
      if (s?.label !== label) return { label, dir: 'asc' }
      return s.dir === 'asc' ? { label, dir: 'desc' } : null
    })
  }

  const options = useMemo(
    () =>
      COLUMNS.map((c) => {
        const first = new Map<string, Employee>()
        for (const e of employees) {
          const text = c.text(e)
          if (!first.has(text)) first.set(text, e)
        }
        return [...first].sort(([, a], [, b]) => compare(c, a, b)).map(([text]) => text)
      }),
    [employees],
  )

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matching = employees.filter(
      (e) =>
        COLUMNS.every((c) => {
          const picked = filters[c.label]
          return !picked?.length || picked.includes(c.text(e))
        }) &&
        (!q || COLUMNS.some((c) => c.text(e).toLowerCase().includes(q))),
    )
    const col = COLUMNS.find((c) => c.label === sort?.label)
    if (!sort || !col) return matching
    const sign = sort.dir === 'asc' ? 1 : -1
    return [...matching].sort((a, b) => sign * compare(col, a, b))
  }, [employees, filters, search, sort])

  function toggleOption(label: MessageKey, text: string) {
    setFilters((f) => {
      const cur = f[label] ?? []
      const next: Filters = { ...f }
      next[label] = cur.includes(text) ? cur.filter((x) => x !== text) : [...cur, text]
      return next
    })
  }

  function clearAll() {
    setSearch('')
    setFilters({})
  }

  function closeOnEscape(ev: KeyboardEvent<HTMLElement>, label: MessageKey) {
    if (ev.key !== 'Escape' || openLabel !== label) return
    setOpenLabel(null)
    ev.currentTarget.querySelector<HTMLButtonElement>('button[aria-expanded]')?.focus()
  }

  return (
    <>
      <div className="table-toolbar">
        <label>
          {t('employees.search.label')}
          <input type="search" value={search} onChange={(ev) => setSearch(ev.target.value)} />
        </label>
        <button type="button" onClick={clearAll}>
          {t('employees.clearAll')}
        </button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {COLUMNS.map((c, i) => {
                const dir = sort?.label === c.label ? sort.dir : undefined
                const open = openLabel === c.label
                const id = `${uid}-${i}`
                return (
                  <th
                    key={c.label}
                    scope="col"
                    aria-sort={dir && (dir === 'asc' ? 'ascending' : 'descending')}
                    onKeyDown={(ev) => closeOnEscape(ev, c.label)}
                  >
                    <button
                      type="button"
                      id={`${id}-sort`}
                      className="sort-button"
                      onClick={() => toggleSort(c.label)}
                    >
                      {t(c.label)}
                      {dir && (
                        <span aria-hidden="true" className="sort-glyph">
                          {dir === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      id={`${id}-filter`}
                      className="filter-toggle"
                      aria-expanded={open}
                      aria-controls={`${id}-panel`}
                      aria-labelledby={`${id}-filter ${id}-sort`}
                      onClick={() => setOpenLabel(open ? null : c.label)}
                    >
                      {t('employees.filter.label')}
                    </button>
                    {open && (
                      <div
                        id={`${id}-panel`}
                        role="group"
                        aria-labelledby={`${id}-sort`}
                        className="filter-panel"
                      >
                        {options[i].map((text) => (
                          <label key={text}>
                            <input
                              type="checkbox"
                              checked={filters[c.label]?.includes(text) ?? false}
                              onChange={() => toggleOption(c.label, text)}
                            />
                            {text}
                          </label>
                        ))}
                      </div>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                {COLUMNS.map((c) => (
                  <td key={c.label}>{c.text(e)}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length}>{t('employees.empty')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
