import { jest } from '@jest/globals';

const mockFindTasks = jest.fn();

jest.unstable_mockModule('../../../infrastructure/repositories/task_repo', () => ({
  findTasks: mockFindTasks,
}));

const { listTasks } = await import('../../../app/task_uc/list_task.uc');
const { createFakeTask } = await import('../__mock__/task_helpers');

describe('listTasks use case', () => {
  const userId = '507f1f77bcf86cd799439012';
  const fakeTasks = [
    createFakeTask({ id: '1', userId }),
    createFakeTask({ id: '2', userId }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return tasks without userId filter', async () => {
    mockFindTasks.mockResolvedValue(fakeTasks);

    const result = await listTasks({ status: 'PENDING' }, { limit: 10 });

    expect(mockFindTasks).toHaveBeenCalledWith({ status: 'PENDING' }, { limit: 10 });
    expect(result).toEqual(fakeTasks);
  });

  it('should inject userId into options when provided', async () => {
    mockFindTasks.mockResolvedValue(fakeTasks);

    const result = await listTasks({ status: 'PENDING' }, { limit: 10 }, userId);

    expect(mockFindTasks).toHaveBeenCalledWith(
      { status: 'PENDING' },
      { limit: 10, userId }
    );
    expect(result).toEqual(fakeTasks);
  });

  it('should pass empty filters and default options', async () => {
    mockFindTasks.mockResolvedValue([]);

    const result = await listTasks();

    expect(mockFindTasks).toHaveBeenCalledWith({}, {});
    expect(result).toEqual([]);
  });
});