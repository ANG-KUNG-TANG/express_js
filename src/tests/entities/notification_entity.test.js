// src/tests/entities/notification_entity.test.js
import { Notification, NotificationType } from "../../domain/entities/notificaiton_entity";
import {
  NotificationInvalidTypeError,
  NotificationMissingFieldError,
} from "../../core/errors/notification.errors";

describe("Notification Entity", () => {
  // 🔧 Use a real type from your noti_enums.js
  const validType = NotificationType.TASK_ASSIGNED;   // any valid enum value

  const validProps = {
    userId: "user-1",
    type: validType,
    title: "Welcome",
    message: "Welcome to the platform",
  };

  test("should create a valid notification", () => {
    const noti = new Notification(validProps);
    expect(noti.id).toBeDefined();
    expect(noti.userId).toBe("user-1");
    expect(noti.type).toBe(validType);
    expect(noti.title).toBe("Welcome");
    expect(noti.message).toBe("Welcome to the platform");
    expect(noti.isRead).toBe(false);
  });

  test("should generate an id when not provided", () => {
    const noti = new Notification(validProps);
    expect(noti.id).toBeTruthy();
  });

  test("should reject invalid notification type", () => {
    expect(() => new Notification({ ...validProps, type: "INVALID_TYPE" }))
      .toThrow(NotificationInvalidTypeError);
  });

  test("should reject missing userId", () => {
    expect(() => new Notification({ ...validProps, userId: null }))
      .toThrow(NotificationMissingFieldError);
  });

  test("should reject missing title", () => {
    expect(() => new Notification({ ...validProps, title: "" }))
      .toThrow(NotificationMissingFieldError);
  });

  test("should reject missing message", () => {
    expect(() => new Notification({ ...validProps, message: undefined }))
      .toThrow(NotificationMissingFieldError);
  });

  test("markRead should set isRead to true and update updatedAt", () => {
    const noti = new Notification(validProps);
    const before = noti.updatedAt;
    noti.markRead();
    expect(noti.isRead).toBe(true);
    expect(noti.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  test("should allow optional metadata and createdAt", () => {
    const metadata = { key: "value" };
    const createdAt = new Date("2025-03-01");
    const noti = new Notification({ ...validProps, metadata, createdAt });
    expect(noti.metadata).toEqual(metadata);
    expect(noti.createdAt).toEqual(createdAt);
  });

  test("toJSON should return expected fields", () => {
    const noti = new Notification(validProps);
    const json = noti.toJSON();
    expect(json.userId).toBe("user-1");
    expect(json.title).toBe("Welcome");
    expect(json.isRead).toBe(false);
    expect(json._id).toBeDefined();   // note: toJSON currently serialises as "_id"
  });
});