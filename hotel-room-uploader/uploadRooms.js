
const admin = require("firebase-admin");
const fs = require("fs");

// Replace with the path to your service account key JSON
const serviceAccount = require("./ServiceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const rooms = JSON.parse(fs.readFileSync("rooms.json", "utf8"));



async function uploadRooms() {
  const batch = db.batch();
  rooms.forEach((room) => {
    const docRef = db.collection("rooms").doc(room.id); // 'rooms' is the collection name
    batch.set(docRef, room);
  });

  await batch.commit();
  console.log("Rooms uploaded successfully.");
}

uploadRooms();