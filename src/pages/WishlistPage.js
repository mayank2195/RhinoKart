import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
  getDoc as fetchSingleDoc, // Renaming to avoid conflict with object property
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaTrash,
  FaShoppingCart,
  FaPlay,
  FaShoppingBag,
  FaTimes,
} from "react-icons/fa";
import "./WishlistPage.css";

const WishlistPage = () => {
  const [wishlist, setWishlist] = useState([]);
  const [selectedReel, setSelectedReel] = useState(null);
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    const fetchWishlist = async () => {
      try {
        const querySnapshot = await getDocs(
          collection(db, "users", currentUser.uid, "wishlist")
        );

        const wishlistData = [];
        for (let docSnap of querySnapshot.docs) {
          const item = { id: docSnap.id, ...docSnap.data() };

          // 🛑 Assuming the wishlist document stores the reel ID under 'reelId'
          // If your wishlist uses 'productId' for the reel ID, change 'item.reelId' to 'item.productId'
          const currentReelId = item.reelId; 

          if (currentReelId) { 
            const reelRef = doc(db, "reels", currentReelId);
            const reelSnap = await fetchSingleDoc(reelRef);

            if (reelSnap.exists()) {
              const reelData = reelSnap.data();
              
              // We assume the wishlist is always linked to the first outfit (index 0)
              const outfitIndex = 0; 
              const firstOutfit = reelData.outfits?.[outfitIndex];

              // Extract data only if the outfit exists
              if (firstOutfit) {
                  // ✅ FIX 1: Explicitly set reelId and generate the unique outfitId
                  item.reelId = currentReelId; // Ensure the reel ID is explicitly set
                  item.outfitId = `${currentReelId}_${outfitIndex}`; // Unique product ID for cart (e.g., REEL_ID_0)
                  
                  // ✅ FIX 2: Populate other necessary fields using outfit data
                  item.imageUrl = firstOutfit.images?.[0]?.url || null; // 0 index image
                  item.price = firstOutfit.price || 0;
                  item.productName = firstOutfit.name || "Unnamed Product";
              } else {
                  // If outfit is missing, ensure IDs are cleared/set to null to prevent bad cart entries
                  item.reelId = null;
                  item.outfitId = null;
              }
              
              item.reelUrl = reelData.reelUrl || null; // Reel video URL for popup
            }
          }
          wishlistData.push(item);
        }

        // Filter out items where reel/outfit data couldn't be fetched
        setWishlist(wishlistData.filter(item => item.outfitId)); 
      } catch (err) {
        console.error("Error fetching wishlist:", err);
      }
    };

    fetchWishlist();
  }, [currentUser]);

  const removeFromWishlist = async (itemId) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "wishlist", itemId));
      setWishlist((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      console.error("Error removing from wishlist:", err);
    }
  };
  
  const videoRef = useRef(null);
  const togglePlayPause = () => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) video.play();
      else video.pause();
    }
  };

  const addToCart = async (item) => {
    if (!currentUser) return;
    
    // ✅ The check is now guaranteed to pass if data fetching succeeded
    if (!item.reelId || !item.outfitId) {
        alert("Product details missing. Cannot add to cart.");
        return;
    }

    try {
      await addDoc(collection(db, "carts"), {
        userId: currentUser.uid,
        // Use outfitId as the unique product identifier in the cart
        productId: item.outfitId, 
        reelId: item.reelId,
        name: item.productName || "",
        price: item.price || 0,
        imageUrl: item.imageUrl || "",
        quantity: 1,
        createdAt: new Date(),
      });

      alert(`${item.productName} added to cart!`);
    } catch (err) {
      console.error("Error adding to cart:", err);
    }
  };

  // ----------------- BACKGROUND LAYER -----------------
  const BackgroundLayer = () => (
    <div
      style={{
        height: "100vh",
        width: "100%",
        background: "linear-gradient(135deg, #ff7e5f, #feb47b)",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: -1,
      }}
    ></div>
  );
  // -----------------------------------------------------

  if (!currentUser) {
    return (
      <>
        <BackgroundLayer />
        <div
          style={{
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <p className="text-center text-gray-700">
            Please login to see your wishlist.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <BackgroundLayer />
      <div
        style={{
          position: "relative",
          zIndex: 1,
        }}
      >
        <div className="wishlist-container">
          <div className="wishlist-header">
            <FaArrowLeft className="back-btn" onClick={() => navigate(-1)} />
            <h1 className="header-title">rhinokart</h1>
          </div>

          <div className="wishlist-title">
            <span className="wishlist-label">
              <FaShoppingBag className="wishlist-icon" /> WISHLIST
            </span>
          </div>

          <div className="wishlist-items">
            {wishlist.length === 0 ? (
              <p className="empty-text">No items in wishlist yet.</p>
            ) : (
              wishlist.map((item) => (
                <div key={item.id} className="wishlist-card">
                  {/* Image is now correctly rendered using item.imageUrl */}
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="wishlist-thumb"
                    />
                  ) : (
                    <div className="wishlist-thumb placeholder">
                      No Image Available
                    </div>
                  )}

                  <div className="wishlist-info">
                    <p className="label">Name</p>
                    <p className="product-name">{item.productName}</p>
                    <p className="price">₹{item.price}</p>

                    <div className="action-buttons">
                      {/* Instead of navigate, show popup */}
                      <button
                        onClick={() => setSelectedReel(item.reelUrl)}
                        className="btn watch-btn"
                      >
                        <FaPlay className="btn-icon" /> WATCH REEL
                      </button>
                      <button
                        onClick={() => addToCart(item)}
                        className="btn cart-btn"
                      >
                        <FaShoppingCart className="btn-icon" /> ADD TO CART
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromWishlist(item.id)}
                    className="delete-btn"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* -------- Reel Popup Modal -------- */}
      {selectedReel && (
        <div className="reel-overlay">
          <div className="reel-popup">
            <FaTimes
              className="close-btn"
              onClick={() => setSelectedReel(null)}
            />
            
            <video
              ref={videoRef}  
              src={selectedReel}
              controls
              autoPlay
              controlsList="nodownload noplaybackrate nofullscreen noremoteplayback"
               muted
               loop
              onClick={togglePlayPause} 
              disablePictureInPicture
              className="reel-video1"
            ></video>
          </div>
        </div>
      )}
    </>
  );
};

export default WishlistPage;