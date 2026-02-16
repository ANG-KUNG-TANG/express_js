import { jest } from '@jest/globals';

const mockFindTaskByID = jest.fn();
const mockUpdateTask = jest.fn();
const mockEnsureTaskOwnership = jest.fn((task, userId) => {
  if (task.userId !== userId) throw new Error('User does not own task');
});

jest.unstable_mockModule('../../../infrastructure/repositories/task_repo', () => ({
  findTaskByID: mockFindTaskByID,
  updateTask: mockUpdateTask,
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

const { updateTask } = await import('../../../app/task_uc/update_task.uc');
const { TaskStatus, TaskPriority } = await import('../../../domain/base/task_enums');
const { createFakeTask } = await import('../__mock__/task_helpers');

describe('updateTask use case', () => {
  const taskId = '507f1f77bcf86cd799439011';
  const userId = '507f1f77bcf86cd799439012';
  const fakeTask = createFakeTask({ id: taskId, userId });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindTaskByID.mockResolvedValue(fakeTask);
    mockUpdateTask.mockImplementation(async (id, updates) => ({ ...fakeTask, ...updates }));
    mockEnsureTaskOwnership.mockImplementation((task, uid) => {
      if (task.userId !== uid) throw new Error('User does not own task');
    });
  });

  it('should update task successfully', async () => {
    const updates = { title: 'New Title', status: TaskStatus.IN_PROGRESS };

    const result = await updateTask(taskId, updates, userId);

    expect(mockFindTaskByID).toHaveBeenCalledWith(taskId);
    expect(mockUpdateTask).toHaveBeenCalledWith(taskId, {
      title: 'New Title',
      status: TaskStatus.IN_PROGRESS,
    });
    expect(result.title).toBe('New Title');
  });

  it('should update description only', async () => {
    const updates = { description: 'New description' };
    await updateTask(taskId, updates, userId);
    expect(mockUpdateTask).toHaveBeenCalledWith(taskId, { description: 'New description' });
  });

  it('should throw ownership error if user does not own task', async () => {
    const wrongUser = 'another-user';
    const otherTask = createFakeTask({ id: taskId, userId: wrongUser });
    mockFindTaskByID.mockResolvedValue(otherTask);

    await expect(updateTask(taskId, {}, wrongUser)).rejects.toThrow(/does not own task/);
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it('should throw validation error for invalid title length', async () => {
    const updates = { title: 'ab' };
    await expect(updateTask(taskId, updates, userId)).rejects.toThrow(/at least 3 characters/);
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it('should throw validation error for invalid status', async () => {
    const updates = { status: 'INVALID' };
    await expect(updateTask(taskId, updates, userId)).rejects.toThrow(/Invalid status/);
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it('should throw validation error for invalid priority', async () => {
    const updates = { priority: 'INVALID' };
    await expect(updateTask(taskId, updates, userId)).rejects.toThrow(/Invalid priority/);
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it('should throw validation error for invalid due date', async () => {
    const updates = { dueDate: 'bad-date' };
    await expect(updateTask(taskId, updates, userId)).rejects.toThrow(/Invalid due date/);
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it('should propagate repository error', async () => {
    mockUpdateTask.mockRejectedValue(new Error('Update failed'));
    const updates = { title: 'Valid Title' };
    await expect(updateTask(taskId, updates, userId)).rejects.toThrow('Update failed');
  });
});