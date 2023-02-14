/**
 * The heart of the server built on an Express App. This app utilizes a router to
 * integrate with the api stored in app/api.js. Localhost is the current target.
 *
 * app.js
 * Version 1.0.0
 * 17-8-2022
 *
 * @author Mason R. Ware
 */

const express = require("express");
const morgan = require("morgan");
const path = require("path");
const winston = require("winston");

const app = express();
const router = express.Router();

const { combine, timestamp, printf, align, colorize } = winston.format;

// set up logger and middleware
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    colorize({ all: true }),
    timestamp({
      format: "YYYY-MM-DD hh:mm:ss.SSS A",
    }),
    align(),
    printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
  ),
  transports: [new winston.transports.Console()],
});

const morganMiddleware = morgan(
  ":method :url :status :res[content-length] - :response-time ms",
  {
    stream: {
      // Configure Morgan to use our custom logger with the http severity
      write: (message) => logger.http(message.trim()),
    },
  }
);

// configure server
app.use(morganMiddleware);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.set("json spaces", 2);
app.use(express.static(path.join(__dirname, "public")));

// routes
router.get("/", function (req, res) {
  res.render("index");
});

router.get("/graph", (req, res) => {
  res.render("graph");
});

router.get("/list", (req, res) => {
  res.render("index");
});

// link api to server
// require("./api/api")(router);

// driver code
function main() {
  const port = 8090;
  app.use("/", router);
  app.listen(port);
  console.log(`Running at \n http://localhost:${port}/`);
}

// start server
main();