import React, { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function CheckoutPage({ userId, product }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setName(userData.name || "");
          setAddress(userData.address || "");
          setPhone(userData.phoneNumber || "");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
      setLoading(false);
    };
    fetchUserData();
  }, [userId]);

  const handleProceedToPayment = async () => {
    if (!name || !address) {
      alert("Please fill in all details!");
      return;
    }

    try {
      await updateDoc(doc(db, "users", userId), {
        name,
        address,
      });
      alert("Proceeding to payment...");
      // Yaha Razorpay ka payment integration trigger karega
    } catch (error) {
      console.error(error);
      alert("Error saving details!");
    }
  };

  if (loading) return <p>Loading checkout...</p>;

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "auto" }}>
      <h2>Checkout</h2>
      <h4>Product Details</h4>
      <p><b>{product.name}</b></p>
      <p>Price: ₹{product.price}</p>
      <p>Quantity: {product.quantity || 1}</p>
      <p>Total: ₹{product.price * (product.quantity || 1)}</p>

      <h4>Shipping Details</h4>
      <input
        type="text"
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
      />
      <textarea
        placeholder="Full Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
      />
      <input
        type="tel"
        value={phone}
        disabled
        style={{ width: "100%", padding: "10px", marginBottom: "10px", background: "#eee" }}
      />
      <button onClick={handleProceedToPayment} style={{ marginTop: "10px" }}>
        Proceed to Payment
      </button>
    </div>
  );
}
