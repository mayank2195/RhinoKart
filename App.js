// App.js
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { CartProvider } from "./context/CartContext";
import SearchResultsPage from "./pages/SearchResultsPage";
import Login from "./pages/login";
import PhoneVerification from "./pages/PhoneVerification";
import UploadPage from "./pages/UploadPage";
import ReelPage from "./pages/ReelPage";
import DisplayPage from "./pages/DisplayPage";
import MyOrdersPage from "./pages/MyOrdersPage";
import CartPage from "./pages/CartPage";
import ProfilePage from "./pages/ProfilePage";
import WishlistPage from "./pages/WishlistPage";
import CartDetailsPage from "./pages/CartDetailsPage";
import Signup from "./pages/Signup";
import ViewProduct from "./pages/ViewProduct";
import ProductDetails from "./pages/ProductDetails";
import DetailsPage from "./pages/DetailsPage";

// 🟢 NEW: Import Wallet Page
import WalletPage from "./pages/WalletPage";

import { onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { auth, app } from "./firebase";

function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [hasDetails, setHasDetails] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const db = getFirestore(app);
          const usersRef = doc(db, "users", currentUser.uid);
          const usersSnap = await getDoc(usersRef);

          if (usersSnap.exists()) {
            const data = usersSnap.data();
            setUserRole(data?.role ?? null);
            setPhoneVerified(data?.phoneVerified ?? false);
            setHasDetails(!!(data?.name && data?.address));
          } else {
            setUserRole(null);
            setPhoneVerified(false);
            setHasDetails(false);
          }

          const sellerRef = doc(db, "sellerDetails", currentUser.uid);
          const sellerSnap = await getDoc(sellerRef);
          setIsVerified(
            sellerSnap.exists() ? sellerSnap.data()?.isVerified ?? false : false
          );
        } catch (err) {
          console.error("Error fetching user data:", err);
          setUserRole(null);
          setIsVerified(false);
          setPhoneVerified(false);
          setHasDetails(false);
        }
      } else {
        setUserRole(null);
        setIsVerified(false);
        setPhoneVerified(false);
        setHasDetails(false);
      }

      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  if (checkingAuth) {
    return <div>Loading...</div>;
  }

  return (
    <CartProvider>
      <Router>
        <Routes>
          {/* Landing Decision */}
          <Route
            path="/"
            element={
              !user ? (
                <Navigate to="/login" replace />
              ) : user?.email === "mayank21047195@gmail.com" ? (
                <Navigate to="/upload" replace />
              ) : !hasDetails ? (
                <Navigate to="/details" replace />
              ) : (
                <Navigate to="/display" replace />
              )
            }
          />

          {/* Phone Verification */}
          <Route path="/phone-verification" element={<PhoneVerification />} />

          {/* User Details */}
          <Route path="/details/:productId" element={<DetailsPage />} />

          {/* Orders */}
          <Route path="/my-orders" element={<MyOrdersPage />} />

          {/* Auth */}
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/" replace />}
          />
          <Route
            path="/signup"
            element={!user ? <Signup /> : <Navigate to="/" replace />}
          />

          {/* Buyer Pages */}
          <Route path="/view-product/:reelId" element={<ViewProduct />} />
          <Route path="/product/name/:productName" element={<ProductDetails />} />

          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route
            path="/wishlist"
            element={user ? <WishlistPage /> : <Navigate to="/login" replace />}
          />

          {/* Upload (Admin Only) */}
          <Route
            path="/upload"
            element={
              user?.email === "mayank21047195@gmail.com" ? (
                <UploadPage />
              ) : (
                <Navigate to="/display" replace />
              )
            }
          />

          {/* Display & Reels */}
          <Route
            path="/display"
            element={user ? <DisplayPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/reels"
            element={user ? <ReelPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/reel/:id"
            element={user ? <ReelPage /> : <Navigate to="/login" replace />}
          />

          <Route path="/search/:searchTerm" element={<SearchResultsPage />} />

          {/* Cart */}
          <Route
            path="/cart"
            element={
              !user ? (
                <Navigate to="/login" replace />
              ) : !phoneVerified ? (
                <Navigate to="/phone-verification" replace />
              ) : (
                <CartPage />
              )
            }
          />
          <Route
            path="/cart-details"
            element={
              !user ? (
                <Navigate to="/login" replace />
              ) : !phoneVerified ? (
                <Navigate to="/phone-verification" replace />
              ) : (
                <CartDetailsPage />
              )
            }
          />

          {/* 🟢 NEW: Wallet Page Route */}
          <Route
            path="/wallet"
            element={user ? <WalletPage /> : <Navigate to="/login" replace />}
          />
        </Routes>
      </Router>
    </CartProvider>
  );
}

export default App;
