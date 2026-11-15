# Notes

## Setup

- **Prettier**: formats code. `npm run format` / `npm run format:check`. Rules in `.prettierrc.json`.
- **Format on save**: `.vscode/settings.json` makes Prettier the VS Code formatter for this folder.
- **Auto-restart**: `npm run dev` runs `node --watch app.js`, which restarts on every save.
- **Notes rule**: `CLAUDE.md` tells Claude to log changes here.
- **Git**: repo on branch `main`. `.gitignore` skips `node_modules/`, `.env`, `*.log` (`npm install` restores node_modules).
- **GitHub**: public repo https://github.com/aberic1992/fullstack-journey (`origin`). Save work: `git add . && git commit -m "msg" && git push`.
- **Route tests**: `bash test-routes.sh` (or `bash test-routes.sh <port>`) runs curl against every route (incl. PUT, pagination, search, sort), each with its expected result in a comment. Server must be running; POST/PUT/DELETE change data, so restart for a clean run.

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

### Pagination, search & sorting (`GET /users`)

- Query params: `?page=2&limit=5&search=mi&sort=name` (defaults `page=1`, `limit=5`, no search, original order).
- `req.query` values are always strings; repeated params (`?a=1&a=2`) become an **array** → check `typeof x === "string"`.
- `400` if page/limit isn't a positive integer, search is blank/numeric/not a string, or sort isn't `name` / `-name`.
- Order: **filter → sort → slice**. `total` = number of matches (`processedUsers.length`), not all users.
- Search: `name.toLocaleLowerCase().startsWith(search.toLocaleLowerCase())` (lowercase **both** sides).
- Sort: `localeCompare` for strings (`a - b` only for numbers); `-name` = `b.name.localeCompare(a.name)`.
- `.sort()` mutates, so sort a copy (`[...users]`; `filter` already returns a new array).
- Page: `start = (page - 1) * limit` (parentheses!), then `slice(start, start + limit)`. Past the end → `[]`.
- "Neither A nor B" is `x !== A && x !== B`. With `||` it's always true.
- Missing `||` between `(...)` groups makes JS call the first one as a function → `... is not a function`.
- Only one `router.get("/")`: Express uses the first matching route, so a duplicate below it never runs.
- `Number(...)` always returns a number, so `typeof page === "string"` is never true (can be removed).
- Check if a string is text vs number: `Number(s)` is `NaN` for text, but `Number("")` / `Number(" ")` are `0`.
  - Strict positive int: `/^[1-9]\d*$/.test(s)`. Letters only (incl. š, č): `/^\p{L}+$/u.test(s)`.
- `node --watch` sometimes misses a save → restart `npm run dev` if responses look like old code.

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
- `users` array has 22 mock users (ids 1–22). New POST ids start at 23.
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
