import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import en from '../../../i18n/en.json'
import type { Employee } from '../api'
import { EmployeesTable } from './EmployeesTable'

const employees: Employee[] = [
  {
    id: 'EMP-001',
    name: 'Ava Smith',
    email: 'ava.smith@hrsolutions.example',
    department: 'Engineering',
    jobTitle: 'Head of Engineering',
    location: 'New York',
    hireDate: '2015-01-01',
    salary: 150000,
    contractType: 'full_time',
    status: 'active',
    manager: null,
    vacationDays: 0,
  },
  {
    id: 'EMP-006',
    name: 'Ethan Chen',
    email: 'ethan.chen@hrsolutions.example',
    department: 'Sales',
    jobTitle: 'Senior Sales Specialist',
    location: 'Berlin',
    hireDate: '2015-12-02',
    salary: 85000,
    contractType: 'contractor',
    status: 'on_leave',
    manager: 'Ava Smith',
    vacationDays: 24,
  },
]

describe('EmployeesTable', () => {
  it('renders the 12 column headers in order', () => {
    render(<EmployeesTable employees={employees} />)
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      en['employees.columns.id'],
      en['employees.columns.name'],
      en['employees.columns.email'],
      en['employees.columns.department'],
      en['employees.columns.jobTitle'],
      en['employees.columns.location'],
      en['employees.columns.hireDate'],
      en['employees.columns.salary'],
      en['employees.columns.contractType'],
      en['employees.columns.status'],
      en['employees.columns.manager'],
      en['employees.columns.vacationDays'],
    ])
  })

  it('renders one row per employee plus the header row', () => {
    render(<EmployeesTable employees={employees} />)
    expect(screen.getAllByRole('row')).toHaveLength(employees.length + 1)
  })

  it('formats salary and hire date, and labels enums (UTC date, any timezone)', () => {
    render(<EmployeesTable employees={employees} />)
    const row = screen.getByRole('row', { name: /EMP-006/ })
    expect(within(row).getByText('$85,000')).toBeInTheDocument()
    expect(within(row).getByText('Dec 2, 2015')).toBeInTheDocument()
    expect(within(row).getByText(en['employees.contractType.contractor'])).toBeInTheDocument()
    expect(within(row).getByText(en['employees.status.on_leave'])).toBeInTheDocument()
    expect(within(row).getByText('Ava Smith')).toBeInTheDocument()
  })

  it('shows the no-manager label for a null manager', () => {
    render(<EmployeesTable employees={employees} />)
    const row = screen.getByRole('row', { name: /EMP-001/ })
    expect(within(row).getByText(en['employees.noManager'])).toBeInTheDocument()
    expect(within(row).getByText('Jan 1, 2015')).toBeInTheDocument()
  })
})
