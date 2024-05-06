const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const crypto = require("crypto");

// models
const User = require("../models/user");
// utils function
const filterObj = require("../utils/filterObj");
const { promisify } = require("util");
// mail service
const mailService = require("../services/mailer");

const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);

// ---------------------------------------------------------------------------

// Signup => register -> sendOTP -> verifyOTP
// https://api.tawk.com/auth/register

// Types of routes -> Procted (need login)
//                 -> Unprocted (don't need login)

// Register new User
exports.register = async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  const filteredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "password",
    "email"
  );

  //  check if a verified used with given email exists
  const existing_user = await User.findOne({ email: email });
  if (existing_user && existing_user.verified) {
    res.status(400).json({
      status: "error",
      message: "Email is already in use, Please login",
    });
  } else if (existing_user) {
    const updated_user = await User.findOneAndUpdate(
      { email: email },
      filteredBody,
      {
        // ? New Concept
        //  using {new: true} -> will send document after updating
        // without using -> will send document just before updating the user
        new: true,

        // ? New Concept
        // with this method -> validation will only run on those fields that are been updated
        validateModifiedOnly: true,
      }
    );
    req.userId = existing_user._id;
    next();
  } else {
    // if user record is not avaliable in our DB
    const new_user = await User.create(filteredBody);

    // generate OTP and send email to user
    req.userId = new_user._id;
    next();
  }
};

exports.sendOTP = async (req, res, next) => {
  const { userId } = req;
  const new_otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });

  const otp_expiry_time = Date.now() + 10 * 60 * 1000; // 10 mins after otp is sent

  const user = await User.findByIdAndUpdate(userId, {
    otp_expiry_time,
  });
  user.otp = new_otp.toString();
  await user.save({ new: true, validateModifiedOnly: true });

  // TODO: send the email to the user
  mailService.sendEmail({
    from: "contact@gamil.com",
    to: "example@gamil.com",
    subject: "OTP for tawk",
    text: `your otp is ${new_otp}. This is valid for 10 Mins`,
  });

  res.status(200).json({
    status: "success",
    message: "OTP sent successfully",
    // ! below - do not use in production
    otp: new_otp,
  });
};

exports.verifyOTP = async (req, res, next) => {
  // verify OTP and update user record accordingly

  const { email, otp } = req.body;
  const user = await User.findOne({
    email,
    // this otp_expiry_time must be greater than current time -> then it will return user
    // if not null will be returned

    otp_expiry_time: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(404).json({
      status: "error",
      message: "Email is Invalid or OTP expired",
    });
  }

  if (!(await user.correctOTP(otp, user.otp))) {
    res.status(400).json({
      status: "error",
      message: "OTP is incorrect",
    });
    return;
  }

  // OTP is correct
  user.verified = true;
  user.otp = undefined;

  await user.save({ new: true, validateModifiedOnly: true });

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "OTP verified successfull",
    token,
    user_id: user._id,
  });
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: "error",
      message: "Both email and password is required",
    });
  }

  const user = await User.findOne({ email: email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return res.status(404).json({
      status: "error",
      message: "Email or Password is incorrect",
    });
  }

  const token = signToken(user._id);

  return res.status(200).json({
    status: "success",
    message: "Logged in successfully",
    token,
    user_id: user._id,
  });
};

exports.protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return res.status(401).json({
      status: "error",
      message: "You are not logged-in! please log in to get access",
    });
  }

  // verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // console.log(decoded);

  // check if user still exists
  const this_user = await User.findById(decoded.userId);
  if (!this_user) {
    return res.status(400).json({
      status: "error",
      message: "the user doesn't exist",
    });
  }

  // check if user changed their password after token is issued
  if (this_user.changedPasswordAfter(decoded.iat)) {
    res.status(400).json({
      status: "error",
      message: "User recenty updated password! Please login again",
    });
  }
  // console.log(this_user);
  req.user = this_user;
  next();
};

exports.forgotPassword = async (req, res, next) => {
  // get user email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return res.status(404).json({
      status: "error",
      message: "There is no user with given email address",
    });
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // const resetURL = `https://tawk.com/auth/reset-password/code=${resetToken}`;

  try {
    // todo => send email with reset url
    console.log(resetToken);

    return res.status(200).json({
      status: "success",
      message: "Reset password link send to email",
      // ! below -> donot use this code in production
      resetToken: resetToken,
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    // validateBeforeSave: false -> because we don't want to validate this filed as they will be removed from this doc
    // if value of a field is set to undefined it will be removed from that doc
    await user.save({ validateBeforeSave: false });
    return res.status(500).status({
      status: "error",
      message: "There was an error sending the email, Please try again later",
    });
  }
};

exports.resetPassword = async (req, res, next) => {
  // .update(rep.params.code)
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.body.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //
  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "token is invalid or expire",
    });
  }

  const { password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    return res.status(400).json({
      status: "error",
      message: "confirm password and password doesn't match",
    });
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  // todo: send email to user informing about password rest

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "password reset successfully",
    token,
  });
};
