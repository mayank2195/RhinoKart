import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth";
import { app } from "../firebase";
import {
  FaStore,
  FaShoppingBag,
  FaHeart,
  FaVideo,
  FaShoppingCart,
  FaChevronLeft,
  FaChevronRight,
  FaSearch,
  FaSignOutAlt,
  FaWallet,
  FaClock,
} from "react-icons/fa";
import "./DisplayPage.css";

const categories = [
  "Men's Wear",
  "Women's Wear",
  "Kids Wear",
  "Innovative Products",
];

const DisplayPage = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [referralCode, setReferralCode] = useState("");
  const [walletAmount, setWalletAmount] = useState(0);
  const db = getFirestore(app);
  const auth = getAuth(app);
  const navigate = useNavigate();
  const scrollRefs = useRef({});

  // ✅ ReferralCode-based unique wallet listener
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    let unsubscribeWallet = null;

    const setupReferralCodeListener = async () => {
      try {
        // Step 1: Find referral code from sellerDetails using email (first fetch)
        const q = query(
          collection(db, "sellerDetails"),
          where("email", "==", user.email)
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
          const sellerData = snap.docs[0].data();
          const refCode = sellerData.referralCode;
          setReferralCode(refCode);

          // Step 2: Real-time listener based on referralCode (unique)
          const refDoc = doc(db, "sellerDetails", refCode);
          unsubscribeWallet = onSnapshot(refDoc, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setWalletAmount(data.walletAmount || 0);
            }
          });
        }
      } catch (error) {
        console.error("Error fetching referralCode wallet:", error);
      }
    };

    setupReferralCodeListener();

    // Cleanup
    return () => {
      if (unsubscribeWallet) unsubscribeWallet();
    };
  }, [db, auth]);

  // ✅ Fetch reels data
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, "reels"));
        const reelsData = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const reelData = { id: docSnap.id, ...docSnap.data() };

            if (reelData.sellerId) {
              const sellerQuery = query(
                collection(db, "sellerDetails"),
                where("userId", "==", reelData.sellerId)
              );
              const sellerSnap = await getDocs(sellerQuery);
              reelData.brandName = !sellerSnap.empty
                ? sellerSnap.docs[0].data().brandName || ""
                : "";
            }
            return reelData;
          })
        );
        setUsers(reelsData);
      } catch (err) {
        console.error("Error fetching reels:", err);
      }
    };

    fetchUsers();
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [db]);

  const handleSearch = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search/${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleBeSellerClick = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please login first.");
      navigate("/login");
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        { role: "seller", email: user.email },
        { merge: true }
      );

      const sellerDetailsRef = doc(db, "sellerDetails", user.uid);
      const sellerDetailsSnap = await getDoc(sellerDetailsRef);

      if (sellerDetailsSnap.exists()) {
        navigate(
          sellerDetailsSnap.data().isVerified ? "/upload" : "/verifydetails"
        );
      } else {
        navigate("/verifydetails");
      }
    } catch (err) {
      console.error("Error in Be a Seller flow:", err);
      navigate("/verifydetails");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout Error:", error.message);
    }
  };

  const scrollLeft = (category) => {
    scrollRefs.current[category]?.scrollBy({ left: -400, behavior: "smooth" });
  };

  const scrollRight = (category) => {
    scrollRefs.current[category]?.scrollBy({ left: 400, behavior: "smooth" });
  };

  const SidebarItems = () => {
    const user = auth.currentUser;
    return (
      <>
       

        <div className="sidebar-item" onClick={() => navigate("/my-orders")}>
          <FaShoppingBag size={22} />
          <span>My Orders</span>
        </div>

        <div className="sidebar-item" onClick={() => navigate("/cart")}>
          <FaShoppingCart size={22} />
          <span>My Cart</span>
        </div>

        <div className="sidebar-item" onClick={() => navigate("/wishlist")}>
          <FaHeart size={22} />
          <span>My Wishlist</span>
        </div>

        <div className="sidebar-item" onClick={() => navigate("/reels")}>
          <FaVideo size={22} />
          <span>Reels</span>
        </div>

        {user?.email === "mayank21047195@gmail.com" && (
          <div className="sidebar-item" onClick={handleBeSellerClick}>
            <FaStore size={22} />
            <span>Be a Seller</span>
          </div>
        )}

        <div
          className="sidebar-item"
          style={{ marginTop: "auto", cursor: "pointer" }}
          onClick={handleLogout}
        >
          <FaSignOutAlt size={22} /> <span>Logout</span>
        </div>
      </>
    );
  };

  return (
    <>
      <div className="page-container light">
        {/* ✅ Referral Code + Wallet Display */}
        <div className="referral-code-box" style={{ textAlign: "center" }}>
          {referralCode && (
            <div>
              <span>
                Your Code: <strong>{referralCode}</strong>
              </span>
            </div>
          )}

          {/* ✅ Wallet amount with clock icon */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "10px",
              marginTop: "6px",
            }}
          >
            <span style={{ fontWeight: "bold", color: "#333" }}>
              Wallet: ₹{walletAmount.toFixed(2)}
            </span>
            <FaClock
              size={18}
              style={{ cursor: "pointer", color: "#444" }}
              title="View Wallet History"
              onClick={() => navigate("/wallet")}
            />
          </div>
        </div>

        {!isMobile && (
          <nav className="sidebar">
            <div className="sidebar-logo">
              <img
                src="/rhino-kart.jpeg"
                alt="Rhinokart Logo"
                className="logo-img"
              />
              <span className="logo-text">RhinoKart</span>
            </div>
            <SidebarItems />
          </nav>
        )}

        {/* ✅ Main content */}
        <main className="main-content">
          {isMobile && (
            <div className="mobile-logo">
              <img
                src="/rhino-kart.png"
                alt="Rhinokart Logo"
                className="logo-img"
              />
              <span className="logo-text">RhinoKart</span>
            </div>
          )}

          {/* ✅ Search Bar */}
          <div className="search-bar-wrapper">
            <form onSubmit={handleSearch} className="search-form">
              <input
                type="text"
                placeholder="Search product by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                type="button"
                className="search-icon-btn"
                onClick={handleSearch}
              >
                <FaSearch />
              </button>
            </form>
          </div>

          {/* ✅ Category-wise reels */}
          {categories.map((category) => {
            const filtered = users.filter(
              (u) =>
                u.category === category &&
                u.outfits?.length > 0 &&
                u.reelUrl
            );

            if (filtered.length === 0) return null;

            return (
              <section key={category} className="category-section">
                <h2 className="category-name">{category}</h2>
                <div className="scroll-container">
                  {!isMobile && (
                    <button
                      className="scroll-btn left"
                      onClick={() => scrollLeft(category)}
                    >
                      <FaChevronLeft />
                    </button>
                  )}
                  <div
                    className="thumbnail-grid horizontal-scroll"
                    ref={(el) => (scrollRefs.current[category] = el)}
                  >
                    {filtered.map((user) => {
                      const firstOutfit = user.outfits?.[0];
                      const primaryImageUrl = firstOutfit?.images?.[0]?.url;
                      return (
                        <div
                          key={user.id}
                          className="product-card4"
                          onClick={() => navigate(`/reel/${user.id}`)}
                        >
                          <div className="image-container">
                            <img
                              src={primaryImageUrl || "/placeholder.png"}
                              alt={firstOutfit?.name || "Product"}
                            />
                          </div>
                          <div className="product-info">
                            <p className="product-title">
                              {firstOutfit?.name}
                            </p>
                            <p
                              className="product-price"
                              style={{
                                color: "red",
                                fontWeight: "bold",
                                fontSize: "18px",
                                margin: "4px 0",
                              }}
                            >
                              ₹{firstOutfit?.price}
                            </p>
                            {firstOutfit?.mainPrice && (
                              <p
                                style={{
                                  fontSize: "14px",
                                  margin: "0",
                                  color: "gray",
                                }}
                              >
                                <span
                                  style={{
                                    textDecoration: "line-through",
                                    marginRight: "6px",
                                  }}
                                >
                                  ₹{firstOutfit.mainPrice}
                                </span>
                                <span
                                  style={{
                                    color: "green",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {Math.round(
                                    ((firstOutfit.mainPrice -
                                      firstOutfit.price) /
                                      firstOutfit.mainPrice) *
                                      100
                                  )}
                                  % OFF
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {!isMobile && (
                    <button
                      className="scroll-btn right"
                      onClick={() => scrollRight(category)}
                    >
                      <FaChevronRight />
                    </button>
                  )}
                </div>
              </section>
            );
          })}
        </main>
      </div>

      {isMobile && <nav className="mobile-sidebar"><SidebarItems /></nav>}
    </>
  );
};

export default DisplayPage;
