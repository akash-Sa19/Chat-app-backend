const app = require("./app");
// config
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
// DB
const mongoose = require("mongoose");
// node
const http = require("http");

const { Server } = require("socket.io");

const port = process.env.PORT || 8000;
const DB = process.env.DBURI.replace("<PASSWORD>", process.env.DBPASSWORD);

const server = http.createServer(app);

// instance of socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

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

server.listen(port, () => console.log(`http://localhost:${port}`));

io.on("connection", async (socket) => {
  console.log(socket);
  const user_id = socket.handshake.query["user_id"];
  // this socket_id is unique for each connection
  const socket_id = socket.id;

  console.log(`User connected : ${socket_id}`);

  if (user_id) {
    // left here -> work for tomorrow
    await User.findByIdAndUpdate(user_id, { socket_id });
  }

  // We can write our socket event listeners here...
  socket.on("friend_request", async (data) => {
    console.log(data.to);

    // data
    const to = await User.findById(data.to);

    // create a friend request
    io.to(to.socket_id).emit("new_friend_request", {
      //
    });
  });
});

process.on("uncaughtException", (err) => {
  console.log(err);
  console.log("UNCAUGHT Exception! Shutting down...");
  //   this will shut-down the server if an unexpected err has come
  process.exit(1);
});
process.on("unhandledRejection", (err) => {
  console.log(err);
  server.close(() => {
    process.exit(1);
  });
});
