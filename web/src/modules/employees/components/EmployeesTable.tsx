import { t, type MessageKey } from '../../../i18n/t'
import type { Employee } from '../api'

const COLUMNS = [
  'employees.columns.id',
  'employees.columns.name',
  'employees.columns.email',
  'employees.columns.department',
  'employees.columns.jobTitle',
  'employees.columns.location',
  'employees.columns.hireDate',
  'employees.columns.salary',
  'employees.columns.contractType',
  'employees.columns.status',
  'employees.columns.manager',
  'employees.columns.vacationDays',
] as const satisfies readonly MessageKey[]

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

export function EmployeesTable({ employees }: { employees: Employee[] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {COLUMNS.map((key) => (
              <th key={key} scope="col">
                {t(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map((e) => (
            <tr key={e.id}>
              <td>{e.id}</td>
              <td>{e.name}</td>
              <td>{e.email}</td>
              <td>{e.department}</td>
              <td>{e.jobTitle}</td>
              <td>{e.location}</td>
              <td>{dateFormat.format(new Date(e.hireDate))}</td>
              <td>{salaryFormat.format(e.salary)}</td>
              <td>{t(`employees.contractType.${e.contractType}`)}</td>
              <td>{t(`employees.status.${e.status}`)}</td>
              <td>{e.manager ?? t('employees.noManager')}</td>
              <td>{e.vacationDays}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
