import { jest } from '@jest/globals';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.unstable_mockModule('../../../infrastructure/repositories/task_repo.js', () => ({
    createTask: jest.fn(),
}));

// Source uses task_validator — must mock it
jest.unstable_mockModule('../../../app/validators/task_validator.js', () => ({
    validateRequired:    jest.fn((val, name) => {
        if (!val) throw new Error(`${name} is required`);
    }),
    validateStringLength: jest.fn((val, name, min, max) => {
        if (!val || val.length < min) throw new Error(`${name} must be at least ${min} characters`);
        if (val.length > max)         throw new Error(`${name} must be at most ${max} characters`);
        return val;
    }),
    validateEnum:        jest.fn((val, enumObj, name) => {
        if (val !== undefined && !Object.values(enumObj).includes(val))
            throw new Error(`Invalid ${name}: ${val}`);
        return val;
    }),
}));

jest.unstable_mockModule('../../../domain/base/task_enums.js', () => ({
    TaskType: { TASK1: 'TASK1', TASK2: 'TASK2' },
    ExamType: { ACADEMIC: 'ACADEMIC', GENERAL: 'GENERAL' },
}));

// ── Import SUT after mocks ────────────────────────────────────────────────────

// Source exports createWritingTask, not createTask
const { createWritingTask } = await import('../../../app/task_uc/create_task.uc.js');
const taskRepo              = await import('../../../infrastructure/repositories/task_repo.js');

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createWritingTask use case', () => {
    const userId    = '507f1f77bcf86cd799439012';
    const validInput = {
        title:         'My Essay',
        description:   'Write something',
        taskType:      'TASK1',
        examType:      'ACADEMIC',
        questionPrompt: 'Discuss the topic.',
    };

    beforeEach(() => jest.clearAllMocks());

    it('creates a task with all valid fields and returns it', async () => {
        const mockTask = { id: 'new-1', ...validInput, userId };
        taskRepo.createTask.mockResolvedValue(mockTask);

        const result = await createWritingTask(userId, validInput);

        expect(taskRepo.createTask).toHaveBeenCalledWith({
            title:         'My Essay',
            description:   'Write something',
            taskType:      'TASK1',
            examType:      'ACADEMIC',
            questionPrompt: 'Discuss the topic.',
            userId,
        });
        expect(result).toEqual(mockTask);
    });

    it('uses empty string for description and questionPrompt when omitted', async () => {
        taskRepo.createTask.mockResolvedValue({ id: 'new-2' });
        const input = { title: 'Minimal', taskType: 'TASK1', examType: 'ACADEMIC' };

        await createWritingTask(userId, input);

        expect(taskRepo.createTask).toHaveBeenCalledWith(
            expect.objectContaining({ description: '', questionPrompt: '' })
        );
    });

    it('throws when userId is missing', async () => {
        await expect(createWritingTask(null, validInput)).rejects.toThrow(/userId is required/);
        expect(taskRepo.createTask).not.toHaveBeenCalled();
    });

    it('throws when title is too short', async () => {
        const input = { ...validInput, title: 'ab' };
        await expect(createWritingTask(userId, input)).rejects.toThrow(/at least 3 characters/);
        expect(taskRepo.createTask).not.toHaveBeenCalled();
    });

    it('throws when taskType is invalid', async () => {
        const input = { ...validInput, taskType: 'INVALID' };
        await expect(createWritingTask(userId, input)).rejects.toThrow(/Invalid taskType/);
        expect(taskRepo.createTask).not.toHaveBeenCalled();
    });

    it('throws when examType is invalid', async () => {
        const input = { ...validInput, examType: 'INVALID' };
        await expect(createWritingTask(userId, input)).rejects.toThrow(/Invalid examType/);
        expect(taskRepo.createTask).not.toHaveBeenCalled();
    });

    it('propagates repository errors', async () => {
        taskRepo.createTask.mockRejectedValue(new Error('DB write failed'));
        await expect(createWritingTask(userId, validInput)).rejects.toThrow('DB write failed');
    });
});