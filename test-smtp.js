require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify(function (error, success) {
  if (error) {
    console.log("SMTP Error:", error.message);
    if(error.response) console.log("SMTP Response:", error.response);
  } else {
    console.log("Server is ready to take our messages");
  }
});
