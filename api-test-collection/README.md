# WriteSystem API

REST API for the WriteSystem IELTS writing practice platform. Built with Node.js/Express/MongoDB, containerized via Docker.

**Base URL (local):** `http://localhost:3000`  
**Docker image:** `baw1463i/ielts-js:latest`

---

## Authentication

Most endpoints require a JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tokens are short-lived. Use `POST /api/auth/refresh` (with the `refresh_token` cookie) to obtain a new access token without re-logging in.

**Roles:** `user` (student) · `teacher` · `admin`

---

## Environment Variables (Postman)

| Variable | Description |
|---|---|
| `base_url` | API base URL (default: `http://localhost:3000`) |
| `access_token` | JWT access token (auto-set after login) |
| `refresh_token` | JWT refresh token (cookie-based) |
| `user_id` / `student_id` / `teacher_id` | User MongoDB ObjectIDs |
| `task_id` | Writing task ObjectID |
| `flag_id` | Content flag ObjectID |
| `noti_id` | Notification ObjectID |
| `reset_token` | Password reset token |
| `test_email` / `test_password` | Default student test credentials |
| `admin_email` / `admin_password` | Admin test credentials |
| `teacher_email` / `teacher_password` | Teacher test credentials |

---

## Endpoints

### System

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | None | Index / landing |
| `GET` | `/health` | None | Health check |

---

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | None | Register new account |
| `POST` | `/api/auth/login` | None | Login with email + password |
| `POST` | `/api/auth/logout` | None | Logout current session |
| `POST` | `/api/auth/refresh` | None (cookie) | Refresh access token via refresh token cookie |
| `GET` | `/api/auth/google` | None | Initiate Google OAuth flow |
| `GET` | `/api/auth/google/callback/` | None | Google OAuth callback |
| `GET` | `/api/auth/github` | None | Initiate GitHub OAuth flow |
| `GET` | `/api/auth/github/callback/` | None | GitHub OAuth callback |
| `GET` | `/api/auth/failure` | None | OAuth failure redirect |

**Register body:**
```json
{ "name": "John", "email": "john@example.com", "password": "SecurePassword123" }
```

**Login body:**
```json
{ "email": "john@example.com", "password": "SecurePassword123" }
```

---

### Users — `/api/users`

> General user lookups, primarily for admin use.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/list_users` | Admin | List all users |
| `POST` | `/api/users` | Admin | Create user manually |
| `GET` | `/api/users/:id` | Admin | Get user by MongoDB ID |
| `GET` | `/api/users/email/:email` | Admin | Get user by email |

---

### Admin — `/api/admin`

> All endpoints require `admin` role.

#### User Management

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/users` | List all users (paginated) |
| `GET` | `/api/admin/users/search` | Search users by query |
| `GET` | `/api/admin/users/email/:email` | Look up user by email |
| `GET` | `/api/admin/users/:id/activity` | Get user activity history |
| `DELETE` | `/api/admin/users/:id` | Delete a user |
| `PATCH` | `/api/admin/users/:id/suspend` | Suspend a user account |
| `PATCH` | `/api/admin/users/:id/reactivate` | Reactivate a suspended account |
| `PATCH` | `/api/admin/users/:id/demote` | Demote teacher to student role |
| `PATCH` | `/api/admin/users/:id/assign-teacher` | Assign a teacher to a student |
| `PATCH` | `/api/admin/users/:id/link-teacher` | Link student to a teacher by ID |
| `POST` | `/api/admin/users/:id/force-password-reset` | Force-reset a user's password |

**Link teacher body:**
```json
{ "teacherId": "<teacher_mongo_id>" }
```

**Force password reset body:**
```json
{ "password": "NewStrongPassword123" }
```

#### Bulk User Operations

| Method | Path | Description |
|---|---|---|
| `DELETE` | `/api/admin/users/bulk` | Bulk delete users |
| `PATCH` | `/api/admin/users/bulk/suspend` | Bulk suspend users |
| `PATCH` | `/api/admin/users/bulk/assign-teacher` | Bulk assign teacher to students |

**Bulk assign teacher body:**
```json
{ "teacherId": "<teacher_mongo_id>" }
```

#### Writing Task Management

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/writing-tasks` | List all writing tasks |
| `GET` | `/api/admin/writing-tasks/search` | Search writing tasks |
| `PATCH` | `/api/admin/writing-tasks/:id/review` | Mark task as reviewed |
| `PATCH` | `/api/admin/writing-tasks/:id/score` | Score a writing task |
| `POST` | `/api/admin/writing-tasks/transfer` | Transfer tasks between users |

**Transfer body:**
```json
{ "fromUserId": "<id>", "toUserId": "<id>" }
```

#### Content Moderation — Flags

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/flags` | List all content flags |
| `POST` | `/api/admin/flags` | Flag a writing task |
| `POST` | `/api/admin/flags/:id/resolve` | Resolve a flag |

**Flag task body:**
```json
{ "taskId": "<task_id>", "reason": "inappropriate word choices" }
```

#### Audit Logs

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/audit-logs/` | List all audit log entries |
| `GET` | `/api/admin/audit-logs/actions` | List available audit action types |

#### Admin Notifications

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/admin/notifications` | Send a system notification |

---

### Writing Tasks — `/api/writing-tasks`

> Core task workflow. Students progress through: `ASSIGNED → WRITING → SUBMITTED → REVIEWED → SCORED`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/writing-tasks/` | User | List own writing tasks |
| `POST` | `/api/writing-tasks/` | User | Create a new writing task |
| `GET` | `/api/writing-tasks/search` | User/Admin | Search tasks by title |
| `GET` | `/api/writing-tasks/:id` | User | Get task by ID |
| `PATCH` | `/api/writing-tasks/:id` | User | Update task content |
| `DELETE` | `/api/writing-tasks/:id` | User | Delete a task |
| `PATCH` | `/api/writing-tasks/:id/start` | User | Start writing (→ WRITING) |
| `PATCH` | `/api/writing-tasks/:id/submit` | User | Submit writing (→ SUBMITTED) |
| `PATCH` | `/api/writing-tasks/:id/review` | Teacher/Admin | Mark as reviewed (→ REVIEWED) |
| `PATCH` | `/api/writing-tasks/:id/score` | Teacher/Admin | Score task (→ SCORED) |
| `POST` | `/api/writing-tasks/:id/respond-assigment` | User | Accept or decline an assigned task |

**Create task body:**
```json
{ "title": "The Impact of Technology", "taskType": "TASK_2", "examType": "ACADEMIC" }
```

`taskType`: `TASK_1` or `TASK_2`  
`examType`: `ACADEMIC` or `GENERAL`

---

### Teacher — `/api/teacher`

> All endpoints require `teacher` role.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/teacher/profile` | Get own teacher profile |
| `PATCH` | `/api/teacher/profile` | Update teacher profile |
| `GET` | `/api/teacher/dashboard/stats` | Get dashboard statistics |
| `GET` | `/api/teacher/students` | List assigned students |
| `GET` | `/api/teacher/students/:id/tasks` | List a specific student's tasks |
| `GET` | `/api/teacher/assigned-tasks` | List all tasks assigned by this teacher |
| `POST` | `/api/teacher/assign` | Assign a writing task to a student |

---

### Notifications — `/api/notifications`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/notifications/` | User | Get all notifications for current user |
| `PATCH` | `/api/notifications/read` | User | Mark all notifications as read |
| `PATCH` | `/api/notifications/:id/read` | User | Mark a single notification as read |
| `DELETE` | `/api/notifications/:id/delete` | User | Delete a notification |

---

### Vocabulary — `/api/vocab`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/vocab/:word` | User | Look up a word (via dictionaryapi.dev) |

**Example:** `GET /api/vocab/eloquent`

---

### News — `/api/news`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/news/feed` | User | Get personalised news feed |
| `GET` | `/api/news/search/` | User | Search news articles |
| `GET` | `/api/news/categories/` | User | List all news categories |
| `GET` | `/api/news/category/:category` | User | Get articles by category |
| `PATCH` | `/api/news/interests` | User | Update user news interests |

**Example:** `GET /api/news/category/business`

---

## Error Responses

All error responses follow this shape:

```json
{ "message": "Descriptive error message", "code": "ERROR_CODE" }
```

Common HTTP status codes: `400` Bad Request · `401` Unauthorized · `403` Forbidden · `404` Not Found · `409` Conflict · `500` Internal Server Error

---

## Running Locally (Docker)

```bash
docker pull baw1463i/ielts-js:latest
docker run -p 3000:3000 \
  -e MONGO_URI=<your_mongo_uri> \
  -e JWT_SECRET=<secret> \
  -e REFRESH_SECRET=<secret> \
  baw1463i/ielts-js:latest
```

Health check: `GET http://localhost:3000/health`
