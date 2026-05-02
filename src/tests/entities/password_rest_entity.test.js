import { PasswordResetToken } from "../../domain/entities/password_reset_token_entity";
import {
  PasswordResetTokenExpiredError,
  PasswordResetTokenAlreadyUsedError,
} from "../../core/errors/password_reset.errors";

describe("PasswordResetToken Entity", () => {
  const futureDate = new Date(Date.now() + 3600 * 1000); // 1 hour from now
  const pastDate = new Date(Date.now() - 1000);

  const validProps = {
    userId: "user-1",
    tokenHash: "hashedToken123",
    expiresAt: futureDate,
  };

  test("should create a valid token", () => {
    const token = new PasswordResetToken(validProps);

    expect(token.id).toBeDefined();
    expect(token.userId).toBe("user-1");
    expect(token.tokenHash).toBe("hashedToken123");
    expect(token.expiresAt).toEqual(futureDate);
    expect(token.used).toBe(false);
  });

  test("should generate an id when not provided", () => {
    const token = new PasswordResetToken(validProps);
    expect(token.id).toBeTruthy();
  });

  test("should accept string date for expiresAt and convert to Date", () => {
    const token = new PasswordResetToken({ ...validProps, expiresAt: futureDate.toISOString() });
    expect(token.expiresAt instanceof Date).toBe(true);
    expect(token.expiresAt.getTime()).toBe(futureDate.getTime());
  });

  test("should reject missing userId", () => {
    expect(() => new PasswordResetToken({ ...validProps, userId: null }))
      .toThrow("PasswordResetToken: userId is required");
  });

  test("should reject missing tokenHash", () => {
    expect(() => new PasswordResetToken({ ...validProps, tokenHash: "" }))
      .toThrow("PasswordResetToken: tokenHash is required");
  });

  test("should reject missing expiresAt", () => {
    expect(() => new PasswordResetToken({ ...validProps, expiresAt: undefined }))
      .toThrow("PasswordResetToken: expiresAt is required");
  });

  test("assertValid should not throw for valid unused, non-expired token", () => {
    const token = new PasswordResetToken(validProps);
    expect(() => token.assertValid()).not.toThrow();
  });

  test("assertValid should throw AlreadyUsedError if token is used", () => {
    const token = new PasswordResetToken(validProps);
    token.markUsed();
    expect(() => token.assertValid()).toThrow(PasswordResetTokenAlreadyUsedError);
  });

  test("assertValid should throw ExpiredError if token has expired", () => {
    const token = new PasswordResetToken({ ...validProps, expiresAt: pastDate });
    expect(() => token.assertValid()).toThrow(PasswordResetTokenExpiredError);
  });

  test("markUsed should set used to true", () => {
    const token = new PasswordResetToken(validProps);
    expect(token.used).toBe(false);
    token.markUsed();
    expect(token.used).toBe(true);
  });
});