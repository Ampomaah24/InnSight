const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "ServiceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const menu = JSON.parse(fs.readFileSync(path.join(__dirname, "menu.json"), "utf8"));

async function uploadMenu() {
  const batch = db.batch();

  menu.forEach((item) => {
    const docRef = db.collection("meals").doc(item.id);
    batch.set(docRef, {
      name: item.name,
      category: item.category,
      price: item.price,
      imageUrl: item.imageUrl,
    });
  });

  try {
    await batch.commit();
    console.log("✅ Menu uploaded successfully.");
  } catch (err) {
    console.error("❌ Error uploading menu:", err);
  }
}

uploadMenu();
