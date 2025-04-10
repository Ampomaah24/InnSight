const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configure the email transport using nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail", 
  auth: {
    user: "juniorantwi95@gmail.com", // Replace with your actual Gmail address
    pass: "urlm gebm hskt okfw", // Replace with the app password you generated
  },
});

exports.sendContactEmail = functions.https.onCall(async (data, context) => {
  try {
    // Email content
    const mailOptions = {
      from: "Contact Form <juniorantwi95@gmail.com>", // Replace with your Gmail
      to: "juniorantwi95@gmail.com", // Replace with your Gmail
      replyTo: data.email, // The user's email for direct replies
      subject: `Contact Form: ${data.subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.phone}</p>
        <p><strong>Subject:</strong> ${data.subject}</p>
        <p><strong>Message:</strong></p>
        <p>${data.message.replace(/\n/g, "<br>")}</p>
        <p><strong>Reference ID:</strong> ${data.messageId}</p>
        <p><strong>Submitted at:</strong> ${new Date().toLocaleString()}</p>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Update Firestore to mark the email as sent
    await admin.firestore().collection("contactMessages").doc(data.messageId).update({
      emailSent: true,
      emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    console.error("Error sending email:", error);
    return { 
      success: false, 
      message: "Error sending email", 
      error: error.message 
    };
  }
});