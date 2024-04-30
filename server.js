const app = require("./app");
// config
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
// DB
const mongoose = require("mongoose");
// node
const http = require("http");
// model
const FriendRequest = require("./models/friendRequest");
// socket.io
const { Server } = require("socket.io");

// ----------------------------------------------------------------

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
  console.log(JSON.stringify(socket.handshake.query));
  // console.log(socket);
  const user_id = socket.handshake.query["user_id"];
  // this socket_id is unique for each connection
  const socket_id = socket.id;

  console.log(`User connected : ${socket_id}`);

  if (Boolean(user_id)) {
    // left here -> work for tomorrow
    await User.findByIdAndUpdate(user_id, { socket_id });
  }

  // We can write our socket event listeners here...
  socket.on("friend_request", async (data, callback) => {
    console.log(data.to);
    // data => {to, from}

    // data
    const to_user = await User.findById(data.to).select("socket_id");
    const from_user = await User.findById(data.from).select("socket_id");

    // todo: create a friend request
    await FriendRequest.create({
      sender: data.from,
      recipient: data.to,
    });

    // ? emit event => "new friend request"
    io.to(to_user.socket_id).emit("new_friend_request", {
      //
      message: "New Friend request Received",
    });
    // emit event => "request send"
    io.to(from_user.socket_id).emit("request_sent", {
      message: "Request sent successfully!",
    });
  });

  socket.on("accept_request", async (data) => {
    console.log(data);

    const request_doc = await FriendRequest.findById(data.request_id);

    console.log(request_doc);

    // request_id
    const sender = await User.findById(request_doc.sender);
    const reciver = await User.findById(request_doc.recipient);

    sender.friends.push(request_doc.recipient);
    reciver.friends.push(request_doc.sender);

    await reciver.save({ new: true, validateModifiedOnly: true });
    await sender.save({ new: true, validateModifiedOnly: true });

    await FriendRequest.findByIdAndDelete(data.request_id);

    io.to(sender.socket_id).emit("request_accepted", {
      message: "Friend Request Accepted",
    });
    io.to(reciver.socket_id).emit("request_accepted", {
      message: "Friend Request Accepted",
    });

    socket.on("end", function () {
      console.log("Closing connection");
      socket.disconnect(0);
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
