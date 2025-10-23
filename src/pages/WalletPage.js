// src/pages/WalletPage.js
import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const WalletPage = () => {
  const [walletAmount, setWalletAmount] = useState(0);
  const [referralCode, setReferralCode] = useState("");
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [upiOrBank, setUpiOrBank] = useState("");
  const [isRequestSent, setIsRequestSent] = useState(false);
  const [paidWithdraw, setPaidWithdraw] = useState(null);
  const [paidHistory, setPaidHistory] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchWalletAndCommissions = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const sellerRef = collection(db, "sellerDetails");
        const sellerQ = query(sellerRef, where("email", "==", user.email));
        const sellerSnap = await getDocs(sellerQ);

        if (!sellerSnap.empty) {
          const sellerDoc = sellerSnap.docs[0];
          const sellerData = sellerDoc.data();

          const sellerCode =
            sellerData.referralCode || sellerData.codee || sellerData.code;

          setReferralCode(sellerCode || "N/A");
          setWalletAmount(sellerData.walletAmount || 0);

          const commissionRef = collection(db, "commissions");
          const commissionSnap = await getDocs(commissionRef);

          const allCommissions = commissionSnap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter(
              (c) =>
                c.referralCode === sellerCode ||
                c.codee === sellerCode ||
                c.code === sellerCode
            );

          setCommissions(allCommissions);
        }
      } catch (error) {
        console.error("Error loading wallet:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWalletAndCommissions();
  }, []);

  // ✅ Real-time listener for all paid withdrawals
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const withdrawRef = collection(db, "withdrawRequests");
    const withdrawQ = query(
      withdrawRef,
      where("email", "==", user.email),
      where("status", "==", "paid")
    );

    const unsubscribeWithdraw = onSnapshot(withdrawQ, (snapshot) => {
      if (!snapshot.empty) {
        const allPaid = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        const sorted = allPaid.sort(
          (a, b) => b.requestedAt?.seconds - a.requestedAt?.seconds
        );

        setPaidWithdraw(sorted[0]); // latest payment
        setPaidHistory(sorted); // all previous payments
      } else {
        setPaidWithdraw(null);
        setPaidHistory([]);
      }
    });

    return () => unsubscribeWithdraw();
  }, []);

  // 🔹 Handle Withdraw Request
  const handleWithdraw = async () => {
    if (!upiOrBank.trim()) {
      alert("Please enter your UPI ID or bank account number.");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    try {
      await addDoc(collection(db, "withdrawRequests"), {
        email: user.email,
        referralCode,
        upiOrBank,
        walletAmount,
        status: "pending",
        requestedAt: serverTimestamp(),
      });

      const sellerRef = collection(db, "sellerDetails");
      const sellerQ = query(sellerRef, where("email", "==", user.email));
      const sellerSnap = await getDocs(sellerQ);

      if (!sellerSnap.empty) {
        const sellerDocRef = doc(db, "sellerDetails", sellerSnap.docs[0].id);
        await updateDoc(sellerDocRef, { walletAmount: 0 });
      }

      setWalletAmount(0);
      setIsRequestSent(true);
      setShowWithdrawModal(false);
      alert("Withdrawal request sent successfully!");
    } catch (error) {
      console.error("Error sending withdrawal request:", error);
      alert("Failed to send withdrawal request. Try again.");
    }
  };

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#555",
          fontSize: "18px",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        Loading wallet details...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #ff7e5f, #feb47b)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "2rem 1rem",
        fontFamily: "Poppins, sans-serif",
        position: "relative",
      }}
    >
      {/* 🔙 Back Button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          border: "none",
          background: "transparent",
          color: "#444",
          fontSize: "14px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        ← Back
      </button>

      {/* 💰 Wallet Card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(12px)",
          borderRadius: "2rem",
          padding: "2.5rem",
          textAlign: "center",
          width: "100%",
          maxWidth: "400px",
          marginTop: "6rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.8rem",
            fontWeight: 600,
            color: "#333",
            marginBottom: "0.5rem",
          }}
        >
          Wallet Balance
        </h2>

        <p
          style={{
            fontSize: "2.8rem",
            fontWeight: 800,
            color: "#22c55e",
            margin: "0.5rem 0",
            textShadow: "0 2px 5px rgba(0,0,0,0.1)",
          }}
        >
          ₹{walletAmount.toFixed(2)}
        </p>

        <p style={{ color: "#555", fontSize: "14px", marginTop: "0.5rem" }}>
          Referral Code:{" "}
          <span
            style={{
              background: "#f3f4f6",
              padding: "4px 10px",
              borderRadius: "10px",
              fontWeight: 600,
              color: "#111",
            }}
          >
            {referralCode}
          </span>
        </p>

        <motion.button
          whileTap={{ scale: 0.95 }}
          disabled={walletAmount === 0 || isRequestSent}
          style={{
            marginTop: "1.5rem",
            background: isRequestSent
              ? "gray"
              : "linear-gradient(to right, #10b981, #22c55e, #16a34a)",
            color: "#fff",
            fontWeight: 500,
            border: "none",
            padding: "10px 24px",
            borderRadius: "999px",
            cursor: walletAmount === 0 ? "not-allowed" : "pointer",
            boxShadow: "0 4px 10px rgba(16,185,129,0.3)",
            transition: "all 0.3s ease",
          }}
          onClick={() => setShowWithdrawModal(true)}
        >
          {isRequestSent ? "Withdrawal Requested" : "Withdraw Balance"}
        </motion.button>

        {/* ✅ Latest paid withdrawal */}
        {paidWithdraw && (
          <div
            style={{
              marginTop: "1.5rem",
              color: "#16a34a",
              background: "rgba(22,163,74,0.1)",
              padding: "12px 15px",
              borderRadius: "10px",
              fontSize: "0.95rem",
              fontWeight: 500,
            }}
          >
            ✅ Your last commission of ₹{paidWithdraw.walletAmount} was successfully paid on{" "}
            {paidWithdraw.requestedAt?.toDate
              ? paidWithdraw.requestedAt.toDate().toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "recently"}
          </div>
        )}

        {/* 📜 Paid Withdrawal History */}
        {paidHistory.length > 1 && (
          <div
            style={{
              marginTop: "1.5rem",
              background: "rgba(255,255,255,0.9)",
              borderRadius: "12px",
              padding: "1rem",
              maxHeight: "150px",
              overflowY: "auto",
              textAlign: "left",
            }}
          >
            <h4
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
                color: "#333",
              }}
            >
              💸 Payment History
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {paidHistory.slice(1).map((p) => (
                <li
                  key={p.id}
                  style={{
                    background: "#f3f4f6",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    marginBottom: "6px",
                    fontSize: "0.9rem",
                    color: "#222",
                  }}
                >
                  ₹{p.walletAmount} paid on{" "}
                  {p.requestedAt?.toDate
                    ? p.requestedAt.toDate().toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>

      {/* 💬 Commission History Table */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          marginTop: "3rem",
          background: "rgba(255,255,255,0.8)",
          backdropFilter: "blur(10px)",
          borderRadius: "2rem",
          padding: "2rem",
          width: "100%",
          maxWidth: "700px",
        }}
      >
        <h3
          style={{
            fontSize: "1.3rem",
            fontWeight: 600,
            color: "#333",
            borderBottom: "2px solid #f0f0f0",
            paddingBottom: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          Commission History
        </h3>

        {commissions.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.95rem",
                color: "#444",
              }}
            >
              <thead>
                <tr style={{ textAlign: "left", color: "#666" }}>
                  <th style={{ paddingBottom: "10px" }}>Amount (₹)</th>
                  <th style={{ paddingBottom: "10px" }}>Status</th>
                  <th style={{ paddingBottom: "10px" }}>Release Date</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      borderTop: "1px solid #eee",
                      transition: "background 0.2s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background = "#fafafa")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <td style={{ padding: "12px 0", fontWeight: 500 }}>
                      {c.commission || 0}
                    </td>
                    <td
                      style={{
                        padding: "12px 0",
                        fontWeight: 600,
                        color:
                          c.status === "released" ? "#16a34a" : "#fb923c",
                      }}
                    >
                      {c.status || "pending"}
                    </td>
                    <td style={{ padding: "12px 0" }}>
                      {c.walletReleaseDate?.toDate
                        ? c.walletReleaseDate
                            .toDate()
                            .toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                        : "N/A"}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p
            style={{
              textAlign: "center",
              color: "#777",
              marginTop: "1rem",
              fontSize: "0.95rem",
            }}
          >
            No commissions found
          </p>
        )}
      </motion.div>

      {/* 💬 Withdraw Popup */}
      {showWithdrawModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              background: "#fff",
              borderRadius: "1.5rem",
              padding: "2rem",
              width: "90%",
              maxWidth: "400px",
              textAlign: "center",
              boxShadow: "0 8px 25px rgba(0,0,0,0.2)",
            }}
          >
            <h3
              style={{
                fontSize: "1.2rem",
                fontWeight: 600,
                color: "#333",
                marginBottom: "1rem",
              }}
            >
              Enter UPI ID or phone number on which you want to get paid
            </h3>

            <input
              type="text"
              placeholder="example@upi or 1234XXXXXX"
              value={upiOrBank}
              onChange={(e) => setUpiOrBank(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 15px",
                borderRadius: "10px",
                border: "1px solid #ddd",
                marginBottom: "1rem",
                outline: "none",
                fontSize: "0.95rem",
              }}
            />

            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                onClick={handleWithdraw}
                style={{
                  background:
                    "linear-gradient(to right, #10b981, #22c55e, #16a34a)",
                  color: "#fff",
                  padding: "10px 20px",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Submit
              </button>
              <button
                onClick={() => setShowWithdrawModal(false)}
                style={{
                  background: "#ddd",
                  color: "#333",
                  padding: "10px 20px",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default WalletPage;
