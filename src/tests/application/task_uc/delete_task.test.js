import { jest } from '@jest/globals';

const mockFindTaskByID = jest.fn();
const mockDeleteTask = jest.fn();
const mockEnsureTaskOwnership = jest.fn((task, userId) => {
  if (task.userId !== userId) throw new Error('User does not own task');
});

jest.unstable_mockModule('../../../infrastructure/repositories/task_repo', () => ({
  findTaskByID: mockFindTaskByID,
  deleteTask: mockDeleteTask,
  ensureTaskOwnership: mockEnsureTaskOwnership,
}));

const { deleteTask } = await import('../../../app/task_uc/delete_task.uc');
const { createFakeTask } = await import('../__mock__/task_helpers');

describe('deleteTask use case', () => {
  const taskId = '507f1f77bcf86cd799439011';
  const userId = '507f1f77bcf86cd799439012';
  const fakeTask = createFakeTask({ id: taskId, userId });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindTaskByID.mockResolvedValue(fakeTask);
    mockDeleteTask.mockResolvedValue(true);
    mockEnsureTaskOwnership.mockImplementation((task, uid) => {
      if (task.userId !== uid) throw new Error('User does not own task');
    });
  });

  it('should delete task successfully', async () => {
    const result = await deleteTask(taskId, userId);

    expect(mockFindTaskByID).toHaveBeenCalledWith(taskId);
    expect(mockDeleteTask).toHaveBeenCalledWith(taskId);
    expect(result).toBe(true);
  });

  it('should throw ownership error if user does not own task', async () => {
    const wrongUser = 'another-user';
    // Task is owned by the real userId, not wrongUser — so ownership check will throw
    const otherTask = createFakeTask({ id: taskId, userId });
    mockFindTaskByID.mockResolvedValue(otherTask);

    await expect(deleteTask(taskId, wrongUser)).rejects.toThrow(/does not own task/);
    expect(mockDeleteTask).not.toHaveBeenCalled();
  });

  it('should propagate not found error from findTaskByID', async () => {
    mockFindTaskByID.mockRejectedValue(new Error('Task not found'));
    await expect(deleteTask(taskId, userId)).rejects.toThrow('Task not found');
    expect(mockDeleteTask).not.toHaveBeenCalled();
  });

  it('should propagate error from deleteTask', async () => {
    mockDeleteTask.mockRejectedValue(new Error('Delete failed'));
    await expect(deleteTask(taskId, userId)).rejects.toThrow('Delete failed');
  });
});