const express = require("express");
const router = express.Router();

let users = [
  { id: 1, name: "Aleksandar" },
  { id: 2, name: "Bojana" },
];

router.get("/", (req, res) => {
  res.status(200).json({ users });
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
    return res.status(400).json({ error: "name is required" });
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

  const indexOfUser = users.indexOf((user) => user.id === body.targetUser.id);

  req.targetUser.name = req.body.name.trim();
  res.status(200).end();
});

module.exports = router;
