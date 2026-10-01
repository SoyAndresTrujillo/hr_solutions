import { describe, expect, it } from 'vitest';
import { generateEmployees } from './employees.mock.js';
import { employeeSchema } from './employees.schema.js';
import { listEmployees } from './employees.service.js';

describe('listEmployees', () => {
  const employees = listEmployees();

  it('returns 50 rows that satisfy the schema', () => {
    expect(employees).toHaveLength(50);
    expect(employeeSchema.array().safeParse(employees).success).toBe(true);
  });

  it('has unique ids, in EMP-001..EMP-050 order, and unique emails', () => {
    const ids = employees.map((e) => e.id);
    expect(ids[0]).toBe('EMP-001');
    expect(ids[49]).toBe('EMP-050');
    expect(new Set(ids).size).toBe(50);
    expect(new Set(employees.map((e) => e.email)).size).toBe(50);
  });

  it('has root rows with a null manager and real managers elsewhere', () => {
    const names = new Set(employees.map((e) => e.name));
    expect(employees.some((e) => e.manager === null)).toBe(true);
    for (const e of employees) {
      if (e.manager !== null) expect(names.has(e.manager)).toBe(true);
    }
  });

  it('is deterministic', () => {
    expect(generateEmployees()).toEqual(generateEmployees());
  });
});
