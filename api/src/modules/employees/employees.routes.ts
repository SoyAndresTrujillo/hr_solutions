import { Router } from 'express';
import { getEmployees } from './employees.controller.js';

export const employeesRouter = Router().get('/', getEmployees);
