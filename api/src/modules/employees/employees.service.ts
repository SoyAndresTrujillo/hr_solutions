import { findAll } from './employees.repository.js';
import type { Employee } from './employees.schema.js';

export function listEmployees(): readonly Employee[] {
  return findAll();
}
