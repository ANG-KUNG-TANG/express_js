export const createFakeTask = (overrides = {}) => {
  const defaults = {
    id: '507f1f77bcf86cd799439011',
    title: 'Test Task',
    description: 'Test Description',
    status: 'PENDING',
    priority: 'MEDIUM',
    dueDate: new Date('2025-12-31'),
    userId: '507f1f77bcf86cd799439012',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return { ...defaults, ...overrides };
};