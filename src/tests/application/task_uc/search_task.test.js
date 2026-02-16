import { jest } from '@jest/globals';

const mockFindTaskByID = jest.fn();
const mockEnsureTaskOwnership = jest.fn();

jest.unstable_mockModule('../../../infrastructure/repositories/task_repo', () => ({
  findTaskByID: mockFindTaskByID,
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

const { getTaskById } = await import('../../../app/task_uc/get_task.uc');
const { TaskOwnershipError } = await import('../../../core/errors/task.errors');
const { createFakeTask } = await import('../__mock__/task_helpers');

describe('getTaskById use case', () => {
  const taskId = '507f1f77bcf86cd799439011';
  const userId = '507f1f77bcf86cd799439012';
  const fakeTask = createFakeTask({ id: taskId, userId });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindTaskByID.mockResolvedValue(fakeTask);
  });

  it('should return task without ownership check if no userId provided', async () => {
    const result = await getTaskById(taskId);

    expect(mockFindTaskByID).toHaveBeenCalledWith(taskId);
    expect(result).toEqual(fakeTask);
  });

  it('should return task if ownership matches', async () => {
    const result = await getTaskById(taskId, userId);
    expect(result).toEqual(fakeTask);
  });

  it('should throw ownership error if userId does not match', async () => {
    const wrongUser = 'another-user';
    mockEnsureTaskOwnership.mockImplementation((task, uid) => {
      if (task.userId !== uid) throw new TaskOwnershipError('User does not own task');
    });

    await expect(getTaskById(taskId, wrongUser)).rejects.toThrow(TaskOwnershipError);
  });

  it('should propagate not found error from repo', async () => {
    mockFindTaskByID.mockRejectedValue(new Error('Task not found'));
    await expect(getTaskById(taskId, userId)).rejects.toThrow('Task not found');
  });
});