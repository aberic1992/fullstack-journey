const express = require("express");
const usersRouter = require("./routers/users");

const { notFound, errorHandler } = require("./middleware/errorHandlers");

const app = express();

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`); // logs every request
  next(); // continue to the routes
});

app.use(express.json()); // parses JSON bodies into req.body

app.use("/users", usersRouter);

app.get("/", (req, res) => {
  res.status(200).json({ message: "Home" });
});

app.use(notFound);

app.use(errorHandler);

app.listen(3000, () => console.log("Running on http://localhost:3000"));
