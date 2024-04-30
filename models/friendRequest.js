const { Schema, model } = require("mongoose");

const requestSchema = new Schema({
  // user that have send us friend request
  sender: {
    type: Schema.ObjectId,
    ref: "User",
  },
  recipient: {
    type: Schema.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

const FriendRequest = new model("FriendRequest", requestSchema);
module.exports = FriendRequest;
