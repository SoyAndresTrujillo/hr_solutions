import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import en from '../../../i18n/en.json'
import type { Employee } from '../api'
import { EmployeesPage } from './EmployeesPage'

const employee: Employee = {
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
}

describe('EmployeesPage', () => {
  it('shows the loading status while the request is pending', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))
    render(<EmployeesPage />)
    expect(screen.getByRole('heading', { name: en['employees.title'] })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(en['employees.loading'])
  })

  it('renders the table with the fetched rows', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(Response.json([employee])))
    vi.stubGlobal('fetch', fetchMock)
    render(<EmployeesPage />)
    expect(await screen.findByText('Ava Smith')).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')).toHaveLength(12)
    expect(screen.getAllByRole('row')).toHaveLength(2)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/employees')
  })

  it('shows the error alert when the request rejects', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network'))))
    render(<EmployeesPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent(en['employees.error'])
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows the error alert on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(null, { status: 500 }))))
    render(<EmployeesPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent(en['employees.error'])
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
