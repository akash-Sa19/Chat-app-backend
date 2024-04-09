const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, "First Name is required"],
  },
  lastName: {
    type: String,
    required: [true, "Last Name is required"],
  },
  avatar: {
    type: String,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    validate: {
      validator: function (email) {
        return String(email)
          .toLowerCase()
          .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
          );
      },
      message: (props) => `Email ${props.value} is invalid!`,
    },
  },
  password: {
    type: String,
    required: true,
  },
  passwordChangedAt: {
    type: Date,
  },
  passwordResetToken: {
    type: String,
  },
  passwordResetExpires: {
    type: Date,
  },
  createdAt: {
    type: Date,
  },
  updatedAt: {
    type: Date,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: Number,
  },
  otp_expiry_time: {
    type: Date,
  },
});

userSchema.pre("save", async function (next) {
  // only run this function if otp actually modified
  if (!this.isModified("otp")) return next();

  // Hash the OTP with the ccost of 12
  this.otp = await bcrypt.hash(this.otp, 12);
  next();
});

userSchema.methods.correctPassword = async function (
  canditatePassword, // supplied by the user
  userPassword // stored in the database
) {
  return await bcrypt.compare(canditatePassword, userPassword);
};

userSchema.methods.correctOTP = async function (
  canditateOTP, // supplied by the user
  userOTP // stored in the database
) {
  return await bcrypt.compare(canditateOTP, userOTP);
};

userSchema.methods.createPasswordResetToken = function () {
  // genrated random string
  const randomString = crypto.randomBytes(32).toString("hex");

  // if any-one has the access of the DB it can see the token and can try to reset password
  // that's why ->  for security resons we hash the token
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(randomString)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10* 60 *1000 

  return randomString;
};

userSchema.methods.changedPasswordAfter = funtion (timestamp) {
  // timestamp is that time when new token was generated
  // when the user log-in new password is generated 
  // so timestamp > this.passwordChangedAt

  // for example -> if someone is alredy logged in 
  // and someother person changed password all must logged-out of their account, and relogin with new password
  return timestamp < this.passwordChangedAt

}

const User = mongoose.model("User", userSchema);
module.exports = User;
