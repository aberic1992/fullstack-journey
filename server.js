const http = require("node:http");

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err); // the body wasn't valid JSON
      }
    });
    req.on("error", reject);
  });
}

let users = [
  { id: 1, name: "Aleksandar" },
  { id: 2, name: "Bojana" },
];

const server = http.createServer(async (req, res) => {
  const parts = req.url.split("/");
  if (req.method === "GET") {
    if (req.url === "/") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ message: "Home" }));
      return;
    }
    if (req.url === "/users") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          users: users,
        }),
      );
      return;
    }
    if (parts.length === 3 && parts[1] === "users" && parts[2]) {
      const id = Number(parts[2]);

      if (!(Number.isInteger(id) && id > 0)) {
        sendJson(res, 400, { error: "Invalid id" });
        return;
      }

      const user = users.find((user) => user.id === id);

      if (!user) {
        sendJson(res, 404, { error: "User not found" });
        return;
      }
      sendJson(res, 200, user);
      return;
    }
  }
  if (req.method === "POST") {
    if (req.url === "/users") {
      let data;
      try {
        data = await readBody(req);
      } catch {
        return sendJson(res, 400, { error: "Invalid JSON" });
      }

      if (!("name" in data) || !data.name) {
        sendJson(res, 400, { error: "inacurate body" });
        return;
      }
      // highest existing id + 1, so ids stay unique after a delete
      const newId = users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1;
      users.push({ id: newId, name: data.name });
      res.writeHead(201, { "content-type": "application/json" });
      res.end(JSON.stringify(users[users.length - 1]));
      console.log(users);
      return;
    }
  }

  if (req.method === "DELETE") {
    console.log(parts);
    if (parts.length === 3 && parts[1] === "users" && parts[2]) {
      let id = Number(parts[2]);
      if (!(Number.isInteger(id) && id > 0)) {
        sendJson(res, 400, { error: "invalid user id" });
        return;
      }

      let user = users.find((user) => user.id === id);

      if (!user) {
        sendJson(res, 404, { error: "User not found" });
        return;
      }

      users = users.filter((user) => user.id !== id);
      res.writeHead(204);
      res.end();
      return;
    }
  }

  // nothing above matched, so always respond instead of leaving the request hanging
  sendJson(res, 404, { error: "Not found" });
});

server.listen(3000, () => console.log("Running on http://localhost:3000"));
