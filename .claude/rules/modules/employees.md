---
paths:
  - "api/src/modules/employees/**"
  - "web/src/modules/employees/**"
---
# employees
Purpose: public read-only employee directory — API serves mock employees, web renders them in one table.
Depends on: none · Consumed by: none
Rules:
- Data is mock, generated in code (HR-1); no database, no auth. API order (EMP-001..050) is the table's default order.
- Sort, column filters and search run client-side on the loaded list (HR-2); the API takes no query params.
- Search and filter options match the displayed cell text (formatted salary/date, enum labels, "No manager"), not raw values. Sort uses raw values only for salary, vacation days and hire date.
Gotchas:
- `COLUMNS` in EmployeesTable.tsx is the single column definition: its `text` accessor feeds cells, search and filter options. Add a column there, never a second formatter.
- Filter panels render only while open; closed panels would duplicate cell text and break `getByText` queries in tests.
