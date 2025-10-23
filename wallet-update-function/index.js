const functions = require("firebase-functions/v2");
const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");

admin.initializeApp();

// 🕒 Runs every day at 9:00 AM India time
exports.updateWallets = onSchedule(
 { schedule: "*/1 * * * *", timeZone: "Asia/Kolkata" },
  async (event) => {
    console.log("🚀 Running wallet update function...");

    const db = admin.firestore();
    const now = new Date();

    try {
      // Get all pending commissions
      const snapshot = await db
        .collection("commissions")
        .where("status", "==", "pending")
        .get();

      if (snapshot.empty) {
        console.log("No pending commissions found ❌");
        return;
      }

      for (const doc of snapshot.docs) {
        const data = doc.data();

        // 🕐 Convert releaseDate safely
        let releaseDate;
        if (
          data.walletReleaseDate &&
          typeof data.walletReleaseDate.toDate === "function"
        ) {
          releaseDate = data.walletReleaseDate.toDate();
        } else {
          releaseDate = new Date(data.walletReleaseDate);
        }

        console.log("Checking commission:", doc.id);
        console.log("Release Date:", releaseDate);
        console.log("Now:", now);
        console.log("ReleaseDate <= Now:", releaseDate <= now);
        console.log("Seller Code:", data.codee);

        if (releaseDate && releaseDate <= now) {
          const codee = data.codee;
          const amount = Number(data.commission) || 0;

          // 🔍 Find seller with matching codee
          const sellerSnap = await db
            .collection("sellerDetails")
            .where("referralCode", "==", codee)
            .get();

          if (sellerSnap.empty) {
            console.log(`❌ No seller found for codee: ${codee}`);
            continue;
          }

          const sellerRef = sellerSnap.docs[0].ref;
          const sellerData = sellerSnap.docs[0].data();

          // ✅ Ensure walletAmount exists and is numeric
          let walletAmount = Number(sellerData.walletAmount) || 0;

          await sellerRef.update({
            walletAmount: admin.firestore.FieldValue.increment(amount),
          });

          // ✅ Mark commission as released
          await doc.ref.update({
            status: "released",
            isAddedToWallet: true,
            releasedAt: admin.firestore.Timestamp.now(),
          });

          console.log(`✅ Released ₹${amount} to ${codee}`);
        }
      }

      console.log("🎉 Wallet update completed successfully ✅");
    } catch (error) {
      console.error("❌ Error updating wallets:", error);
    }
  }
);
