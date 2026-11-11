# Notes

## Setup

- **Prettier**: formats code. `npm run format` / `npm run format:check`. Rules in `.prettierrc.json`.
- **Format on save**: `.vscode/settings.json` makes Prettier the VS Code formatter for this folder.
- **Auto-restart**: `npm run dev` runs `node --watch app.js`, which restarts on every save.
- **Notes rule**: `CLAUDE.md` tells Claude to log changes here.
- **Git**: repo on branch `main`. `.gitignore` skips `node_modules/`, `.env`, `*.log` (`npm install` restores node_modules).
- **GitHub**: public repo https://github.com/aberic1992/fullstack-journey (`origin`). Save work: `git add . && git commit -m "msg" && git push`.
- **Route tests**: `bash test-routes.sh` (or `bash test-routes.sh <port>`) runs curl against every route. Server must be running; POST/DELETE change data.

## server.js (plain Node `http`)

Runs on `http://localhost:3000`. No framework, so routing is done by hand with `req.method` + `req.url`.

### Endpoints

- **`GET /`**: returns `{ message: "Home" }`. Simple check that the server is running.
- **`GET /users`**: returns `{ users: [...] }`, the whole in-memory list.
- **`GET /users/:id`**: returns one user.
  - id comes from the URL: `req.url.split("/")` → `["", "users", "2"]` → `parts[2]`.
  - `400` if the id isn't a positive integer, `404` if no user has it, else `200` + user.
- **`POST /users`**: creates a user from a JSON body like `{ "name": "Marko" }`.
  - `400` if the body isn't valid JSON or `name` is missing or empty.
  - New id = highest existing id + 1 (not `users.length + 1`, which repeats ids after a delete). Returns `201`.
- **`DELETE /users/:id`**: removes a user.
  - Same id checks as GET (`400` / `404`).
  - Removes it with `users.filter(...)` and returns `204` (success, no body).
- **Anything else** → `404 { error: "Not found" }`. Every request must get a response, or it hangs.
- `/users/:id` routes check `parts.length === 3`, so `/users/2/anything` doesn't match.

### Helpers & concepts

- `sendJson(res, status, data)`: sets the JSON header, status and body in one call.
- `readBody(req)`: the body arrives in chunks, so it's collected in a Promise and `await`ed.
- `users` is a plain array in memory, so changes are lost when the server restarts.
- Check keys with `Object.hasOwn(obj, "key")`. Use `in` only if inherited keys should count.

## app.js (Express)

- Installed `express`. `app.use(express.json())` parses JSON bodies into `req.body`.
- Routes: `GET /`, `GET /users`, `GET /users/:id`, `POST /users`, `PUT /users/:id`, `DELETE /users/:id`.
- `/users/:id`: convert with `Number(req.params.id)` → `400` if invalid, `404` if not found.
- `POST /users`: `400` if `req.body.name` isn't a non-empty string; name is trimmed; returns `201`.
- `DELETE /users/:id`: `users` is `let` so it can be reassigned by `filter`; returns `204` via `res.status(204).end()`.
- `PUT /users/:id`: same name check as POST (`400`), sets `req.targetUser.name` (trimmed), returns `200` + updated user.
- Error message is `"Name is required"` in both POST and PUT.
- Status codes: `200` OK, `201` created, `204` no content, `400` bad input, `404` not found, `500` server error.

### Middleware & errors

- Order matters: middleware/routes run top to bottom; `next()` passes to the next one.
- Logger middleware `(req, res, next)` logs `METHOD url` then calls `next()`.
- 404 catch-all `app.use((req, res) => ...)` goes after all routes.
- Error handler has **4 args** `(err, req, res, next)` and goes last. Express detects it by the arg count.
- Bad JSON body → `err.type === "entity.parse.failed"` → `400 Invalid JSON`; anything else → log + `500`.
- Errors reach the handler via `throw` (sync), `next(err)`, or a rejected `async` route (Express 5 only).
- Test routes `/a`, `/b`, `/c`, `/crash` removed.

### Refactor (split into files)

- `routers/users.js`: `express.Router()` with all `/users` routes + the `users` array; `module.exports = router`.
- Mounted with `app.use("/users", usersRouter)`, so paths inside are relative (`/`, `/:id`).
- `middleware/errorHandlers.js`: exports plain functions `{ notFound, errorHandler }` (no Router needed).
- In `app.js`: `app.use(notFound); app.use(errorHandler);` last, after all routes. No path, so they catch everything.
- `require` paths must match folder names exactly, or the app crashes with `Cannot find module`.
- `app.js` now only has: logger, `express.json()`, routers, `GET /`, error handlers, `listen`.

### Route middleware (`loadUser` in routers/users.js)

- `loadUser(req, res, next)`: checks id (`400`), finds user (`404`), sets `req.targetUser`, calls `next()`.
- Used per route: `router.get("/:id", loadUser, handler)`, same for `PUT` and `DELETE`. Removes duplicated checks.
- Always `return res...` after sending a response, or code keeps running → `ERR_HTTP_HEADERS_SENT` (one response per request).
- `find` returns a **reference**, so `req.targetUser` is the same object as in `users`; changing its props updates the array (a copy `{ ...user }` would not).
- `indexOf(fn)` doesn't take a function (returns `-1` → `users[-1]` is `undefined`). Use `findIndex(fn)`.
- `res.status(200)` alone sends nothing; always finish with `.json(...)` or `.end()`, or the request hangs.
