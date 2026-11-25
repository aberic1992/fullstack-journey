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

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

router.get("/", (req, res) => {
  const page = Number(req.query.page ?? 1);
  const requestedLimit = Number(req.query.limit ?? DEFAULT_LIMIT);
  const sort = req.query.sort;
  const search = req.query.search ?? "";

  if (
    !Number.isInteger(page) ||
    !Number.isInteger(requestedLimit) ||
    page <= 0 ||
    requestedLimit <= 0
  ) {
    return res.status(400).json({ error: "Incorrect query value" });
  }

  // repeated ?search=a&search=b becomes an array
  if (typeof search !== "string") {
    return res.status(400).json({ error: "Incorrect search value" });
  }

  if (sort !== undefined && sort !== "name" && sort !== "-name") {
    return res
      .status(400)
      .json({ error: "Accepted sort values are 'name' or '-name'" });
  }

  const limit = Math.min(requestedLimit, MAX_LIMIT);
  const term = search.trim().toLocaleLowerCase();

  // empty search = no filter
  const processedUsers = term
    ? users.filter((user) => user.name.toLocaleLowerCase().includes(term))
    : [...users];

  if (sort === "name") {
    processedUsers.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === "-name") {
    processedUsers.sort((a, b) => b.name.localeCompare(a.name));
  }

  const start = (page - 1) * limit;
  const result = processedUsers.slice(start, start + limit);

  res
    .status(200)
    .json({ page, limit, total: processedUsers.length, users: result });
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
