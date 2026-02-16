import { jest } from '@jest/globals';

const mockTransferTasks = jest.fn();

jest.unstable_mockModule('../../../infrastructure/repositories/task_repo', () => ({
  transferTasks: mockTransferTasks,
}));

const { transferTasks } = await import('../../../app/task_uc/transfer_task.uc');

describe('transferTasks use case', () => {
  const fromUserId = '507f1f77bcf86cd799439012';
  const toUserId = '507f1f77bcf86cd799439013';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should transfer tasks successfully', async () => {
    const mockResult = { transferred: 5 };
    mockTransferTasks.mockResolvedValue(mockResult);

    const result = await transferTasks(fromUserId, toUserId);

    expect(mockTransferTasks).toHaveBeenCalledWith(fromUserId, toUserId, null);
    expect(result).toEqual(mockResult);
  });

  it('should pass session if provided', async () => {
    const session = { id: 'session123' };
    mockTransferTasks.mockResolvedValue({ transferred: 2 });

    await transferTasks(fromUserId, toUserId, session);

    expect(mockTransferTasks).toHaveBeenCalledWith(fromUserId, toUserId, session);
  });

  it('should propagate repository errors', async () => {
    mockTransferTasks.mockRejectedValue(new Error('Invalid user ID'));
    await expect(transferTasks(fromUserId, toUserId)).rejects.toThrow('Invalid user ID');
  });
});