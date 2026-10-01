import { generateEmployees } from './employees.mock.js';
import type { Employee } from './employees.schema.js';

const employees: readonly Employee[] = generateEmployees();

export function findAll(): readonly Employee[] {
  return employees;
}
