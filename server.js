// Required variables and configurations
require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const app = express();
app.use(express.json());

const confirmationFile = "./confirmation.json";

// Send email route
app.post("/send-confirmation", async (req, res) => {
  const { email, userId } = req.body;
  const token = uuidv4();
  const confirmUrl = `https://webhook-go4h.onrender.com/confirm/${token}`;

  // Store token
  let confirmations = {};
  if (fs.existsSync(confirmationFile)) {
    confirmations = JSON.parse(fs.readFileSync(confirmationFile));
  }
  confirmations[token] = { email, userId, confirmed: false };
  fs.writeFileSync(confirmationFile, JSON.stringify(confirmations, null, 2));

  // Send email
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: `"Zetinn Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Please confirm your email",
    html: `<p>Click <a href="${confirmUrl}">here</a> to confirm your email address.</p>`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.send({ success: true, message: "Confirmation email sent." });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send({ success: false });
  }
});

// Confirmation route
app.get("/confirm/:token", (req, res) => {
  const { token } = req.params;
  let confirmations = JSON.parse(fs.readFileSync(confirmationFile));

  if (confirmations[token]) {
    confirmations[token].confirmed = true;
    fs.writeFileSync(confirmationFile, JSON.stringify(confirmations, null, 2));
    return res.send("✅ Email confirmed successfully!");
  } else {
    return res.status(400).send("❌ Invalid confirmation token.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
