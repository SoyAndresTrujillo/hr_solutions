import { fireEvent, render, screen, within } from '@testing-library/react'
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
  {
    id: 'EMP-007',
    name: 'Mia Brown',
    email: 'mia.brown@hrsolutions.example',
    department: 'Sales',
    jobTitle: 'Sales Specialist',
    location: 'Berlin',
    hireDate: '2014-06-15',
    salary: 9500,
    contractType: 'part_time',
    status: 'active',
    manager: 'Ava Smith',
    vacationDays: 5,
  },
  {
    id: 'EMP-008',
    name: 'Noah Diaz',
    email: 'noah.diaz@hrsolutions.example',
    department: 'Engineering',
    jobTitle: 'Software Engineer',
    location: 'New York',
    hireDate: '2016-03-10',
    salary: 150000,
    contractType: 'full_time',
    status: 'active',
    manager: 'Ava Smith',
    vacationDays: 10,
  },
]

const ids = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0].textContent)
const header = (label: string) =>
  screen.getByRole('columnheader', { name: new RegExp(`^${label}\\b`) })
const clickSort = (label: string) => fireEvent.click(screen.getByRole('button', { name: label }))
const openFilter = (label: string) =>
  fireEvent.click(screen.getByRole('button', { name: `${en['employees.filter.label']} ${label}` }))
const check = (name: string) => fireEvent.click(screen.getByRole('checkbox', { name }))
const search = (value: string) =>
  fireEvent.change(screen.getByLabelText(en['employees.search.label']), { target: { value } })

describe('EmployeesTable', () => {
  it('renders a sort button per column in order', () => {
    render(<EmployeesTable employees={employees} />)
    expect(
      screen.getAllByRole('columnheader').map((h) => within(h).getAllByRole('button')[0].textContent),
    ).toEqual([
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

  it('renders every cell of a row from the column definitions', () => {
    render(<EmployeesTable employees={employees} />)
    const row = screen.getByRole('row', { name: /EMP-007/ })
    expect(within(row).getAllByRole('cell')).toHaveLength(12)
    expect(within(row).getByText('Jun 15, 2014')).toBeInTheDocument()
    expect(within(row).getByText('$9,500')).toBeInTheDocument()
    expect(within(row).getByText(en['employees.contractType.part_time'])).toBeInTheDocument()
    expect(within(row).getByText('5')).toBeInTheDocument()
  })

  it('keeps API order until a sort is chosen', () => {
    render(<EmployeesTable employees={employees} />)
    expect(ids()).toEqual(['EMP-001', 'EMP-006', 'EMP-007', 'EMP-008'])
    screen.getAllByRole('columnheader').forEach((h) => expect(h).not.toHaveAttribute('aria-sort'))
  })

  it('cycles ascending, descending, none and keeps tie order on descending', () => {
    render(<EmployeesTable employees={employees} />)
    const label = en['employees.columns.location']
    clickSort(label)
    expect(header(label)).toHaveAttribute('aria-sort', 'ascending')
    expect(ids()).toEqual(['EMP-006', 'EMP-007', 'EMP-001', 'EMP-008'])
    clickSort(label)
    expect(header(label)).toHaveAttribute('aria-sort', 'descending')
    expect(ids()).toEqual(['EMP-001', 'EMP-008', 'EMP-006', 'EMP-007'])
    clickSort(label)
    expect(header(label)).not.toHaveAttribute('aria-sort')
    expect(ids()).toEqual(['EMP-001', 'EMP-006', 'EMP-007', 'EMP-008'])
  })

  it('marks the active column with a direction glyph', () => {
    render(<EmployeesTable employees={employees} />)
    const label = en['employees.columns.salary']
    expect(within(header(label)).queryByText(/[▲▼]/)).not.toBeInTheDocument()
    clickSort(label)
    expect(within(header(label)).getByText('▲')).toBeInTheDocument()
    clickSort(label)
    expect(within(header(label)).getByText('▼')).toBeInTheDocument()
  })

  it('starts a different column at ascending and clears the previous one', () => {
    render(<EmployeesTable employees={employees} />)
    clickSort(en['employees.columns.salary'])
    clickSort(en['employees.columns.salary'])
    clickSort(en['employees.columns.location'])
    expect(header(en['employees.columns.location'])).toHaveAttribute('aria-sort', 'ascending')
    expect(header(en['employees.columns.salary'])).not.toHaveAttribute('aria-sort')
  })

  it('sorts numeric columns by value, not by text', () => {
    render(<EmployeesTable employees={employees} />)
    clickSort(en['employees.columns.salary'])
    expect(ids()).toEqual(['EMP-007', 'EMP-006', 'EMP-001', 'EMP-008'])
    clickSort(en['employees.columns.vacationDays'])
    expect(ids()).toEqual(['EMP-001', 'EMP-007', 'EMP-008', 'EMP-006'])
  })

  it('sorts hire date chronologically, not by the displayed month name', () => {
    render(<EmployeesTable employees={employees} />)
    clickSort(en['employees.columns.hireDate'])
    expect(ids()).toEqual(['EMP-007', 'EMP-001', 'EMP-006', 'EMP-008'])
  })

  it('sorts enums by label and a null manager as "No manager"', () => {
    render(<EmployeesTable employees={employees} />)
    clickSort(en['employees.columns.contractType'])
    expect(ids()).toEqual(['EMP-006', 'EMP-001', 'EMP-008', 'EMP-007'])
    clickSort(en['employees.columns.manager'])
    expect(ids()).toEqual(['EMP-006', 'EMP-007', 'EMP-008', 'EMP-001'])
  })

  it('renders a filter toggle per column and a closed panel by default', () => {
    render(<EmployeesTable employees={employees} />)
    const toggle = screen.getByRole('button', {
      name: `${en['employees.filter.label']} ${en['employees.columns.department']}`,
    })
    expect(
      screen.getAllByRole('button', { name: new RegExp(`^${en['employees.filter.label']} `) }),
    ).toHaveLength(12)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAttribute('aria-controls', screen.getByRole('group').id)
  })

  it('lists each value once, ordered like the column sort', () => {
    render(<EmployeesTable employees={employees} />)
    openFilter(en['employees.columns.department'])
    const dept = screen.getByRole('group', { name: en['employees.columns.department'] })
    expect(within(dept).getAllByRole('checkbox')).toHaveLength(2)
    expect(dept.textContent).toBe('EngineeringSales')
    openFilter(en['employees.columns.salary'])
    expect(screen.getByRole('group').textContent).toBe('$9,500$85,000$150,000')
  })

  it('does not narrow options by other filters or search', () => {
    render(<EmployeesTable employees={employees} />)
    openFilter(en['employees.columns.department'])
    check('Engineering')
    openFilter(en['employees.columns.location'])
    expect(screen.getByRole('group').textContent).toBe('BerlinNew York')
    search('noah')
    expect(screen.getByRole('group').textContent).toBe('BerlinNew York')
  })

  it('ORs values within a column', () => {
    render(<EmployeesTable employees={employees} />)
    openFilter(en['employees.columns.contractType'])
    check(en['employees.contractType.full_time'])
    expect(ids()).toEqual(['EMP-001', 'EMP-008'])
    check(en['employees.contractType.contractor'])
    expect(ids()).toEqual(['EMP-001', 'EMP-006', 'EMP-008'])
    check(en['employees.contractType.full_time'])
    expect(ids()).toEqual(['EMP-006'])
  })

  it('ANDs filters across columns', () => {
    render(<EmployeesTable employees={employees} />)
    openFilter(en['employees.columns.department'])
    check('Sales')
    expect(ids()).toEqual(['EMP-006', 'EMP-007'])
    openFilter(en['employees.columns.contractType'])
    check(en['employees.contractType.part_time'])
    expect(ids()).toEqual(['EMP-007'])
  })

  it('keeps one panel open at a time and closes it on Escape, returning focus', () => {
    render(<EmployeesTable employees={employees} />)
    openFilter(en['employees.columns.department'])
    openFilter(en['employees.columns.location'])
    expect(screen.getAllByRole('group')).toHaveLength(1)
    expect(
      screen.getByRole('group', { name: en['employees.columns.location'] }),
    ).toBeInTheDocument()
    fireEvent.keyDown(screen.getAllByRole('checkbox')[0], { key: 'Escape' })
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: `${en['employees.filter.label']} ${en['employees.columns.location']}`,
      }),
    ).toHaveFocus()
  })

  it('puts the labelled search input before the table', () => {
    render(<EmployeesTable employees={employees} />)
    const input = screen.getByLabelText(en['employees.search.label'])
    expect(input).toHaveAttribute('type', 'search')
    expect(input.compareDocumentPosition(screen.getByRole('table'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it('searches display text, case-insensitive, partial and trimmed', () => {
    render(<EmployeesTable employees={employees} />)
    search('ETHAN')
    expect(ids()).toEqual(['EMP-006'])
    search('  ethan  ')
    expect(ids()).toEqual(['EMP-006'])
    search('dec 2')
    expect(ids()).toEqual(['EMP-006'])
    search('$85')
    expect(ids()).toEqual(['EMP-006'])
    search('no manager')
    expect(ids()).toEqual(['EMP-001'])
    search('CONTRACTOR')
    expect(ids()).toEqual(['EMP-006'])
    search('   ')
    expect(ids()).toEqual(['EMP-001', 'EMP-006', 'EMP-007', 'EMP-008'])
  })

  it('combines filter, search and sort', () => {
    render(<EmployeesTable employees={employees} />)
    openFilter(en['employees.columns.location'])
    check('Berlin')
    clickSort(en['employees.columns.salary'])
    expect(ids()).toEqual(['EMP-007', 'EMP-006'])
    search('senior')
    expect(ids()).toEqual(['EMP-006'])
    search('head')
    expect(screen.getByText(en['employees.empty'])).toBeInTheDocument()
  })

  it('shows the empty state when nothing matches or there are no employees', () => {
    const { unmount } = render(<EmployeesTable employees={employees} />)
    search('zzz')
    expect(screen.getAllByRole('row')).toHaveLength(2)
    expect(screen.getByText(en['employees.empty'])).toHaveAttribute('colspan', '12')
    unmount()
    render(<EmployeesTable employees={[]} />)
    expect(screen.getByText(en['employees.empty'])).toBeInTheDocument()
  })

  it('Clear all resets search and filters but keeps the sort', () => {
    render(<EmployeesTable employees={employees} />)
    clickSort(en['employees.columns.salary'])
    openFilter(en['employees.columns.department'])
    check('Sales')
    search('ethan')
    expect(ids()).toEqual(['EMP-006'])
    fireEvent.click(screen.getByRole('button', { name: en['employees.clearAll'] }))
    expect(ids()).toEqual(['EMP-007', 'EMP-006', 'EMP-001', 'EMP-008'])
    expect(screen.getByLabelText(en['employees.search.label'])).toHaveValue('')
    expect(screen.getByRole('checkbox', { name: 'Sales' })).not.toBeChecked()
    expect(header(en['employees.columns.salary'])).toHaveAttribute('aria-sort', 'ascending')
  })
})
