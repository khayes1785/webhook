// Required variables and configurations
require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const app = express();
app.use(express.json());

const confirmationFile = "./confirmation.json";
const PORT = process.env.PORT || 3000;
const RENDER_BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Send email route
app.post("/send-confirmation", async (req, res) => {
  const { //All required constant variables
    email,
    userId,
    furnitureType,
    furnitureCondition,
    furnitureColor,
    furnitureBudget,
    furnitureStyle
  } = req.body;

  const token = uuidv4(); // actually generate a token
  const confirmUrl = `${RENDER_BASE_URL}/confirm/${token}?conversationId=${userId}`; 

  // Store token
  let confirmations = {};
  if (fs.existsSync(confirmationFile)) {
    confirmations = JSON.parse(fs.readFileSync(confirmationFile));
  }
//How it will be stored
  confirmations[token] = {
    email,
    userId,
    confirmed: false,
    createdAt: new Date().toISOString()
  };

  try { //Try to write into file and check as we go with consol.log
    fs.writeFileSync(confirmationFile, JSON.stringify(confirmations, null, 2));
    console.log("📝 Saving confirmation for token:", token);
    console.log("➡️ Confirmation entry:", confirmations[token]);
  } catch (err) {
    console.error("❌ Error writing to confirmation.json:", err);
    return res.status(500).json({ success: false, message: "Could not save token." });
  }

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
    subject: "Please confirm your furniture order",
    html: `
      <p>Hi there,</p>
      <p>Thank you for using Zetinn! Please confirm your order below:</p>
      <h3>🪑 Your Furniture Request:</h3>
      <ul>
        <li><strong>Type:</strong> ${furnitureType}</li>
        <li><strong>Color:</strong> ${furnitureColor}</li>
        <li><strong>Style:</strong> ${furnitureStyle}</li>
        <li><strong>Condition:</strong> ${furnitureCondition}</li>
        <li><strong>Budget:</strong> ${furnitureBudget} €</li>
      </ul>
      <p>To confirm, click the link below:</p>
      <p><a href="${confirmUrl}">✅ Confirm My Order</a></p>
      <p>If you did not make this request, you can ignore this message.</p>
      <p>– The Zetinn Team</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
     // Respond with the confirmation URL
    return res.json({
      success: true,
      confirmationUrl: confirmUrl
    });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return res.status(500).json({ success: false, message: "Failed to send confirmation email." });
  }
});

// Confirmation route
app.get("/confirm/:token", async (req, res) => {
  const { token } = req.params;
  const { conversationId } = req.query;

  if (!fs.existsSync(confirmationFile)) {
    return res.status(404).send("❌ No confirmation data found.");
  }

  let confirmations = JSON.parse(fs.readFileSync(confirmationFile));

  if (confirmations[token]) {
    confirmations[token].confirmed = true;
    confirmations[token].conversationId = conversationId || confirmations[token].conversationId || null;

    fs.writeFileSync(confirmationFile, JSON.stringify(confirmations, null, 2));

    // ✅ Send webhook to Botpress
    const botpressWebhook = "https://webhook.botpress.cloud/9183af65-803a-407d-95ef-a839d0421759";
    const payload = {
      userId: confirmations[token].userId,
      event: "email_confirmed",
      email: confirmations[token].email
    };

    try {
      await axios.post(botpressWebhook, payload);
      console.log("✅ Webhook sent to Botpress");
    } catch (error) {
      console.error("❌ Failed to notify Botpress:", error.message);
    }

    return res.send("✅ Email confirmed successfully. You may return to the chatbot.");
  } else {
    return res.status(400).send("❌ Invalid confirmation token.");
  }
});


// Status check route
app.get("/status/:userId", (req, res) => {
  const { userId } = req.params;

  if (!fs.existsSync(confirmationFile)) {
    return res.status(404).json({ confirmed: false });
  }

  const confirmations = JSON.parse(fs.readFileSync(confirmationFile));
  const match = Object.values(confirmations).find(entry => entry.userId === userId);

  if (match) {
    return res.json({ confirmed: match.confirmed === true });
  } else {
    return res.status(404).json({ confirmed: false });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
