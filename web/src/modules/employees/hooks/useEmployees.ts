import { useEffect, useState } from 'react'
import { fetchEmployees, type Employee } from '../api'

export type EmployeesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; employees: Employee[] }

export function useEmployees(): EmployeesState {
  const [state, setState] = useState<EmployeesState>({ status: 'loading' })

  useEffect(() => {
    // StrictMode runs effects twice in dev: drop the stale run's result.
    let ignore = false
    fetchEmployees()
      .then((employees) => {
        if (!ignore) setState({ status: 'success', employees })
      })
      .catch(() => {
        if (!ignore) setState({ status: 'error' })
      })
    return () => {
      ignore = true
    }
  }, [])

  return state
}
