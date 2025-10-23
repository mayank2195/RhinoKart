import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { getAuth } from "firebase/auth";

import {
  collection,
  query,
  doc,
  where,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

const CartDetailsPage = () => {
  const [cartItems, setCartItems] = useState([]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isUserLoaded, setIsUserLoaded] = useState(false);

  // ✅ Fetch cart items + product details
  useEffect(() => {
    const fetchCartItems = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(collection(db, "carts"), where("userId", "==", user.uid));
      const snap = await getDocs(q);

      let items = [];

      for (const docSnap of snap.docs) {
        const cartData = { id: docSnap.id, ...docSnap.data() };

        // ✅ Fetch product details from reels collection
        if (cartData.productId) {
          const productRef = doc(db, "reels", cartData.productId);
          const productDoc = await getDoc(productRef);

          if (productDoc.exists()) {
            cartData.productDetails = productDoc.data();
          }
        }

        // ✅ Calculate delivery date using carts collection (priority)
        const deliveryDays = Number(cartData.deliveryDays) || 3; // Use cart's deliveryDays if available, else 3
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);
        cartData.estimatedDeliveryDate = deliveryDate.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

        items.push(cartData);
      }

      setCartItems(items);
    };

    fetchCartItems();
  }, []);

  // ✅ Fetch user details
  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setPhoneNumber(data.phoneNumber || "");
          setName(data.name || "");
          setAddress(data.address || "");
        }
      }
      setIsUserLoaded(true);
    };
    fetchUserData();
  }, []);

  const saveDetails = async () => {
    if (!name.trim() || !address.trim()) {
      alert("Please fill in all fields");
      return;
    }

    await setDoc(
      doc(db, "users", auth.currentUser.uid),
      { name, address, phoneNumber },
      { merge: true }
    );

    setIsEditing(false);
    alert("Details updated successfully!");
  };

  // ✅ Calculate total
  const totalPrice = cartItems.reduce(
    (acc, item) => acc + (item.price || 0) * (item.quantity || 1),
    0
  );

  // ✅ Payment
  const handlePayment = async () => {
    if (!name.trim() || !address.trim()) {
      alert("Please enter your details before payment");
      return;
    }

    const options = {
      key: "rzp_test_R9HA39dBh0XKSU",
      amount: totalPrice * 100,
      currency: "INR",
      name: "RhinoKart",
      description: "Cart Payment",
      handler: async function (response) {
        alert("✅ Payment Successful! ID: " + response.razorpay_payment_id);

        // Save payment for all cart items
       for (const item of cartItems) {
  await addDoc(collection(db, "payments"), {
    userId: auth.currentUser.uid,
    reelId: item.productId, // reel ID
    productId: item.productId,
    productName: item.name || item.productDetails?.name,
    productImage: item.imageUrl || item.productDetails?.imageUrl || "",
    reelUrl: item.productDetails?.reelUrl || "", // ✅ Added reel URL
    size: item.size || "", // ✅ Added size
    amount: item.price * (item.quantity || 1),
    deliveryDays: item.deliveryDays || item.productDetails?.deliveryDays || 3,
    paymentId: response.razorpay_payment_id,
    name,
    address,
    phoneNumber,
    timestamp: serverTimestamp(),
  });
}


      },
      prefill: {
        name: name,
        email: auth.currentUser?.email || "test@example.com",
        contact: phoneNumber || "9999999999",
      },
      notes: { address: address },
      theme: { color: "#3399cc" },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "linear-gradient(135deg, #43cea2, #185a9d)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <div
        className="details-container"
        style={{ maxWidth: "800px", width: "100%", height:'100vh' }}
      >
        <h2>Cart Summary</h2>

        {cartItems.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          cartItems.map((item) => (
            <div
              key={item.id}
              className="product-card"
              style={{ marginBottom: "15px" }}
            >
              <img
                src={item.imageUrl || item.productDetails?.imageUrl}
                alt={item.name || item.productDetails?.name}
                style={{ width: "100px", borderRadius: "10px" }}
              />
              <h3>Name: {item.name || item.productDetails?.name}</h3>
              <p>
                <strong>Price:</strong> ₹
                {item.price || item.productDetails?.price}
              </p>
              <p>
                <strong>Quantity:</strong> {item.quantity || 1}
              </p>
              <p>
                <strong>Delivery in:</strong> {item.deliveryDays || 3} days
              </p>
              <p>
                <strong>Estimated Delivery:</strong> {item.estimatedDeliveryDate}
              </p>
              {item.productDetails?.category && (
                <p>
                  <strong>Category:</strong> {item.productDetails.category}
                </p>
              )}
            </div>
          ))
        )}

        <h3>Total: ₹{totalPrice}</h3>
        <hr />

        <h2>User Details</h2>
        {!isUserLoaded ? (
          <p>Loading user details...</p>
        ) : auth.currentUser ? (
          <>
            <p>
              <strong>Phone:</strong> {phoneNumber || "Not provided"}
            </p>
            {isEditing ? (
              <>
                <input
                  type="text"
                  placeholder="Enter Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="Enter Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="input-field"
                />
                <button onClick={saveDetails} className="btn">
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn btn-cancel"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <p>
                  <strong>Name:</strong> {name || "Not provided"}
                </p>
                <p>
                  <strong>Address:</strong> {address || "Not provided"}
                </p>
                <button onClick={() => setIsEditing(true)} className="btn">
                  Edit
                </button>
                {cartItems.length > 0 && (
                  <button onClick={handlePayment} className="btn">
                    Proceed to Payment
                  </button>
                )}
              </>
            )}
          </>
        ) : (
          <p>Please log in to view or update your details.</p>
        )}
      </div>
    </div>
  );
};

export default CartDetailsPage;
