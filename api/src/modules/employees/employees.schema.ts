import { z } from 'zod';

export const contractTypeSchema = z.enum(['full_time', 'part_time', 'contractor']);
export const employeeStatusSchema = z.enum(['active', 'on_leave', 'terminated']);

export const employeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  department: z.string(),
  jobTitle: z.string(),
  location: z.string(),
  hireDate: z.iso.date(),
  salary: z.int().positive(),
  contractType: contractTypeSchema,
  status: employeeStatusSchema,
  manager: z.string().nullable(),
  vacationDays: z.int().min(0).max(30),
});

export type Employee = z.infer<typeof employeeSchema>;
