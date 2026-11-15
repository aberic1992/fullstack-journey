const express = require("express");
const router = express.Router();

let users = [
  { id: 1, name: "Aleksandar" },
  { id: 2, name: "Bojana" },
  { id: 3, name: "Marko" },
  { id: 4, name: "Jelena" },
  { id: 5, name: "Nikola" },
  { id: 6, name: "Milica" },
  { id: 7, name: "Stefan" },
  { id: 8, name: "Ana" },
  { id: 9, name: "Luka" },
  { id: 10, name: "Teodora" },
  { id: 11, name: "Filip" },
  { id: 12, name: "Katarina" },
  { id: 13, name: "Nemanja" },
  { id: 14, name: "Ivana" },
  { id: 15, name: "Dušan" },
  { id: 16, name: "Sara" },
  { id: 17, name: "Vuk" },
  { id: 18, name: "Mina" },
  { id: 19, name: "Petar" },
  { id: 20, name: "Jovana" },
  { id: 21, name: "Miloš" },
  { id: 22, name: "Tamara" },
];

router.get("/", (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 5);

  if (
    typeof page === "string" ||
    typeof limit === "string" ||
    !Number.isInteger(page) ||
    !Number.isInteger(limit) ||
    page <= 0 ||
    limit <= 0
  ) {
    return res.status(400).json({ error: "Incorrect query value" });
  }
  const start = (page - 1) * limit;
  const sorted = [...users].sort((a, b) => a.name.localeCompare(b.name));
  const result = sorted.slice(start, start + limit);

  res.status(200).json({ page, limit, total: users.length, users: result });
});

function loadUser(req, res, next) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const user = users.find((user) => user.id === id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  req.targetUser = user;
  next();
}

router.get("/:id", loadUser, (req, res) => {
  res.status(200).json(req.targetUser);
});

router.post("/", (req, res) => {
  if (
    !req.body ||
    typeof req.body.name !== "string" ||
    req.body.name.trim() === ""
  ) {
    return res.status(400).json({ error: "Name is required" });
  }

  const newId = users.length
    ? Math.max(...users.map((user) => user.id)) + 1
    : 1;

  const newUser = { id: newId, name: req.body.name.trim() };
  users.push(newUser);

  res.status(201).json(newUser);
});

router.delete("/:id", loadUser, (req, res) => {
  users = users.filter((user) => user.id !== req.targetUser.id);
  res.status(204).end();
});

router.put("/:id", loadUser, (req, res) => {
  if (
    !req.body ||
    typeof req.body.name !== "string" ||
    req.body.name.trim() === ""
  ) {
    return res.status(400).json({ error: "Name is required" });
  }

  req.targetUser.name = req.body.name.trim();
  res.status(200).json(req.targetUser);
});

module.exports = router;
