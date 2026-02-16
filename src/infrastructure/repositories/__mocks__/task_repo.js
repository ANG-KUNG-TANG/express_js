import { jest } from '@jest/globals';  // ← only this import, nothing from real repo

export const findTaskByID = jest.fn();
export const findTasks = jest.fn();
export const createTask = jest.fn();
export const updateTask = jest.fn();
export const deleteTask = jest.fn();
export const startTask = jest.fn();
export const completeTask = jest.fn();
export const searchTasksByTitle = jest.fn();
export const transferTasks = jest.fn();
export const ensureTaskOwnership = jest.fn();