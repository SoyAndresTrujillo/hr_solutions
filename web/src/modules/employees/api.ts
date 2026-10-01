import { apiGet } from '../../lib/api-client'

export type ContractType = 'full_time' | 'part_time' | 'contractor'
export type EmployeeStatus = 'active' | 'on_leave' | 'terminated'

// Mirrors api/src/modules/employees/employees.schema.ts (S4 consumer). Keep in sync.
export type Employee = {
  id: string
  name: string
  email: string
  department: string
  jobTitle: string
  location: string
  hireDate: string // YYYY-MM-DD, a UTC calendar date
  salary: number // integer USD per year
  contractType: ContractType
  status: EmployeeStatus
  manager: string | null
  vacationDays: number // integer 0-30
}

export const fetchEmployees = () => apiGet<Employee[]>('/api/employees')
