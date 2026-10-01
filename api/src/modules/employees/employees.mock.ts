import type { Employee } from './employees.schema.js';

const FIRST_NAMES = ['Ava', 'Liam', 'Mia', 'Noah', 'Zoe', 'Ethan', 'Ivy', 'Lucas', 'Nora', 'Owen'];
const LAST_NAMES = ['Smith', 'Garcia', 'Chen', 'Patel', 'Silva'];
const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'Finance', 'People Operations'];
const LEVELS = ['Junior', 'Mid-level', 'Senior', 'Lead'];
const LOCATIONS = ['New York', 'Austin', 'London', 'Berlin', 'Toronto', 'Madrid', 'Remote'];
const DAY_MS = 86_400_000;

function personName(i: number): string {
  const first = FIRST_NAMES[i % FIRST_NAMES.length];
  const last = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
  return `${first} ${last}`;
}

// Deterministic on purpose: index math only, no RNG and no clock.
export function generateEmployees(count = 50): Employee[] {
  return Array.from({ length: count }, (_, i): Employee => {
    const name = personName(i);
    const department = DEPARTMENTS[i % DEPARTMENTS.length];
    const isHead = i < DEPARTMENTS.length;
    return {
      id: `EMP-${String(i + 1).padStart(3, '0')}`,
      name,
      email: `${name.toLowerCase().replace(' ', '.')}@hrsolutions.example`,
      department,
      jobTitle: isHead
        ? `Head of ${department}`
        : `${LEVELS[i % LEVELS.length]} ${department} Specialist`,
      location: LOCATIONS[i % LOCATIONS.length],
      hireDate: new Date(Date.UTC(2015, 0, 1) + i * 67 * DAY_MS).toISOString().slice(0, 10),
      salary: isHead ? 150_000 + i * 5_000 : 50_000 + ((i * 37) % 70) * 1_000,
      contractType: i % 10 === 9 ? 'contractor' : i % 7 === 6 ? 'part_time' : 'full_time',
      status: i % 13 === 12 ? 'terminated' : i % 6 === 5 ? 'on_leave' : 'active',
      manager: isHead ? null : personName(i % DEPARTMENTS.length),
      vacationDays: (i * 11) % 31,
    };
  });
}
