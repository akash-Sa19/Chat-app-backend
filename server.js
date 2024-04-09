const app = require("./app");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const http = require("http");

dotenv.config({ path: "./config.env" });

const port = process.env.PORT || 8000;
const DB = process.env.DBURI.replace("<PASSWORD>", process.env.DBPASSWORD);

const server = http.createServer(app);
server.listen(port, () => console.log(`http://localhost:${port}`));

mongoose
  .connect(DB, {
    // read about this
    // useNewUrlParser: true,
    // useCreateIndex: true,
    // useFindAndModify: false,
    // useUnifiedToplogy: true,
  })
  .then(() => {
    console.log("Database Connected");
  })
  .catch((err) => {
    console.log(err);
  });

process.on("uncaughtException", (err) => {
  console.log(err);
  //   this will shut-down the server if an unexpected err has come
  process.exit(1);
});
process.on("unhandledRejection", (err) => {
  console.log(err);
  server.close(() => {
    process.exit(1);
  });
});
