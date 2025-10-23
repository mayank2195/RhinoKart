// src/context/CartContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { db } from "../firebase"; 
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
} from "firebase/firestore";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const auth = getAuth();

  useEffect(() => {
    if (!auth.currentUser) return;

    const cartRef = collection(db, "users", auth.currentUser.uid, "cart");

    const unsubscribe = onSnapshot(cartRef, async (snapshot) => {
      const items = [];

      for (let docSnap of snapshot.docs) {
        const { productId, quantity, sellerId } = docSnap.data();

        // 🔹 fetch product details from reels
        const productRef = doc(db, "reels", productId);
        const productSnap = await getDoc(productRef);

        // 🔹 fetch seller details if needed
        let seller = {};
        if (sellerId) {
          const sellerRef = doc(db, "sellerDetails", sellerId);
          const sellerSnap = await getDoc(sellerRef);
          if (sellerSnap.exists()) seller = sellerSnap.data();
        }

        if (productSnap.exists()) {
          items.push({
            id: docSnap.id,
            quantity,
            ...productSnap.data(),
            seller, // seller info attached
          });
        }
      }

      setCartItems(items);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  // Add product to cart
  const addToCart = async (product) => {
    if (!auth.currentUser) {
      alert("Please login to add items to cart");
      return;
    }

    const productRef = doc(db, "users", auth.currentUser.uid, "cart", product.id);
    await setDoc(productRef, {
      productId: product.id,
      quantity: 1,
      sellerId: product.sellerId || null,
    }, { merge: true });
  };

  // Remove from cart
  const removeFromCart = async (id) => {
    if (!auth.currentUser) return;
    const productRef = doc(db, "users", auth.currentUser.uid, "cart", id);
    await deleteDoc(productRef);
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
