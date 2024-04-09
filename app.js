const express = require("express");

// config packages
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongosanitize = require("express-mongo-sanitize");
const bodyParser = require("body-parser");
const cors = require("cors");
// sanitize untrusted HTML(to prevent XSS) with a configuration specified by a whitelist
const xss = require("xss");

// importing routes
const routes = require("./routes/index");

// app
const app = express();

// middleware
// with this middleware we can limit the size of data we can recive as json from response
// default - 100kb
app.use(express.json({ limit: "10kb" }));
//
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(helmet());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "PATCH", "POST", "DELETE", "PUT"],
    credentials: true,
  })
);

if (process.env.NODE_ENV === "devlopment") {
  app.use(morgan("dev"));
}

// this rate limiter package is use to limit the rate of request send in a particular time interval
const limiter = rateLimit({
  // no. of request
  max: 3000,
  // time in miliseconds
  windowMs: 60 * 60 * 1000, // 1 hour
  // error message when their is too many request
  message: "Too many request from this IP, please try in one hour",
});

app.use("/tawk", limiter);
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(mongosanitize());
// app.use(xss());

// routes
// http://localhost:3000/v1/auth/login
app.use(routes);

module.exports = app;
