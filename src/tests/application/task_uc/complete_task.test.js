import { jest } from '@jest/globals';

const mockFindTaskByID = jest.fn();
const mockCompleteTask = jest.fn();
const mockEnsureTaskOwnership = jest.fn((task, userId) => {
  if (task.userId !== userId) throw new Error('User does not own task');
});

jest.unstable_mockModule('../../../infrastructure/repositories/task_repo', () => ({
  findTaskByID: mockFindTaskByID,
  completeTask: mockCompleteTask,
  ensureTaskOwnership: mockEnsureTaskOwnership,
}));

jest.unstable_mockModule('../../../core/errors/task.errors', () => ({
  TaskNotFoundError: class TaskNotFoundError extends Error {
    constructor(...args) { super(args[0]); this.name = 'TaskNotFoundError'; }
  },
  TaskValidationError: class TaskValidationError extends Error {
    constructor(...args) { super(args[0]); this.name = 'TaskValidationError'; }
  },
  TaskTitleRequiredError: class TaskTitleRequiredError extends Error {
    constructor(...args) { super(args[0]); this.name = 'TaskTitleRequiredError'; }
  },
  TaskTitleTooShortError: class TaskTitleTooShortError extends Error {
    constructor(...args) { super(args[0]); this.name = 'TaskTitleTooShortError'; }
  },
  TaskTitleTooLongError: class TaskTitleTooLongError extends Error {
    constructor(...args) { super(args[0]); this.name = 'TaskTitleTooLongError'; }
  },
  TaskInvalidStatusError: class TaskInvalidStatusError extends Error {
    constructor(...args) { super(args[0]); this.name = 'TaskInvalidStatusError'; }
  },
  TaskInvalidPriorityError: class TaskInvalidPriorityError extends Error {
    constructor(...args) { super(args[0]); this.name = 'TaskInvalidPriorityError'; }
  },
  TaskInvalidDueDateError: class TaskInvalidDueDateError extends Error {
    constructor(...args) { super(args[0]); this.name = 'TaskInvalidDueDateError'; }
  },
  TaskDueDateInPastError: class TaskDueDateInPastError extends Error {
    constructor(...args) { super(args[0]); this.name = 'TaskDueDateInPastError'; }
  },
  TaskUserIdRequiredError: class TaskUserIdRequiredError extends Error {
    constructor(...args) { super(args[0]); this.name = 'TaskUserIdRequiredError'; }
  },
  TaskInvalidUserIdError: class TaskInvalidUserIdError extends Error {
    constructor(...args) { super(args[0]); this.name = 'TaskInvalidUserIdError'; }
  },
  TaskExtraFieldsError: class TaskExtraFieldsError extends Error {
    constructor(...args) { super(args[0]); this.name = 'TaskExtraFieldsError'; }
  },
  TaskBusinessRuleError: class TaskBusinessRuleError extends Error {
    constructor(...args) { super(args[0]); this.name = 'TaskBusinessRuleError'; }
  },
  TaskAlreadyCompletedError: class TaskAlreadyCompletedError extends Error {
    constructor(...args) { super(args[0]); this.name = 'TaskAlreadyCompletedError'; }
  },
  TaskNotInProgressError: class TaskNotInProgressError extends Error {
    constructor(...args) { super(args[0]); this.name = 'TaskNotInProgressError'; }
  },
  TaskNotPendingError: class TaskNotPendingError extends Error {
    constructor(...args) { super(args[0]); this.name = 'TaskNotPendingError'; }
  },
  TaskCannotEditDeletedError: class TaskCannotEditDeletedError extends Error {
    constructor(...args) { super(args[0]); this.name = 'TaskCannotEditDeletedError'; }
  },
  TaskDueDateChangeAfterCompletionError: class TaskDueDateChangeAfterCompletionError extends Error {
    constructor(...args) { super(args[0]); this.name = 'TaskDueDateChangeAfterCompletionError'; }
  },
  TaskOwnershipError: class TaskOwnershipError extends Error {
    constructor(...args) { super(args[0]); this.name = 'TaskOwnershipError'; }
  },
  TaskDuplicateTitleError: class TaskDuplicateTitleError extends Error {
    constructor(...args) { super(args[0]); this.name = 'TaskDuplicateTitleError'; }
  },
  TaskInvalidIdError: class TaskInvalidIdError extends Error {
    constructor(...args) { super(args[0]); this.name = 'TaskInvalidIdError'; }
  },
}));

const { completeTask } = await import('../../../app/task_uc/complete_task.uc');
const { createFakeTask } = await import('../__mock__/task_helpers');

describe('completeTask use case', () => {
  const taskId = '507f1f77bcf86cd799439011';
  const userId = '507f1f77bcf86cd799439012';
  const fakeTask = createFakeTask({ id: taskId, userId, status: 'IN_PROGRESS' });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindTaskByID.mockResolvedValue(fakeTask);
    mockCompleteTask.mockResolvedValue({ ...fakeTask, status: 'COMPLETED' });
    mockEnsureTaskOwnership.mockImplementation((task, uid) => {
      if (task.userId !== uid) throw new Error('User does not own task');
    });
  });

  it('should complete task successfully', async () => {
    const result = await completeTask(taskId, userId);

    expect(mockFindTaskByID).toHaveBeenCalledWith(taskId);
    expect(mockCompleteTask).toHaveBeenCalledWith(taskId);
    expect(result.status).toBe('COMPLETED');
  });

  it('should throw ownership error if user does not own task', async () => {
    const wrongUser = 'another-user';
    // Task is owned by userId — calling with wrongUser triggers the ownership check
    const otherTask = createFakeTask({ id: taskId, userId });
    mockFindTaskByID.mockResolvedValue(otherTask);

    await expect(completeTask(taskId, wrongUser)).rejects.toThrow(/does not own task/);
    expect(mockCompleteTask).not.toHaveBeenCalled();
  });

  it('should propagate repository error', async () => {
    mockCompleteTask.mockRejectedValue(new Error('Only tasks in progress can be completed'));
    await expect(completeTask(taskId, userId)).rejects.toThrow(/Only tasks in progress can be completed/);
  });
});