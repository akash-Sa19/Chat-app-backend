const app = require("./app");
// config
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
// DB
const mongoose = require("mongoose");
// node
const http = require("node:http");
const path = require("node:path");
// model
const FriendRequest = require("./models/friendRequest");
const User = require("./models/user");
const OneToOneMessage = require("./models/OneToOneMessage");
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
    await User.findByIdAndUpdate(user_id, { socket_id, status: "Online" });
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
  });

  socket.on("get_direct_conversations", async ({ user_id }, callback) => {
    const existing_conversations = await OneToOneMessage.find({
      participants: { $all: [user_id] },
    }).populate("participants", "firstName lastName _id email status");

    console.log(existing_conversations);

    callback(existing_conversations);
  });

  socket.on("start_conversation", async (data) => {
    // data : {to, from}
    const { to, from } = data;

    // check if there is any existing conversation between these users
    const existing_conversation = await OneToOneMessage.find({
      participants: { $size: 2, $all: [to, from] },
    }).populate("participants", "firstName lastName _id email status");

    console.log("Existing Conversation : ", existing_conversation[0]);

    // if no existing_conversation
    if (existing_conversation.length === 0) {
      let new_chat = await OneToOneMessage.create({
        participants: [to, from],
      });

      new_chat = await OneToOneMessage.findById(new_chat._id).populate(
        "participants",
        "firstName lastName _id email status"
      );

      console.log(new_chat);
      socket.emit("start_chat", new_chat);
    }

    // if there is existing_conversation
    else {
      socket.emit("open_chat", existing_conversation[0]);
    }
  });

  socket.on("text_message", (data) => {
    console.log("Recived Message", data);

    // data : {to, from, text}

    // create a new conversation if it doesn't exist yet or add new messagee to the message list

    // save to db

    // emit icoming_message -> to reciving user

    // emit outgoing_message -> from sending user
  });

  socket.on("file_message", (data) => {
    console.log("Recived File", data);

    // data: {to, from, file context, file}

    // get the file extension

    const fileExtension = path.extname(data.file.name);

    // generate a unique filename
    const fileName = `${Date.now()}_${Math.floor(
      Math.random() * 10000
    )}${fileExtension}`;

    // upload to aws s3

    // create a new conversation if it doesn't exist yet or add new messagee to the message list

    // save to db

    // emit icoming_message -> to reciving user

    // emit outgoing_message -> from sending user
  });

  socket.on("end", async (data) => {
    // find user by _id and set status to offline
    if (data.user_id) {
      await User.findByIdAndUpdate(data.user_id, { status: "Offline " });
    }

    // todo:  broadcast user disconnect

    console.log("Closing connection");
    socket.disconnect(0);
  });
});

// ----------------------------------
// server process
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
