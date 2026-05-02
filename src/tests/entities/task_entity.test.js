import { WritingTask } from "../../domain/entities/task_entity";
import {
  WritingStatus,
  TaskType,
  ExamType,
  TaskSource,
  AssignmentStatus
} from "../../domain/base/task_enums";

describe("WritingTask Entity", () => {
  const validProps = {
    title: "Essay about environment",
    description: "Write 250 words",
    taskType: TaskType.TASK_2,
    examType: ExamType.ACADEMIC,
    questionPrompt: "Discuss the impact of climate change.",
    userId: "user-123",
  };

  // helper: string with exactly N space-separated words
  const words = (n) => Array(n).fill("word").join(" ");

  // ── construction & validation ─────────────────────────────────────────────
  test("should create a valid task with default status ASSIGNED", () => {
    const task = new WritingTask(validProps);
    expect(task.id).toBeDefined();
    expect(task.status).toBe(WritingStatus.ASSIGNED);
  });

  test("should reject short title", () => {
    expect(() => new WritingTask({ ...validProps, title: "Hi" }))
      .toThrow("Title must be at least 3 characters long");
  });

  test("should reject missing userId", () => {
    expect(() => new WritingTask({ ...validProps, userId: null }))
      .toThrow("WritingTask must belong to a user");
  });

  test("should reject invalid status", () => {
    expect(() => new WritingTask({ ...validProps, status: "DONE" }))
      .toThrow("Invalid writing task status");
  });

  test("should reject invalid taskType", () => {
    expect(() => new WritingTask({ ...validProps, taskType: "TASK_3" }))
      .toThrow("Invalid task type");
  });

  test("should reject invalid examType", () => {
    expect(() => new WritingTask({ ...validProps, examType: "IELTS" }))
      .toThrow("Invalid exam type");
  });

  test("should reject invalid bandScore if provided", () => {
    expect(() => new WritingTask({ ...validProps, bandScore: 10 }))
      .toThrow("Band score must be between 0 and 9");
  });

  // ── state transitions (writing lifecycle) ────────────────────────────────
  test("should start writing when ASSIGNED", () => {
    const task = new WritingTask(validProps);
    task.startWriting();
    expect(task.status).toBe(WritingStatus.WRITING);
  });

  test("should not start if not ASSIGNED", () => {
    const task = new WritingTask({ ...validProps, status: WritingStatus.WRITING });
    expect(() => task.startWriting()).toThrow("Only assigned tasks can be started");
  });

  test("should submit and transition to SUBMITTED", () => {
    const task = new WritingTask(validProps);
    task.startWriting();
    task.submit(words(250));
    expect(task.status).toBe(WritingStatus.SUBMITTED);
    expect(task.submissionText).toBe(words(250));
  });

  test("should reject short submission", () => {
    const task = new WritingTask(validProps);
    task.startWriting();
    expect(() => task.submit(words(1))).toThrow(/Submission too short/);
  });

  test("should review submitted task", () => {
    const task = new WritingTask(validProps);
    task.startWriting();
    task.submit(words(250));
    task.review("Good job!");
    expect(task.status).toBe(WritingStatus.REVIEWED);
    expect(task.feedback).toBe("Good job!");
  });

  test("should score reviewed task", () => {
    const task = new WritingTask(validProps);
    task.startWriting();
    task.submit(words(250));
    task.review("Good");
    task.score(7.5);
    expect(task.status).toBe(WritingStatus.SCORED);
    expect(task.bandScore).toBe(7.5);
  });

  test("should not score if not reviewed", () => {
    const task = new WritingTask(validProps);
    expect(() => task.score(6)).toThrow("Only reviewed tasks can be scored");
  });

  // ── assignment handling ───────────────────────────────────────────────────
  test("should accept assignment when pending", () => {
    const task = new WritingTask({
      ...validProps,
      source: TaskSource.TEACHER_NEW,
      assignedBy: "teacher-1",
      assignedTo: validProps.userId,
      assignmentStatus: AssignmentStatus.PENDING_ACCEPTANCE,
    });
    task.acceptAssignment();
    expect(task.assignmentStatus).toBe(AssignmentStatus.ACCEPTED);
  });

  test("should decline assignment with reason", () => {
    const task = new WritingTask({
      ...validProps,
      source: TaskSource.TEACHER_NEW,
      assignedBy: "teacher-1",
      assignedTo: validProps.userId,
      assignmentStatus: AssignmentStatus.PENDING_ACCEPTANCE,
    });
    task.declineAssignment("Not ready");
    expect(task.assignmentStatus).toBe(AssignmentStatus.DECLINED);
    expect(task.declineReason).toBe("Not ready");
  });

  test("should not accept already accepted assignment", () => {
    const task = new WritingTask({
      ...validProps,
      source: TaskSource.TEACHER_NEW,
      assignedBy: "teacher-1",
      assignedTo: validProps.userId,
      assignmentStatus: AssignmentStatus.ACCEPTED,
    });
    expect(() => task.acceptAssignment()).toThrow(`Assignment is already "accepted"`);
  });

  test("should not start writing unless assignment is accepted", () => {
    const task = new WritingTask({
      ...validProps,
      source: TaskSource.TEACHER_NEW,
      assignedBy: "teacher-1",
      assignedTo: validProps.userId,
      assignmentStatus: AssignmentStatus.PENDING_ACCEPTANCE,
    });
    expect(() => task.startWriting()).toThrow("You must accept this task before you can start writing");
  });

  test("should be able to start writing after assignment accepted", () => {
    const task = new WritingTask({
      ...validProps,
      source: TaskSource.TEACHER_NEW,
      assignedBy: "teacher-1",
      assignedTo: validProps.userId,
      assignmentStatus: AssignmentStatus.PENDING_ACCEPTANCE,
    });
    task.acceptAssignment();
    task.startWriting();
    expect(task.status).toBe(WritingStatus.WRITING);
  });
});