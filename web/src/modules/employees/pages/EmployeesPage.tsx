import { t } from '../../../i18n/t'
import { EmployeesTable } from '../components/EmployeesTable'
import { useEmployees } from '../hooks/useEmployees'

export function EmployeesPage() {
  const state = useEmployees()

  return (
    <main>
      <h1>{t('employees.title')}</h1>
      {state.status === 'loading' && <p role="status">{t('employees.loading')}</p>}
      {state.status === 'error' && <p role="alert">{t('employees.error')}</p>}
      {state.status === 'success' && <EmployeesTable employees={state.employees} />}
    </main>
  )
}
