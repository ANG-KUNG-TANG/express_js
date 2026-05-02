import { User } from "../../domain/entities/user_entity";
import { UserRole } from "../../domain/base/user_enums";

describe("User Entity", () => {

  const validProps = {
    name: "John Doe",
    email: "john@example.com",
    password: "strongPass123",
    role: UserRole.USER
  };

  test("should create a valid user", () => {
    const user = new User(validProps);

    expect(user.id).toBeDefined();
    expect(user.role).toBe(UserRole.USER);
  });

  test("should reject short name", () => {
    expect(() => {
      new User({ ...validProps, name: "Jo" });
    }).toThrow("Name must be at least 3 characters");
  });

  test("should reject invalid email", () => {
    expect(() => {
      new User({ ...validProps, email: "invalid-email" });
    }).toThrow("Invalid email format");
  });

  test("should reject weak password", () => {
    expect(() => {
      new User({ ...validProps, password: "123" });
    }).toThrow("Password must be at least 8 characters");
  });

  test("should reject invalid role", () => {
    expect(() => {
      new User({ ...validProps, role: "SUPERADMIN" });
    }).toThrow("Invalid user role");
  });

  test("should promote user to admin", () => {
    const user = new User(validProps);

    user.promoteToAdmin();

    expect(user.role).toBe(UserRole.ADMIN);
  });

  test("should not promote admin twice", () => {
    const user = new User({
      ...validProps,
      role: UserRole.ADMIN
    });

    expect(() => {
      user.promoteToAdmin();
    }).toThrow("User is already an admin");
  });

});
