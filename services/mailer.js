const sgMail = require("@sendgrid/mail");
const dotenv = require("dotenv");

dotenv.config({ path: "../config.env" });

sgMail.setApiKey(process.env.SG_KEY);

const sendSGMail = async ({
  recipient,
  sender,
  subject,
  html,
  text,
  attachments,
}) => {
  try {
    const from = sender || "contact@gmail.com";
    const msg = {
      to: recipient, // email of recipient
      form: form, // this will be our verified sender
      subject,
      html,
      text,
      attachments,
    };

    return sgMail.send(msg);
  } catch (error) {}
};

exports.sendEmail = async (args) => {
  // this is a precaution case used to prevent accidently sending of mail to all our user
  if (process.env.NODE_ENV === "development") {
    return new Promise.resolve();
  } else {
    return sendSGMail(args);
  }
};
