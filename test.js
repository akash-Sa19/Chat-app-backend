userSchema.methods.createPasswordResetToken = async function () {
  // genrated random string
  const randomString = crypto.randomBytes(32).toString("hex");

  // if any-one has the access of the DB it can see the token and can try to reset password
  // that's why ->  for security resons we hash the token
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(randomString)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return randomString;
};
