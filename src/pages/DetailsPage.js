import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";

const DetailsPage = () => {
  const { productId: reelId } = useParams();
  const [outfits, setOutfits] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [reelUrl, setReelUrl] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isUserLoaded, setIsUserLoaded] = useState(false);

  // ✅ Fetch outfits for this reel
  useEffect(() => {
    const fetchOutfits = async () => {
      if (!reelId) return;
      try {
        const reelRef = doc(db, "reels", reelId);
        const reelSnap = await getDoc(reelRef);
        if (reelSnap.exists()) {
          const data = reelSnap.data();
          setReelUrl(data.reelUrl || "");

          if (Array.isArray(data.outfits)) {
            const formattedOutfits = data.outfits.map((o, i) => ({
              ...o,
              id: `${reelSnap.id}_${i}`,
              imageUrl: o.images?.[0]?.url || "/placeholder.png",
              deliveryDays: o.deliveryDays || 5,
            }));
            setOutfits(formattedOutfits);
          }
        }
      } catch (error) {
        console.error("❌ Error fetching outfits:", error);
      }
    };
    fetchOutfits();
  }, [reelId]);

  // ✅ Fetch user details
  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (!auth.currentUser) return;
        const ref = doc(db, "users", auth.currentUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const u = snap.data();
          setName(u.name || "");
          setPhoneNumber(u.phoneNumber || "");
          setAddress(u.address || "");
        }
      } catch (e) {
        console.error("Error fetching user:", e);
      } finally {
        setIsUserLoaded(true);
      }
    };
    fetchUser();
  }, []);

  // ✅ Delivery Date Calculation
  const calculateDeliveryDate = (days) => {
    const current = new Date();
    current.setDate(current.getDate() + Number(days || 0));
    return current.toLocaleDateString("en-GB");
  };

  // ✅ Handle outfit select
  const handleSelect = (id) => {
    setSelectedId(id);
    setSelectedProduct(outfits.find((p) => p.id === id) || null);
    setSelectedSize("");
  };

  // ✅ Save user details
  const saveDetails = async () => {
    if (!name.trim() || !address.trim()) return alert("Please fill in all fields");
    await setDoc(doc(db, "users", auth.currentUser.uid), { name, address }, { merge: true });
    setIsEditing(false);
    alert("Details updated successfully!");
  };

  // ✅ Payment + Firestore write
  const handlePayment = async () => {
    if (!selectedProduct) return alert("Please select a product first!");
    if (!selectedSize) return alert("Please select a size!");
    if (!name.trim() || !address.trim()) return alert("Please enter your details before payment");

    const price = selectedProduct.price || 500;
    const productName = selectedProduct.name || "Unknown";
    const productImage = selectedProduct.imageUrl || "";
    const deliveryDays = selectedProduct.deliveryDays || 5;

    const options = {
      key: "rzp_test_R9HA39dBh0XKSU",
      amount: price * 100,
      currency: "INR",
      name: "RhinoKart",
      description: `${productName} - Size: ${selectedSize}`,
      image: productImage,
      handler: async (response) => {
        try {
          alert("✅ Payment Successful! ID: " + response.razorpay_payment_id);

          // ✅ Store payment info
          const payRef = await addDoc(collection(db, "payments"), {
            userId: auth.currentUser.uid,
            reelId,
            reelUrl,
            productId: selectedProduct.id,
            productName,
            productImage,
            size: selectedSize,
            amount: price,
            deliveryDays,
            paymentId: response.razorpay_payment_id,
            name,
            address,
            phoneNumber,
            referralCode: referralCode || null,
            timestamp: serverTimestamp(),
          });
          console.log("✅ Payment saved:", payRef.id);

          // ✅ Commission logic
          if (referralCode.trim()) {
            const commission = price * 0.1;

            // Wallet release date (deliveryDays + 3 days later)
            const releaseDate = new Date();
            releaseDate.setDate(releaseDate.getDate() + deliveryDays + 3);

            // ✅ Store as Firestore Timestamp
            const walletReleaseTimestamp = Timestamp.fromDate(releaseDate);

            await addDoc(collection(db, "commissions"), {
              codee: referralCode.trim(),
              commission,
              paymentId: response.razorpay_payment_id,
              amount: price,
              buyerId: auth.currentUser.uid,
              productName,
              paymentDate: serverTimestamp(),
              walletReleaseDate: walletReleaseTimestamp, // ✅ FIXED
              isAddedToWallet: false,
              status: "pending",
            });

            // ✅ Ensure seller exists
            const q = query(collection(db, "sellerDetails"), where("codee", "==", referralCode.trim()));
            const snap = await getDocs(q);

            if (!snap.empty) {
              const sellerRef = snap.docs[0].ref;
              const sellerData = snap.docs[0].data();
              if (sellerData.walletAmount === undefined) {
                await updateDoc(sellerRef, { walletAmount: 0 });
              }
              console.log("✅ Commission linked to seller:", referralCode);
            } else {
              console.warn("⚠️ Referral code not found in sellerDetails!");
            }
          }
        } catch (err) {
          console.error("❌ Error during payment handler:", err);
          alert("Error saving data. Check console.");
        }
      },
      prefill: {
        name,
        email: auth.currentUser?.email || "test@example.com",
        contact: phoneNumber || "9999999999",
      },
      theme: { color: "#3399cc" },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #ff7e5f, #feb47b)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px",
        gap: "30px",
      }}
    >
      {/* Outfit Selection */}
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "20px",
          width: "400px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        <h2>Select Outfit</h2>
        <select
          value={selectedId}
          onChange={(e) => handleSelect(e.target.value)}
          style={{ padding: "8px", borderRadius: "5px", width: "100%" }}
        >
          <option value="">-- Select Outfit --</option>
          {outfits.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {selectedProduct && (
          <div style={{ marginTop: "20px" }}>
            <img
              src={selectedProduct.imageUrl}
              alt={selectedProduct.name}
              style={{ width: "100%", borderRadius: "10px" }}
            />
            <h3>{selectedProduct.name}</h3>
            <p><strong>Price:</strong> ₹{selectedProduct.price}</p>
            <p><strong>Delivery Days:</strong> {selectedProduct.deliveryDays}</p>
            <p>
              <strong>Delivery Date:</strong>{" "}
              {calculateDeliveryDate(selectedProduct.deliveryDays)}
            </p>

            {selectedProduct.sizes?.length > 0 && (
              <div style={{ marginTop: "10px" }}>
                <label><strong>Select Size:</strong></label>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  style={{ marginLeft: "10px", padding: "6px" }}
                >
                  <option value="">-- Select Size --</option>
                  {selectedProduct.sizes.map((s, i) => (
                    <option key={i} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User + Payment */}
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "20px",
          width: "400px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        <h2>User Details</h2>
        {!isUserLoaded ? (
          <p>Loading...</p>
        ) : auth.currentUser ? (
          <>
            <p><strong>Phone:</strong> {phoneNumber || "Not provided"}</p>
            {isEditing ? (
              <>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  style={{ width: "100%", padding: "8px", margin: "6px 0" }}
                />
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Address"
                  style={{ width: "100%", padding: "8px", margin: "6px 0" }}
                />
                <button onClick={saveDetails} style={{ marginRight: "10px" }}>
                  Save
                </button>
                <button onClick={() => setIsEditing(false)}>Cancel</button>
              </>
            ) : (
              <>
                <p><strong>Name:</strong> {name || "Not provided"}</p>
                <p><strong>Address:</strong> {address || "Not provided"}</p>
                <input
                  type="text"
                  placeholder="Enter Referral Code (optional)"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  style={{ width: "100%", padding: "8px", margin: "10px 0" }}
                />
                <button onClick={() => setIsEditing(true)} style={{ marginRight: "10px" }}>
                  Edit Details
                </button>
                <button onClick={handlePayment}>Proceed to Payment</button>
              </>
            )}
          </>
        ) : (
          <p>Please log in to continue.</p>
        )}
      </div>
    </div>
  );
};

export default DetailsPage;
