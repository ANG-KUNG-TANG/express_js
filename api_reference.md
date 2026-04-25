diff --git a/docs/API_REFERENCE.md b/docs/API_REFERENCE.md
new file mode 100644
index 0000000000000000000000000000000000000000..6227512a76d415763e1736707af0639433391317
--- /dev/null
+++ b/docs/API_REFERENCE.md
@@ -0,0 +1,113 @@
+# API Reference
+
+Base path for API routes: `/api`
+
+## Authentication (`/api/auth`)
+- `GET /google`
+- `GET /github`
+- `GET /google/callback`
+- `GET /github/callback`
+- `POST /refresh`
+- `POST /register`
+- `POST /login`
+- `POST /logout`
+- `GET /failure`
+
+Password reset (mounted under same base):
+- `POST /forgot-password`
+- `GET /reset-password/validate`
+- `POST /reset-password`
+
+## Users & Profile
+### User routes (`/api`)
+- `POST /users`
+- `GET /list_users`
+- `GET /users/email/:email`
+- `GET /users/:id`
+- `PATCH /users/:id/promote`
+- `PUT /users/:id`
+- `PATCH /users/:id`
+- `DELETE /users/:id`
+
+### Profile routes (`/api`) (auth required)
+- `GET /users/me`
+- `PATCH /users/me`
+- `POST /users/me/avatar`
+- `POST /users/me/cover`
+- `GET /users/me/files`
+- `POST /users/me/files`
+- `DELETE /users/me/files/:fileId`
+
+## Writing Tasks (`/api/writing-tasks`) (auth required)
+- `POST /transfer` (admin)
+- `GET /search`
+- `GET /vocab/:word`
+- `POST /`
+- `GET /`
+- `GET /:id`
+- `PATCH /:id/start`
+- `PATCH /:id/submit`
+- `PATCH /:id/review` (admin)
+- `PATCH /:id/score` (admin)
+- `PATCH /:id`
+- `DELETE /:id`
+- `POST /:taskId/respond-assignment` (student/user)
+
+## Teacher (`/api/teacher`) (teacher/admin)
+- `GET /writing-tasks`
+- `GET /writing-tasks/search`
+- `GET /writing-tasks/:id`
+- `PATCH /writing-tasks/:id/review`
+- `POST /assign`
+- `GET /students`
+- `GET /students/:studentId/tasks`
+- `GET /assigned-tasks`
+
+## Admin (`/api/admin`) (admin)
+- `GET /stats`
+- `GET /users`
+- `GET /users/email/:email`
+- `PATCH /users/:id/promote`
+- `PATCH /users/:id/assign-teacher`
+- `PATCH /users/:id/link-teacher`
+- `PATCH /users/:id/unlink-teacher`
+- `DELETE /users/:id`
+- `GET /writing-tasks`
+- `GET /writing-tasks/search`
+- `PATCH /writing-tasks/:id/review`
+- `PATCH /writing-tasks/:id/score`
+- `POST /writing-tasks/transfer`
+- `GET /flags`
+- `POST /flags`
+- `POST /flags/:flagId/resolve`
+- `DELETE /content/:taskId`
+- `GET /audit-logs`
+- `POST /notifications`
+
+Additional admin audit-log router (`/api/admin/audit-logs`):
+- `GET /actions`
+- `GET /`
+
+## Notifications (`/api/notifications`) (auth required)
+- `GET /`
+- `PATCH /read`
+- `PATCH /:id/read`
+- `DELETE /:id`
+
+## News (`/api/news`) (auth required)
+- `GET /feed`
+- `GET /search`
+- `GET /categories`
+- `PATCH /interests`
+- `GET /category/:category`
+
+## Vocabulary (`/api/vocab`)
+- `POST /`
+- `GET /topic/:topic`
+- `POST /fetch/:topic`
+- `GET /:word`
+
+---
+
+## Response conventions
+Most endpoints return a standardized JSON payload using shared formatter helpers, with explicit HTTP status codes and error codes/messages for failure paths.
