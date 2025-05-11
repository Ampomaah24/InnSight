const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
const { FieldValue } = require("firebase-admin/firestore");

// Configure Gmail transporter (use App Password, not account password)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "juniorantwi95@gmail.com",
    pass: "urlm gebm hskt okfw",
  },
});

// 🔹 1. Send Contact Form Email (onCall)
exports.sendContactEmail = functions.https.onCall(async (data, context) => {
  try {
    const mailOptions = {
      from: "Contact Form <juniorantwi95@gmail.com>",
      to: "juniorantwi95@gmail.com",
      replyTo: data.email,
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

    await transporter.sendMail(mailOptions);

    await admin.firestore().collection("contactMessages").doc(data.messageId).update({
      emailSent: true,
      emailSentAt: FieldValue.serverTimestamp(),
    });

    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, message: "Error sending email", error: error.message };
  }
});

// 🔹 2. Notify Missed Check-Ins (Scheduled Daily @10AM)
exports.notifyMissedCheckIns = functions.pubsub.schedule("every day 10:00").timeZone("Africa/Accra").onRun(async () => {
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

      await transporter.sendMail({
        from: "juniorantwi95@gmail.com",
        to: "juniorantwi95@gmail.com",
        subject: "⚠️ Missed Check-ins Notification",
        html: `<p>The following guests missed their check-in as of today:</p><ul>${emailContent}</ul>`,
      });

      const notificationsRef = admin.firestore().collection("notifications");
      const batch = admin.firestore().batch();

      missed.forEach(b => {
        const name = `${b.bookerFirstName || ""} ${b.bookerLastName || ""}`.trim();
        const message = `${name} missed their check-in for Room ${b.roomNumber || "N/A"}`;
        batch.set(notificationsRef.doc(), {
          type: "missed_checkin",
          message,
          bookingId: b.id,
          createdAt: FieldValue.serverTimestamp(),
          forAdmin: true,
          read: false,
        });
      });

      await batch.commit();
      console.log("✅ Missed check-in notifications sent.");
    } else {
      console.log("✅ No missed check-ins today.");
    }
  } catch (error) {
    console.error("❌ Failed to process missed check-ins:", error);
  }
});

// 🔹 3. Airport Pickup Reminders (Scheduled Daily @9AM)
exports.remindAirportPickups = functions.pubsub.schedule("every day 09:00").timeZone("Africa/Accra").onRun(async () => {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 1 * 60 * 60 * 1000);
  const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  try {
    const snapshot = await admin.firestore()
      .collection("bookings")
      .where("pickupDetails.pickupDate", "!=", null)
      .get();

    const reminders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(b => {
        const { pickupDate, pickupTime } = b.pickupDetails || {};
        if (!pickupDate || !pickupTime) return false;

        const [hour, minute] = pickupTime.split(":").map(Number);
        const fullPickup = new Date(pickupDate);
        fullPickup.setHours(hour, minute, 0, 0);

        const diff1 = Math.abs(fullPickup - oneHourLater);
        const diff24 = Math.abs(fullPickup - twentyFourHoursLater);
        return diff1 < 10 * 60 * 1000 || diff24 < 10 * 60 * 1000;
      });

    if (reminders.length > 0) {
      const htmlList = reminders.map(b => {
        const name = `${b.bookerFirstName || ""} ${b.bookerLastName || ""}`.trim();
        const { airportLocation, flightNumber, pickupDate, pickupTime } = b.pickupDetails;
        return `<li>${name} — Flight: ${flightNumber}, Pickup at ${airportLocation} on ${pickupDate.split("T")[0]} ${pickupTime}</li>`;
      }).join("");

      await transporter.sendMail({
        from: "juniorantwi95@gmail.com",
        to: "juniorantwi95@gmail.com",
        subject: "🚐 Airport Pickup Reminder",
        html: `<p>Upcoming airport pickups:</p><ul>${htmlList}</ul>`,
      });

      const notificationsRef = admin.firestore().collection("notifications");
      const batch = admin.firestore().batch();

      reminders.forEach(b => {
        const { pickupDate, pickupTime, airportLocation, flightNumber } = b.pickupDetails;
        const name = `${b.bookerFirstName || ""} ${b.bookerLastName || ""}`.trim();
        const message = `${name} has an airport pickup at ${airportLocation} for flight ${flightNumber} on ${pickupDate.split("T")[0]} ${pickupTime}`;

        batch.set(notificationsRef.doc(), {
          type: "airport_pickup_reminder",
          message,
          bookingId: b.id,
          createdAt: FieldValue.serverTimestamp(),
          forAdmin: true,
          read: false,
        });
      });

      await batch.commit();
      console.log("✅ Airport pickup reminders sent.");
    } else {
      console.log("✅ No upcoming airport pickups found.");
    }
  } catch (err) {
    console.error("❌ Failed to send airport pickup reminders:", err);
  }
});
