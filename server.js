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
  const { email, userId, furnitureType, furnitureCondition, furnitureColor, furnitureBudget, furnitureStyle } = req.body; // updating in order to fill in order details
  const token = uuidv4();
  const confirmUrl = `https://webhook-go4h.onrender.com/confirm/${token}?conversationId=${userId}`; //update to confirmation address

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

  const mailOptions = { //Updated email attachment to include order summary
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
    res.send({ success: true, message: "Confirmation email sent." });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send({ success: false });
  }
});

// Confirmation route
app.get("/confirm/:token", (req, res) => {
  const { token } = req.params;
  const { conversationId } = req.query; // this is user.id

  // Read the confirmation file (create it if it doesn't exist)
  if (!fs.existsSync(confirmationFile)) {
    return res.status(404).send("❌ No confirmation data found.");
  }

  let confirmations = JSON.parse(fs.readFileSync(confirmationFile));

  if (confirmations[token]) {
    confirmations[token].confirmed = true;
    confirmations[token].conversationId = conversationId || confirmations[token].conversationId || null;

    fs.writeFileSync(confirmationFile, JSON.stringify(confirmations, null, 2));

    return res.send("✅ Email confirmed successfully. You may return to the chatbot.");
  } else {
    return res.status(400).send("❌ Invalid confirmation token.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
