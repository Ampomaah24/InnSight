const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const { onSchedule } = require("firebase-functions/v2/scheduler");


admin.initializeApp();

// Add this line to fix the FieldValue issue
const { FieldValue } = require('firebase-admin/firestore');

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
      emailSentAt: FieldValue.serverTimestamp(),
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

exports.notifyMissedCheckIns = onSchedule({
  schedule: "every day 10:00",
  timeZone: "Africa/Accra"
}, async (event) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const snapshot = await admin.firestore()
      .collection("bookings")
      .where("status", "==", "Confirmed")
      .get();

    const missed = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(b => {
        let checkInDate;
        try {
          checkInDate = b.checkIn?.toDate?.() || new Date(b.checkIn.seconds * 1000);
        } catch {
          return false;
        }
        return checkInDate < today;
      });

    if (missed.length > 0) {
      const emailContent = missed.map(b => {
        const name = `${b.bookerFirstName || ""} ${b.bookerLastName || ""}`.trim();
        const room = b.roomNumber || "Not assigned";
        const date = b.checkIn?.toDate?.().toLocaleDateString() || "Unknown";
        return `<li>${name} — Room: ${room} — Scheduled: ${date}</li>`;
      }).join("");

      // Email notification
      const mailOptions = {
        from: "juniorantwi95@gmail.com",
        to: "juniorantwi95@gmail.com",
        subject: "⚠️ Missed Check-ins Notification",
        html: `<p>The following guests missed their check-in as of today:</p><ul>${emailContent}</ul>`,
      };

      await transporter.sendMail(mailOptions);
      console.log("✅ Missed check-in email sent.");

      // In-app notification for admin (Firestore)
      const notificationsRef = admin.firestore().collection("notifications");

      const batch = admin.firestore().batch();

      missed.forEach(b => {
        const name = `${b.bookerFirstName || ""} ${b.bookerLastName || ""}`.trim();
        const message = `${name} missed their check-in for Room ${b.roomNumber || "N/A"}`;

        const newNotification = notificationsRef.doc();
        batch.set(newNotification, {
          type: "missed_checkin",
          message,
          bookingId: b.id,
          createdAt: FieldValue.serverTimestamp(),
          forAdmin: true,
          read: false,
        });
      });

      await batch.commit();
      console.log("✅ In-app missed check-in notifications added.");
    } else {
      console.log("✅ No missed check-ins found today.");
    }
  } catch (error) {
    console.error("❌ Failed to process missed check-ins:", error);
  }
});