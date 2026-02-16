import { jest } from '@jest/globals';

const mockCreateTask = jest.fn();

jest.unstable_mockModule('../../../infrastructure/repositories/task_repo', () => ({
  createTask: mockCreateTask,
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
  TaskInvalidIdStatusError: class TaskInvalidIdStatusError extends Error {
    constructor(...args) { super(args[0]); this.name = 'TaskInvalidIdStatusError'; }
  },
}));

const { createTask } = await import('../../../app/task_uc/create_task.uc');
const { TaskPriority } = await import('../../../domain/base/task_enums');

describe('createTask use case', () => {
  const userId = '507f1f77bcf86cd799439012';
  const validInput = {
    title: 'My Task',
    description: 'Do something',
    priority: 'HIGH',
    dueDate: '2025-06-01',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a task successfully', async () => {
    const mockTask = { id: '123', title: 'My Task', userId };
    mockCreateTask.mockResolvedValue(mockTask);

    const result = await createTask(userId, validInput);

    expect(mockCreateTask).toHaveBeenCalledWith({
      title: 'My Task',
      description: 'Do something',
      status: undefined,
      priority: TaskPriority.HIGH,
      dueDate: new Date('2025-06-01'),
      userId,
    });
    expect(result).toEqual(mockTask);
  });

  it('should create task with minimal fields', async () => {
    const input = { title: 'Minimal' };
    const mockTask = { id: '123', title: 'Minimal', userId };
    mockCreateTask.mockResolvedValue(mockTask);

    const result = await createTask(userId, input);

    expect(mockCreateTask).toHaveBeenCalledWith({
      title: 'Minimal',
      description: '',
      status: undefined,
      priority: undefined,
      dueDate: null,
      userId,
    });
    expect(result).toEqual(mockTask);
  });

  it('should throw if userId is missing', async () => {
    await expect(createTask(null, validInput)).rejects.toThrow(/userId is required/);
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it('should throw if title is too short', async () => {
    const input = { ...validInput, title: 'ab' };
    await expect(createTask(userId, input)).rejects.toThrow(/at least 3 characters/);
  });

  it('should throw if priority is invalid', async () => {
    const input = { ...validInput, priority: 'URGENT' };
    await expect(createTask(userId, input)).rejects.toThrow(/Invalid priority/);
  });

  it('should throw if dueDate is invalid', async () => {
    const input = { ...validInput, dueDate: 'not-a-date' };
    await expect(createTask(userId, input)).rejects.toThrow(/Invalid due date/);
  });

  it('should propagate repository errors', async () => {
    mockCreateTask.mockRejectedValue(new Error('Duplicate title'));
    await expect(createTask(userId, validInput)).rejects.toThrow('Duplicate title');
  });
});