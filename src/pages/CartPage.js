// src/pages/CartPage.js
import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { FaTrash, FaPlus, FaMinus } from "react-icons/fa";
import "./CartPage.css";

const CartPage = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user || !user.uid) {
      setCartItems([]);
      setLoading(false);
      return;
    }

    const cartRef = collection(db, "carts");
    const q = query(cartRef, where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setCartItems(items);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching cart:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 🗑️ Remove item
  const removeFromCart = async (id) => {
    if (!user || !id) return;
    try {
      const ref = doc(db, "carts", id);
      await deleteDoc(ref);
    } catch (err) {
      console.error("Error removing item:", err);
    }
  };

  // ➕ Increase quantity
  const increaseQty = async (item) => {
    if (!user || !item?.id) return;
    try {
      const itemRef = doc(db, "carts", item.id);
      await updateDoc(itemRef, { quantity: (item.quantity || 1) + 1 });
    } catch (err) {
      console.error("Error increasing qty:", err);
    }
  };

  // ➖ Decrease quantity
  const decreaseQty = async (item) => {
    if (!user || !item?.id) return;
    if ((item.quantity || 1) <= 1) return; // minimum 1
    try {
      const itemRef = doc(db, "carts", item.id);
      await updateDoc(itemRef, { quantity: item.quantity - 1 });
    } catch (err) {
      console.error("Error decreasing qty:", err);
    }
  };

  // 💰 Total Price
  const totalPrice = cartItems.reduce(
    (acc, item) => acc + (item.price || 0) * (item.quantity || 1),
    0
  );

  if (loading) {
    return <p className="loading">Loading cart...</p>;
  }

  return (
    <div className="cart-background">
    <div className="cart-container">
      <h2 className="cart-title">🛒 My Cart</h2>

      {cartItems.length === 0 ? (
        <p>Your cart is empty</p>
      ) : (
        <>
          {cartItems.map((item) => (
            <div key={item.id} className="cart-item">
              {/* Left section with image + quantity controls */}
              <div className="cart-left">
                <div className="cart-image-section">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="cart-image"
                    />
                  ) : (
                    <div className="cart-image placeholder">No Image</div>
                  )}

                  <div className="qty-controls">
                    <button onClick={() => decreaseQty(item)}>
                      <FaMinus />
                    </button>
                    <span>{item.quantity || 1}</span>
                    <button onClick={() => increaseQty(item)}>
                      <FaPlus />
                    </button>
                  </div>
                </div>
              </div>

              {/* Info Section */}
              <div
                className="cart-info"
                onClick={() =>
                  item.productId &&
                  (window.location.href = `/view-product/${item.productId}`)
                }
              >
                <h3>{item.name}</h3>
                <p>₹{item.price}</p>
              </div>

              {/* Delete Button */}
              <div className="cart-actions">
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="delete-btn"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}

          {/* Cart Summary */}
          <div className="cart-summary">
            <h3>Total: ₹{totalPrice}</h3>
            <button
              className="checkout-btn"
              onClick={async () => {
                if (!user || !user.uid) {
                  alert("Please login to continue");
                  return;
                }

                try {
                  const userRef = doc(db, "users", user.uid);
                  const userDoc = await getDoc(userRef);
                  const isVerified =
                    userDoc.exists() && userDoc.data().isVerified === true;

                  if (!isVerified) {
                    window.location.href = "/phone-verification";
                    return;
                  }

                  // ✅ If verified, go to details page
                  window.location.href = "/cart-details";
                } catch (err) {
                  console.error("Error checking user verification:", err);
                  alert("Something went wrong. Try again.");
                }
              }}
            >
              Proceed to Payment
            </button>
          </div>
        </>
      )}
    </div>
    </div>
  );
};

export default CartPage;
