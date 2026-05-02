import { ContentFlag, FlagSeverity, FlagStatus } from "../../domain/entities/content_flag_entity";

describe("ContentFlag Entity", () => {
  const validProps = {
    id: "flag-1",
    taskId: "task-123",
    taskTitle: "My Task",
    flaggedBy: "user-admin",
    reason: "Inappropriate content",
    severity: FlagSeverity.HIGH,
    status: FlagStatus.OPEN,
    createdAt: new Date("2025-02-01"),
    updatedAt: new Date("2025-02-01"),
  };

  test("should create a valid flag with all properties", () => {
    const flag = new ContentFlag(validProps);

    expect(flag.id).toBe("flag-1");
    expect(flag.taskId).toBe("task-123");
    expect(flag.taskTitle).toBe("My Task");
    expect(flag.flaggedBy).toBe("user-admin");
    expect(flag.reason).toBe("Inappropriate content");
    expect(flag.severity).toBe(FlagSeverity.HIGH);
    expect(flag.status).toBe(FlagStatus.OPEN);
    expect(flag.isResolved()).toBe(false);
  });

  test("should default severity to MEDIUM and status to OPEN", () => {
    const flag = new ContentFlag({
      taskId: "t1",
      flaggedBy: "u1",
      reason: "test",
    });

    expect(flag.severity).toBe(FlagSeverity.MEDIUM);
    expect(flag.status).toBe(FlagStatus.OPEN);
  });

  test("isResolved should return true only when status is RESOLVED", () => {
    const openFlag = new ContentFlag({ ...validProps, status: FlagStatus.OPEN });
    expect(openFlag.isResolved()).toBe(false);

    const resolvedFlag = new ContentFlag({ ...validProps, status: FlagStatus.RESOLVED });
    expect(resolvedFlag.isResolved()).toBe(true);
  });

  test("should store resolvedBy and resolvedAt when provided", () => {
    const resolvedAt = new Date("2025-02-10");
    const flag = new ContentFlag({
      ...validProps,
      status: FlagStatus.RESOLVED,
      resolvedBy: "admin-2",
      resolvedAt,
    });

    expect(flag.resolvedBy).toBe("admin-2");
    expect(flag.resolvedAt).toEqual(resolvedAt);
  });
});