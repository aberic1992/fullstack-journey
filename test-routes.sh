#!/usr/bin/env bash
# Manual route tests for app.js. Start the server first (npm run dev), then run:
#   bash test-routes.sh            # tests http://localhost:3000
#   bash test-routes.sh 3123       # tests another port
# Note: POST/PUT/DELETE change the in-memory users, so restart the server to reset data.
# Expected results below assume a fresh server (22 mock users).

B="localhost:${1:-3000}"
J="Content-Type: application/json"

# prints the request, then the response body and status code
t() { echo "### $*"; curl -s -w "  -> %{http_code}\n" "$@"; }

# Home
t "$B/"                                        # 200 Home

# GET /users: pagination (defaults page=1, limit=10, max limit 100)
t "$B/users"                                   # 200 first 10, total 22
t "$B/users?page=2&limit=3"                    # 200 users 4-6
t "$B/users?page=3"                            # 200 last 2 (Miloš, Tamara)
t "$B/users?page=4"                            # 200 users: [] (past the end)
t "$B/users?limit=1000"                         # 200 capped: limit 100, all 22
t "$B/users?page=0"                            # 400 Incorrect query value
t "$B/users?limit=0"                           # 400 Incorrect query value
t "$B/users?limit=-5"                          # 400 Incorrect query value
t "$B/users?page=abc"                          # 400 Incorrect query value
t "$B/users?page=1.5"                          # 400 Incorrect query value
t "$B/users?page=1&page=2"                     # 400 repeated param -> Number([...]) is NaN

# GET /users: sorting
t "$B/users?sort=name&limit=5"                 # 200 Aleksandar, Ana, Bojana, Dušan, Filip
t "$B/users?sort=-name&limit=5"                # 200 Vuk, Teodora, Tamara, Stefan, Sara
t "$B/users?sort=name&page=3"                  # 200 Teodora, Vuk
t "$B/users?sort=id"                           # 400 only name / -name allowed
t "$B/users?sort=name&sort=-name"              # 400 repeated param = array

# GET /users: search (contains, any letter case, trimmed)
t "$B/users?search=Mi"                         # 200 Milica, Mina, Miloš, total 3
t "$B/users?search=MI&sort=name"               # 200 Milica, Miloš, Mina
t "$B/users?search=mi&sort=-name"              # 200 Mina, Miloš, Milica
t "$B/users?search=mi&limit=2&page=2"          # 200 3rd match only, total 3
t "$B/users?search=ana"                        # 200 Ana, Bojana, Ivana, Jovana, total 4
t "$B/users?search=%20%20mi%20"                # 200 trimmed -> same as "mi", total 3
t "$B/users?search=zzz"                        # 200 users: [], total 0
t "$B/users?search="                           # 200 empty search = no filter, total 22
t "$B/users?search=123"                        # 200 users: [], total 0 (no match, not an error)
t "$B/users?search=%20"                        # 200 blank = no filter, total 22
t "$B/users?search=a&search=b"                 # 400 repeated param = array

# GET /users/:id
t "$B/users/1"                                 # 200 user
t "$B/users/99"                                # 404 User not found
t "$B/users/abc"                               # 400 Invalid id
t "$B/users/0"                                 # 400 Invalid id

# POST /users
t -X POST "$B/users" -H "$J" -d '{"name":"  Aca  "}'     # 201 id 23, name trimmed
t -X POST "$B/users" -H "$J" -d '{"name":""}'            # 400 Name is required
t -X POST "$B/users" -H "$J" -d '{}'                     # 400 Name is required
t -X POST "$B/users"                                     # 400 Name is required (no body)
t -X POST "$B/users" -H "$J" -d '{bad'                   # 400 Invalid JSON
t "$B/users?search=aca"                        # 200 Aca is there, total 1

# PUT /users/:id
t -X PUT "$B/users/2" -H "$J" -d '{"name":"  Bojana B  "}'   # 200 updated user, trimmed
t "$B/users/2"                                               # 200 name is "Bojana B"
t -X PUT "$B/users/2" -H "$J" -d '{"name":""}'               # 400 Name is required
t -X PUT "$B/users/2" -H "$J" -d '{}'                        # 400 Name is required
t -X PUT "$B/users/2"                                        # 400 Name is required (no body)
t -X PUT "$B/users/2" -H "$J" -d '{bad'                      # 400 Invalid JSON
t -X PUT "$B/users/99" -H "$J" -d '{"name":"X"}'             # 404 User not found
t -X PUT "$B/users/abc" -H "$J" -d '{"name":"X"}'            # 400 Invalid id

# DELETE /users/:id
t -X DELETE "$B/users/2"                       # 204 deleted
t -X DELETE "$B/users/2"                       # 404 already deleted
t -X DELETE "$B/users/abc"                     # 400 Invalid id

# New id after a delete must not repeat
t -X POST "$B/users" -H "$J" -d '{"name":"Ana"}'   # 201 id 24 (highest + 1)
t "$B/users?search=ana"                        # 200 Ana, Ivana, Jovana, Ana (id 24), total 4

# Unknown URLs
t "$B/xyz"                                     # 404 Not found
t "$B/users/1/extra"                           # 404 Not found
