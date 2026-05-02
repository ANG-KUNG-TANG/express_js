import { AuditLog } from "../../domain/entities/audit_log_entity";

describe("AuditLog Entity", () => {
  const validProps = {
    id: "log-1",
    action: "USER_LOGIN",
    outcome: "success",
    requesterId: "user-123",
    actorLabel: "john@example.com",
    details: { ip: "192.168.0.1" },
    request: { method: "POST", path: "/auth/login", ip: "::1" },
    createdAt: new Date("2025-01-01"),
  };

  test("should create a valid audit log", () => {
    const log = new AuditLog(validProps);

    expect(log.id).toBe("log-1");
    expect(log.action).toBe("USER_LOGIN");
    expect(log.outcome).toBe("success");
    expect(log.requesterId).toBe("user-123");
    expect(log.actorLabel).toBe("john@example.com");
    expect(log.details).toEqual({ ip: "192.168.0.1" });
    expect(log.request).toEqual(validProps.request);
    expect(log.createdAt).toEqual(validProps.createdAt);
  });

  test("should default outcome to 'success'", () => {
    const log = new AuditLog({ action: "SIGNUP" });
    expect(log.outcome).toBe("success");
  });

  test("should default actorLabel to requesterId when not provided", () => {
    const log = new AuditLog({ action: "SIGNUP", requesterId: "user-99" });
    expect(log.actorLabel).toBe("user-99");
  });

  test("should default createdAt to current date", () => {
    const before = new Date();
    const log = new AuditLog({ action: "TEST" });
    const after = new Date();
    expect(log.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(log.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  test("toJSON should return a plain object with all public fields", () => {
    const log = new AuditLog(validProps);
    const json = log.toJSON();
    expect(json).toEqual({
      id: "log-1",
      action: "USER_LOGIN",
      outcome: "success",
      requesterId: "user-123",
      actorLabel: "john@example.com",
      details: { ip: "192.168.0.1" },
      request: { method: "POST", path: "/auth/login", ip: "::1" },
      createdAt: validProps.createdAt,
    });
  });
});