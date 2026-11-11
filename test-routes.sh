#!/usr/bin/env bash
# Manual route tests for app.js. Start the server first (npm run dev), then run:
#   bash test-routes.sh            # tests http://localhost:3000
#   bash test-routes.sh 3123       # tests another port
# Note: POST/DELETE change the in-memory users, so restart the server to reset data.

B="localhost:${1:-3000}"
J="Content-Type: application/json"

# prints the request, then the response body and status code
t() { echo "### $*"; curl -s -w "  -> %{http_code}\n" "$@"; }

# Home
t "$B/"                                        # 200 Home

# GET /users
t "$B/users"                                   # 200 list

# GET /users/:id
t "$B/users/1"                                 # 200 user
t "$B/users/99"                                # 404 User not found
t "$B/users/abc"                               # 400 Invalid id
t "$B/users/0"                                 # 400 Invalid id

# POST /users
t -X POST "$B/users" -H "$J" -d '{"name":"  Marko  "}'   # 201, name trimmed
t -X POST "$B/users" -H "$J" -d '{"name":""}'            # 400 name is required
t -X POST "$B/users" -H "$J" -d '{}'                     # 400 name is required
t -X POST "$B/users"                                     # 400 name is required (no body)
t -X POST "$B/users" -H "$J" -d '{bad'                   # 400 Invalid JSON
t "$B/users"                                   # 200 list now includes Marko

# DELETE /users/:id
t -X DELETE "$B/users/2"                       # 204 deleted
t -X DELETE "$B/users/2"                       # 404 already deleted
t -X DELETE "$B/users/abc"                     # 400 Invalid id

# New id after a delete must not repeat
t -X POST "$B/users" -H "$J" -d '{"name":"Ana"}'   # 201, id = highest + 1
t "$B/users"                                   # 200 list

# Unknown URLs
t "$B/xyz"                                     # 404 Not found
t "$B/users/1/extra"                           # 404 Not found
