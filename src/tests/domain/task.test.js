import { Task } from "../../domain/entities/task";
import { TaskStatus, TaskPriority } from "../../domain/base/task_enums";

describe("Task Entity", () => {

  const validProps = {
    title: "Study Clean Architecture",
    description: "Read chapters 1-3",
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    userId: "user-123"
  };

  test("should create a valid task", () => {
    const task = new Task(validProps);

    expect(task.id).toBeDefined();
    expect(task.status).toBe(TaskStatus.PENDING);
  });

  test("should reject short title", () => {
    expect(() => {
      new Task({ ...validProps, title: "Hi" });
    }).toThrow("Title must be at least 3 characters long");
  });

  test("should reject missing userId", () => {
    expect(() => {
      new Task({ ...validProps, userId: null });
    }).toThrow("Task must belong to a user");
  });

  test("should reject invalid status", () => {
    expect(() => {
      new Task({ ...validProps, status: "DONE" });
    }).toThrow("Invalid task status");
  });

  test("should reject invalid priority", () => {
    expect(() => {
      new Task({ ...validProps, priority: "URGENT_MAX" });
    }).toThrow("Invalid task priority");
  });

  test("should start task when pending", () => {
    const task = new Task(validProps);

    task.start();

    expect(task.status).toBe(TaskStatus.IN_PROGRESS);
  });

  test("should not start task if not pending", () => {
    const task = new Task({
      ...validProps,
      status: TaskStatus.IN_PROGRESS
    });

    expect(() => {
      task.start();
    }).toThrow("Only pending tasks can start");
  });

  test("should complete task when in progress", () => {
    const task = new Task(validProps);

    task.start();
    task.complete();

    expect(task.status).toBe(TaskStatus.COMPLETED);
  });

  test("should not complete task if not in progress", () => {
    const task = new Task(validProps);

    expect(() => {
      task.complete();
    }).toThrow("Only in-progress tasks can be completed");
  });

});
