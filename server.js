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
  const token = test-token-123;
  const confirmUrl = `http://localhost:${PORT}/confirm/${token}?conversationId=${user.id}`; //update to confirmation address

  // Store token
  let confirmations = {};
  if (fs.existsSync(confirmationFile)) {
    confirmations = JSON.parse(fs.readFileSync(confirmationFile));
  }
  confirmations[token] = { email, userId, confirmed: false };
  fs.writeFileSync(confirmationFile, JSON.stringify(confirmations, null, 2));

  //Checking if it is writing to confirmation/json 
  console.log("📝 Saving confirmation for token:", token);
  console.log("➡️ Confirmation entry:", confirmations[token]);
  fs.writeFileSync(confirmationFile, JSON.stringify(confirmations, null, 2));
  console.log("✅ confirmation.json updated.");

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
    return res.json({
  success: true,
  confirmationUrl: `http://localhost:${PORT}/confirm/${token}?conversationId=${user.id}`
});
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

app.get("/status/:userId", (req, res) => {
  const { userId } = req.params;

  // Check if the confirmation file exists
  if (!fs.existsSync(confirmationFile)) {
    return res.status(404).json({ confirmed: false });
  }

  // Read all confirmation records
  const confirmations = JSON.parse(fs.readFileSync(confirmationFile));

  // Find a record with the matching userId
  const match = Object.values(confirmations).find(entry => entry.userId === userId);

  if (match) {
    return res.json({ confirmed: match.confirmed === true });
  } else {
    return res.status(404).json({ confirmed: false });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
