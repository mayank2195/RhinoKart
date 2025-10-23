// src/pages/ReelPage.js
import React, { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  addDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  deleteDoc,
  increment,
  query,    
  orderBy 
} from "firebase/firestore";
import { db, auth  } from "../firebase";
import { useParams, useNavigate } from "react-router-dom";
import {
 FaSignOutAlt,
FaShoppingCart,
FaHeart,
FaVideo,
FaWhatsapp,
FaFacebook,
FaTwitter, 
FaTelegram,
FaLinkedin,
FaEnvelope,
 FaLink,
 FaInstagram,
 FaReddit,
 FaTimes

} from "react-icons/fa";
import { signOut, getAuth } from "firebase/auth";
import "./ReelPage.css";
import "./DisplayPage.css";
/* -------- Custom Cart + Heart Icon -------- */
function CartHeartIcon({ size = 28, color = "white", active = false, heartColor = "#ef4444" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 6h2l1.2 8.5a2 2 0 0 0 2 1.7h7.8a2 2 0 0 0 2-1.6L19.8 8H6.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="19" r="1.6" stroke={color} strokeWidth={1.5} />
      <circle cx="17" cy="19" r="1.6" stroke={color} strokeWidth={1.5} />
      <path
        d="M12 8.2c-1.2-1.6-4-1.2-4 1.2 0 1.7 4 3.8 4 3.8s4-2.1 4-3.8c0-2.4-2.8-2.8-4-1.2z"
        fill={active ? heartColor : "none"}
        stroke={active ? heartColor : color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function FireIcon({ size = 28, active = false, color = "white", flameColor = "orange" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill={active ? flameColor : "none"}
      stroke={color}
      strokeWidth="1"
    >
      <path
        fillRule="evenodd"
        d="M13.5 4.938a7 7 0 1 1-9.006 1.737c.202-.257.59-.218.793.039.278.352.594.672.943.954.332.269.786-.049.773-.476a5.977 5.977 0 0 1 .572-2.759 6.026 6.026 0 0 1 2.486-2.665c.247-.14.55-.016.677.238A6.967 6.967 0 0 0 13.5 4.938ZM14 12a4 4 0 0 1-4 4c-1.913 0-3.52-1.398-3.91-3.182-.093-.429.44-.643.814-.413a4.043 4.043 0 0 0 1.601.564c.303.038.531-.24.51-.544a5.975 5.975 0 0 1 1.315-4.192.447.447 0 0 1 .431-.16A4.001 4.001 0 0 1 14 12Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CommentIcon({ size = 28, color = "currentColor" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      fill={color}
    >
      <path d="M256 32C114.6 32 0 125.1 0 240c0 49.9 21.1 95.6 56 131.3V480c0 8.8 10.7 13.2 17 6.7L128 432h128c141.4 0 256-93.1 256-208S397.4 32 256 32zM272 288H144c-8.8 0-16-7.2-16-16s7.2-16 16-16h128c8.8 0 16 7.2 16 16s-7.2 16-16 16zm0-64H144c-8.8 0-16-7.2-16-16s7.2-16 16-16h128c8.8 0 16 7.2 16 16s-7.2 16-16 16z"/>
    </svg>
  );
}
function ShareIcon({ size = 28, color = "currentColor" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color}
    >
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.03-.47-.09-.7l7.05-4.11c.53.5 1.23.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.8 9 6 9 4.34 9 3 10.34 3 12s1.34 3 3 3c.8 0 1.5-.31 2.04-.81l7.12 4.17c-.05.21-.08.43-.08.64 0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3z"/>
    </svg>
  );
}


const ReelsPage = () => {
  const [reels, setReels] = useState([]);
  const [likedReels, setLikedReels] = useState({});
  const [wishlistReels, setWishlistReels] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [currentReelComments, setCurrentReelComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [activeReelId, setActiveReelId] = useState(null);
  const [userName, setUserName] = useState("");

  const currentUser = auth.currentUser;
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("All");

  /* -------- Fetch seller name -------- */
  useEffect(() => {
  const fetchReels = async () => {
    setLoading(true);
    try {
      const reelsRef = collection(db, "reels");

      // ✅ Get reels ordered by createdAt (latest first)
      const q = query(reelsRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      let data = querySnapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          reelId: docSnap.id,
          sellerId: d.sellerId,
          ...d,
        };
      });

      // ✅ Shuffle only if no fixed ID (means normal feed open)
      if (!id) {
        let shuffled = [];

        // Check if we already have shuffle in sessionStorage
        const storedShuffle = sessionStorage.getItem("reelsOrder");

        if (storedShuffle) {
          const savedOrder = JSON.parse(storedShuffle);
          // Reorder data based on saved order
          shuffled = savedOrder
            .map((rid) => data.find((r) => r.reelId === rid))
            .filter(Boolean);
        } else {
          // First time → shuffle now and save order
          shuffled = [...data];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          sessionStorage.setItem(
            "reelsOrder",
            JSON.stringify(shuffled.map((r) => r.reelId))
          );
        }

        data = shuffled;
      } else {
        // ✅ If id present, rotate array so that reel with id is first
        const startIndex = data.findIndex((r) => r.reelId === id);
        if (startIndex !== -1) {
          data = [...data.slice(startIndex), ...data.slice(0, startIndex)];
        }
      }

      // ✅ Fetch product + seller data
      const reelsWithData = await Promise.all(
        data.map(async (reel) => {
          let productData = null;
          let sellerDisplayName = "Unknown Seller";

          if (reel.productId) {
            try {
              const productSnap = await getDoc(doc(db, "products", reel.productId));
              if (productSnap.exists()) productData = productSnap.data();
            } catch (err) {
              console.error(err);
            }
          }

          if (reel.sellerId) {
            try {
              const sellerSnap = await getDoc(doc(db, "sellerDetails", reel.sellerId));
              if (sellerSnap.exists()) {
                sellerDisplayName =
                  sellerSnap.data().displayName || "Unknown Seller";
              }
            } catch (err) {
              console.error(err);
            }
          }

          return { ...reel, productData, sellerDisplayName };
        })
      );

      setReels(reelsWithData);

      // ✅ liked status
      const likedStatus = {};
      reelsWithData.forEach((reel) => {
        if (reel.likedBy?.includes(currentUser?.uid)) {
          likedStatus[reel.reelId] = true;
        }
      });
      setLikedReels(likedStatus);

      // ✅ wishlist
      if (currentUser) {
        const wishlistSnapshot = await getDocs(
          collection(db, "users", currentUser.uid, "wishlist")
        );
        const wishlistStatus = {};
        wishlistSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          wishlistStatus[data.reelId] = true;
        });
        setWishlistReels(wishlistStatus);
      }
    } catch (error) {
      console.error("Error fetching reels:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchReels();
}, [currentUser, id]);

  /* -------- Like -------- */
  const handleLogout = async () => {
  try {
    await signOut(auth);
    navigate("/login"); // redirect to login page after logout
  } catch (error) {
    console.error("Logout Error:", error.message);
  }
};

  const handleLike = async (reel) => {
    if (!currentUser) return;
    const reelRef = doc(db, "reels", reel.reelId);
    let newLikedBy = [...(reel.likedBy || [])];
    let newLikes = reel.likes || 0;

    if (likedReels[reel.reelId]) {
      newLikedBy = newLikedBy.filter((uid) => uid !== currentUser.uid);
      newLikes = Math.max(0, newLikes - 1);
    } else {
      newLikedBy.push(currentUser.uid);
      newLikes += 1;
    }

    await updateDoc(reelRef, { likedBy: newLikedBy, likes: newLikes });
    setReels((prev) =>
      prev.map((r) =>
        r.reelId === reel.reelId ? { ...r, likedBy: newLikedBy, likes: newLikes } : r
      )
    );
    setLikedReels((prev) => ({
      ...prev,
      [reel.reelId]: !likedReels[reel.reelId],
    }));
  };
    // Filter reels by category
  const filteredReels =
    selectedCategory === "All"
      ? reels
      : reels.filter(
          (reel) =>
            reel.category === selectedCategory || 
            reel.productData?.category === selectedCategory
        );
  /* -------- Wishlist toggle (Add/Remove) -------- */
  const handleWishlist = async (reel) => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return alert("Please login to manage your wishlist");

    const outfits = reel.outfits || [];
    if (outfits.length === 0) return alert("No products found in this reel");

    const reelId = reel.reelId;
    const isWishlisted = !!wishlistReels[reelId];

    if (isWishlisted) {
      // --- LOGIC TO REMOVE FROM WISHLIST ---
      try {
        for (let i = 0; i < outfits.length; i++) {
          // Construct the same unique document ID used when adding
          const docId = `${reelId}_${i}`;
          const wishlistRef = doc(db, "users", currentUser.uid, "wishlist", docId);
          await deleteDoc(wishlistRef); // Delete the document from Firestore
        }

        // Update local state to reflect the removal (icon turns white)
        setWishlistReels((prev) => {
          const newState = { ...prev };
          delete newState[reelId]; // Remove the reelId key from the state object
          return newState;
        });
        console.log("All outfits from this reel removed from wishlist!");

      } catch (err) {
        console.error("Error removing from wishlist:", err);
        alert("Failed to remove from wishlist.");
      }

    } else {
      // --- LOGIC TO ADD TO WISHLIST (Your original code) ---
      try {
        for (let i = 0; i < outfits.length; i++) {
          const outfit = outfits[i];
          const docId = `${reelId}_${i}`;
          const wishlistRef = doc(db, "users", currentUser.uid, "wishlist", docId);

          await setDoc(wishlistRef, {
            reelId: reelId,
            outfitIndex: i,
            sellerId: reel.sellerId,
            reelUrl: reel.reelUrl,
            productName: outfit.name || "",
            price: outfit.price || "",
            imageUrl: outfit.imageUrl || "",
            sizes: outfit.sizes || [],
            colors: outfit.colors || [],
            timestamp: serverTimestamp(),
          });
        }

        // Update local state to reflect the addition (icon turns red)
        setWishlistReels((prev) => ({
          ...prev,
          [reelId]: true,
        }));
        

      } catch (err) {
        console.error("Error adding to wishlist:", err);
        alert("Failed to add to wishlist.");
      }
    }
  };


  /* -------- Comments -------- */
  const openComments = (reelId) => {
  setActiveReelId(reelId);
  setShowComments(true);

  const commentsRef = collection(db, "reels", reelId, "comments");

  const unsubscribe = onSnapshot(commentsRef, (snapshot) => {
    const commentsData = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds);
    setCurrentReelComments(commentsData);
  });

  return unsubscribe; // store and call later in useEffect cleanup if needed
};


// ------------------ ADD COMMENT ------------------
const addComment = async () => {
  if (!newComment.trim() || !currentUser) return;

  // 🔹 Fetch displayName from sellerDetails collection
  const sellerRef = doc(db, "sellerDetails", currentUser.uid);
  const sellerSnap = await getDoc(sellerRef);

  let displayName = "Unknown User";
  if (sellerSnap.exists() && sellerSnap.data().displayName) {
    displayName = sellerSnap.data().displayName;
  }

  // 🔹 Add comment to the reel's comments subcollection
  const commentsRef = collection(db, "reels", activeReelId, "comments");
  await addDoc(commentsRef, {
    userId: currentUser.uid,
    userName: displayName, // ✅ save fetched username
    text: newComment.trim(),
    timestamp: serverTimestamp(),
  });

  // 🔹 Increment commentsCount in reel doc
  const reelRef = doc(db, "reels", activeReelId);
  await updateDoc(reelRef, {
    commentsCount: increment(1),
  });

  setNewComment("");
};
const closeComments = () => {
  setShowComments(false);
};
useEffect(() => {
  const handleWheel = (e) => {
    if (showComments) {
      const commentsOverlay = document.querySelector(".comments-overlay");
      if (commentsOverlay && commentsOverlay.contains(e.target)) {
        return; // Ignore scroll inside overlay
      }
      closeComments(); // Only close if outside
    }
  };

  const handleKeyDown = (e) => {
    if (!showComments) return;

    // ✅ Ignore keys if input box is focused
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")) {
      return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      closeComments();
    }
  };

  window.addEventListener("wheel", handleWheel, { passive: true });
  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("wheel", handleWheel);
    window.removeEventListener("keydown", handleKeyDown);
  };
}, [showComments]);
 // <-- add dependency here
const [showShare, setShowShare] = useState(false);
const [shareUrl, setShareUrl] = useState("");



/* -------- Share -------- */
const handleShare = (reelId) => {
  const url = `${window.location.origin}/reels/${reelId}`;
  setShareUrl(url);
  setShowShare(true);
};



// For managing multiple video refs
const videoRefs = React.useRef([]);

const togglePlayPause = (videoIndex) => {
  const video = videoRefs.current[videoIndex];
  if (video) {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }
};

  /* -------- Buy Now Redirect -------- */
const handleBuyNow = async (reel) => {
  if (!currentUser) {
    alert("Please login to continue");
    return navigate("/login");
  }

  const outfit = reel.outfits?.[0];
  if (!outfit) {
    alert("No product found in this reel.");
    return;
  }

  try {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);

    let isVerified = userSnap.exists() ? userSnap.data()?.isVerified || false : false;

    const productId = reel.productId || outfit.productId || reel.reelId;

    if (!isVerified) {
      // Redirect to phone verification page
      return navigate("/phone-verification", {
        state: {
          redirectTo: "/details/" + productId,
          product: {
            name: outfit.name,
            price: outfit.price,
            imageUrl: outfit.imageUrl,
            sizes: outfit.sizes || [],
            colors: outfit.colors || [],
          },
          productId,
          sellerId: reel.sellerId,
        },
      });
    }

    // If already verified, go to product details
    navigate(`/details/${productId}`, {
      state: {
        product: {
          name: outfit.name,
          price: outfit.price,
          imageUrl: outfit.imageUrl,
          sizes: outfit.sizes || [],
          colors: outfit.colors || [],
        },
        productId,
        sellerId: reel.sellerId,
      },
    });
  } catch (error) {
    console.error("Error checking verification:", error);
    alert("Something went wrong. Try again.");
  }
};



  const handleScroll = (e) => {
    const newIndex = Math.round(e.target.scrollTop / window.innerHeight);
    setCurrentIndex(newIndex);
  };

  if (loading) return <div className="loading">Loading reels...</div>;

  return (
    <div className="page-container">
      {/* Left Sidebar */}
      {/* Left Sidebar */}
<nav className="sidebar">
  <div className="sidebar-item" onClick={() => navigate("/cart")}>
    <FaShoppingCart size={22} /> <span>My Cart</span>
  </div>
  <div className="sidebar-item" onClick={() => navigate("/my-orders")}>
    <FaShoppingCart size={22} /> <span>My Orders</span>
  </div>
  <div className="sidebar-item" onClick={() => navigate("/reels")}>
    <FaVideo size={22} /> <span>Reels</span>
  </div>
  <div className="sidebar-item" onClick={() => navigate("/wishlist")}>
    <FaHeart size={22} /> <span>Wishlist</span>
  </div>
   <div
    className="sidebar-item"
    style={{ marginTop: "auto", cursor: "pointer" }}
    onClick={handleLogout}
  >
    <FaSignOutAlt size={22} /> <span>Logout</span>
  </div>
</nav>

      {/* Main Content */}
  <main className="main-content">
  <div className="reel-container" onScroll={handleScroll}  hide-scrollbar style={{ position: "relative" }}>
    
    {/* ✅ Fixed Filter Bar */}
    <div
      style={{
        position: "fixed",   // 👈 fixed so always visible
        top: "0px",         // 👈 navbar ke niche (agar navbar 60px height ka hai)
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        background: "rgba(255, 255, 255, 0.7)", // 👈 semi-transparent
        backdropFilter: "blur(6px)",            // 👈 glass effect
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <select
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
        style={{
          padding: "6px 10px",
          borderRadius: "8px",
          color:"white",
        fontSize:"25px",
          border: "1px solid #ccc",
          background: "black",
        }}
      >
        <option value="All">All</option>
        <option value="Men's Wear">Men's Wear</option>
        <option value="Women's Wear">Women's Wear</option>
        <option value="Kids Wear">Kids Wear</option>
      </select>
    </div>

    {/* ✅ Reels */}
    {filteredReels.map((reel, index) => (
      <div key={reel.reelId} className="reel">
        <video
          ref={(el) => (videoRefs.current[index] = el)}
          src={reel.reelUrl}
          controls
          controlsList="nodownload noplaybackrate nofullscreen noremoteplayback"
          disablePictureInPicture
          autoPlay={index === currentIndex}
          muted
          loop
          className="reel-video"
          onClick={() => togglePlayPause(index)}
          onDoubleClick={() => handleLike(reel)}
        />
<div className="product-details-bottom">
  {/* Seller Name */}
  <span
    style={{
      fontWeight: "bold",
      color: "white",
      cursor: "pointer",
    }}
    onClick={() =>
      reel.sellerId
        ? navigate(`/profile/${reel.sellerId}`)
        : alert("Seller info not available")
    }
  >
    Seller: {reel.sellerDisplayName}
  </span>

  {/* We use a small function here to define 'outfit' once */}
  {(() => {
    const outfit = reel.outfits?.[0]; // Helper variable for the product

    return (
      <>
        <p className="product-name" style={{ color: "lightblue" }}>
          Product: {outfit?.name || "No name"}
        </p>

        {/* --- START: New Price Display Logic --- */}
        {outfit ? (
          <>
            {/* Discounted Price */}
            <p
              className="product-price"
              style={{
                color: "white",
                fontWeight: "bold",
                fontSize: "18px",
                margin: "4px 0",
              }}
            >
              ₹{outfit.price}
            </p>

            {/* Original Price (strikethrough) + Discount % */}
            {outfit.mainPrice && (
              <p
                style={{
                  fontSize: "14px",
                  margin: "0",
                  color: "lightgray",
                }}
              >
                <span style={{ textDecoration: "line-through", marginRight: "8px" }}>
                  ₹{outfit.mainPrice}
                </span>
                <span style={{ color: "#4ade80", fontWeight: "bold" }}>
                  {Math.round(
                    ((outfit.mainPrice - outfit.price) / outfit.mainPrice) * 100
                  )}% OFF
                </span>
              </p>
            )}
          </>
        ) : (
          <p className="product-price">Price: N/A</p>
        )}
        {/* --- END: New Price Display Logic --- */}
      </>
    );
  })()}

  {/* Buttons */}
  <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
    <button
      className="action-btn view-product-btn"
      onClick={() => navigate(`/view-product/${reel.reelId}`)}
    >
      View Product
    </button>
    <button
      className="action-btn buy-now-btn"
      onClick={() => handleBuyNow(reel)}
    >
      Buy Now
    </button>
  </div>
</div>
               
            
              {/* Right Actions */}
              <div className="reel-actions">
                <div className="like-button-wrapper" style={{ textAlign: "center" }}>
  <button
    onClick={() => handleLike(reel)}
    style={{ background: "none", border: "none", cursor: "pointer" }}
  >
    <FireIcon
      size={40}
      active={!!likedReels[reel.reelId]}
      flameColor="orange"
    />
  </button>
  <div
    style={{
      color: "white",
      fontSize: "14px",
      marginTop: "4px",
      fontWeight: "bold",
    }}
  >
    {reel.likes || 0}
  </div>
</div>


               
  {/* Comment Button */}
  <div style={{ textAlign: "center" }}>
    <button
      onClick={() => openComments(reel.reelId)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "lightblue",
        
      }}
    >
      <CommentIcon size={32} color="lightblue" />
      <span style={{ fontSize: "14px", marginTop: "4px" }}>
        {reel.commentsCount || 0}
      </span>
    </button>
  </div>


                <button onClick={() => handleShare(reel.reelId)}>
                  <ShareIcon size={32} color="white" />

                </button>
                <button onClick={() => handleWishlist(reel)}>
                  <CartHeartIcon
                    size={48}
                    active={!!wishlistReels[reel.reelId]}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Comments Overlay */}
      {/* Comments Overlay */}
      {showComments && (
  <div className="comments-overlay">
    <div className="comments-header">
  <span>Comments</span>
  <button className="button2" onClick={closeComments} style={{ background: "none", border: "none", cursor: "pointer" }}>
    <FaTimes size={20} color="#3b2f2f" />
  </button>
</div>

    <div className="comments-list">
      {currentReelComments.length > 0 ? (
        currentReelComments.map((comment) => (
          <div key={comment.id} className="comment-item">
            <div className="comment-avatar">
              {comment.userPhotoURL ? (
                <img
                  src={comment.userPhotoURL}
                  alt={comment.userName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : null}
            </div>
            <div className="comment-content">
              <strong>{comment.userName}</strong>
              <p>{comment.text}</p>
              <div className="comment-actions">
                <span>{new Date(comment.timestamp?.seconds * 1000).toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))
      ) : (
        <p>No comments yet</p>
      )}
    </div>
    <div className="comment-input">
      <input
        type="text"
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        placeholder="Write a comment..."
      />
      <button onClick={addComment}>➤</button>
    </div>
  </div>
)}

{showShare && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex:"10001",
      background: "rgba(0,0,0,0.6)", // dark overlay
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 3000,
    }}
  >
    {/* Center Box */}
    <div
      style={{
        width: "80%",
        maxWidth: "500px",
        height: "70%",
        background: "#121212",
        color: "#fff",
        borderRadius: "16px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 4px 20px rgba(0,0,0,0.9)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>Share</h3>
        <button
  onClick={() => setShowShare(false)}
  style={{
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "2px solid #bbb",
    background: "#1e1e1e",
    color: "#bbb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    transition: "all 0.2s ease",
  }}
  onMouseEnter={e => {
    e.currentTarget.style.background = "#333";
    e.currentTarget.style.color = "#fff";
  }}
  onMouseLeave={e => {
    e.currentTarget.style.background = "#1e1e1e";
    e.currentTarget.style.color = "#bbb";
  }}
>
  <FaTimes size={22} />
</button>

      </div>

      {/* Share Icons */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
          justifyItems: "center",
          alignItems: "center",
        }}
      >
        {[
          {
            icon: <FaLink />,
            name: "Copy",
            color: "#bbb",
            action: () => {
              navigator.clipboard.writeText(shareUrl);
              alert("Link copied!");
              setShowShare(false);
            },
          },
          {
            icon: <FaWhatsapp />,
            name: "WhatsApp",
            color: "#25D366",
            action: () =>
              window.open(
                `https://wa.me/?text=${encodeURIComponent(shareUrl)}`,
                "_blank"
              ),
          },
          {
            icon: <FaFacebook />,
            name: "Facebook",
            color: "#1877F2",
            action: () =>
              window.open(
                `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                  shareUrl
                )}`,
                "_blank"
              ),
          },
          {
            icon: <FaTwitter />,
            name: "Twitter",
            color: "#1DA1F2",
            action: () =>
              window.open(
                `https://twitter.com/intent/tweet?url=${encodeURIComponent(
                  shareUrl
                )}&text=Check this out!`,
                "_blank"
              ),
          },
          {
            icon: <FaTelegram />,
            name: "Telegram",
            color: "#0088cc",
            action: () =>
              window.open(
                `https://t.me/share/url?url=${encodeURIComponent(
                  shareUrl
                )}&text=Check this out!`,
                "_blank"
              ),
          },
          {
            icon: <FaLinkedin />,
            name: "LinkedIn",
            color: "#0A66C2",
            action: () =>
              window.open(
                `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(
                  shareUrl
                )}&title=Check this out!`,
                "_blank"
              ),
          },
          {
            icon: <FaInstagram />,
            name: "Instagram",
            color: "#E4405F",
            action: () =>
              window.open(
                `https://www.instagram.com/?url=${encodeURIComponent(shareUrl)}`,
                "_blank"
              ),
          },
          {
            icon: <FaReddit />,
            name: "Reddit",
            color: "#FF4500",
            action: () =>
              window.open(
                `https://www.reddit.com/submit?url=${encodeURIComponent(
                  shareUrl
                )}&title=Check this out!`,
                "_blank"
              ),
          },
          {
            icon: <FaEnvelope />,
            name: "Email",
            color: "#FF5722",
            action: () =>
              (window.location.href = `mailto:?subject=Check this out!&body=${encodeURIComponent(
                shareUrl
              )}`),
          },
        ].map((btn, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <button
              onClick={btn.action}
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                border: `2px solid ${btn.color}`,
                background: "#1e1e1e",
                color: btn.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: "22px",
                marginBottom: "6px",
                
              }}
            >
              {btn.icon}
            </button>
            <div style={{ fontSize: "12px" }}>{btn.name}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}
  </div>
);
};


export default ReelsPage;
