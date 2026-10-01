import type { RequestHandler } from 'express';
import { listEmployees } from './employees.service.js';

export const getEmployees: RequestHandler = (_req, res) => {
  res.json(listEmployees());
};
