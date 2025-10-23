import React, { useEffect, useState } from "react";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import { getStorage, ref, getDownloadURL, uploadBytes } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { app } from "../firebase";
import "./ProfilePage.css";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  FaUser,
  FaStore,
  FaShoppingBag,
  FaShoppingCart,
  FaVideo,
} from "react-icons/fa";

const ProfilePage = () => {
  const { userId } = useParams(); // Optional param
  const [sellerData, setSellerData] = useState(null);
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);

  const db = getFirestore(app);
  const storage = getStorage(app);
  const auth = getAuth();
  const navigate = useNavigate();

  // Format reel document with URLs
  const formatReelDoc = async (docSnap) => {
    const data = docSnap.data();
    let imageUrl = data.imageUrl || "";
    let reelUrl = data.reelUrl || "";

    if (imageUrl && !imageUrl.startsWith("http")) {
      try {
        imageUrl = await getDownloadURL(ref(storage, imageUrl));
      } catch {
        imageUrl = "/video-placeholder.png";
      }
    }
    if (!imageUrl) imageUrl = "/video-placeholder.png";

    if (reelUrl && !reelUrl.startsWith("http")) {
      try {
        reelUrl = await getDownloadURL(ref(storage, reelUrl));
      } catch {
        reelUrl = "";
      }
    }

    return { id: docSnap.id, ...data, imageUrl, reelUrl };
  };

  // Fetch profile + reels
  useEffect(() => {
    const fetchData = async () => {
      try {
        let idToFetch = userId;

        // If no userId in URL → show current logged-in user's profile
        if (!idToFetch) {
          if (auth.currentUser) {
            idToFetch = auth.currentUser.uid;
          } else {
            console.warn("No user logged in and no userId in URL.");
            setLoading(false);
            return;
          }
        }

        // Fetch seller data
        const sellerRef = doc(db, "sellerDetails", idToFetch);
        const sellerSnap = await getDoc(sellerRef);

        if (!sellerSnap.exists()) {
          setSellerData(null);
          setLoading(false);
          return;
        }
        setSellerData(sellerSnap.data());

        // Fetch reels for this seller
        const topLevelCol = collection(db, "reels");
        const topLevelSnap = await getDocs(
          query(topLevelCol, where("sellerId", "==", idToFetch))
        );

        let foundReels = [];
        if (!topLevelSnap.empty) {
          foundReels = await Promise.all(
            topLevelSnap.docs.map((d) => formatReelDoc(d))
          );
        }

        setReels(foundReels);
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [db, storage, userId]);

  // Handle logo upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const idToUpdate = userId || auth.currentUser?.uid;
    if (!idToUpdate) return;

    try {
      const logoRef = ref(storage, `brandLogos/${idToUpdate}/${file.name}`);
      await uploadBytes(logoRef, file);
      const downloadURL = await getDownloadURL(logoRef);

      await updateDoc(doc(db, "sellerDetails", idToUpdate), {
        brandLogoUrl: downloadURL,
      });

      setSellerData((prev) => ({ ...prev, brandLogoUrl: downloadURL }));
    } catch (error) {
      console.error("Error uploading logo:", error);
    }
  };

  if (loading) return <div className="loading">Loading profile...</div>;
  if (!sellerData) return <div className="error">Seller profile not found</div>;

  // ✅ Only profile owner can upload logo
  const isOwner =
    auth.currentUser && (userId ? auth.currentUser.uid === userId : true);

  // Stats
  const postsCount = reels.length;
  const followersCount = sellerData.followers || 0;
  const followingCount = sellerData.following || 0;

  return (
    <div className="profile-page">
      {/* Sidebar */}
      <aside className="sidebar">
        <nav>
          <ul>
            <li><FaUser /> <Link to="/profile">Profile</Link></li>
            <li><FaStore /> <Link to="/be-a-seller">Be a Seller</Link></li>
            <li><FaShoppingBag /> <Link to="/orders">My Orders</Link></li>
            <li><FaShoppingCart /> <Link to="/cart">My Cart</Link></li>
            <li><FaVideo /> <Link to="/reels">Reels</Link></li>
          </ul>
        </nav>
      </aside>

      {/* Main Profile */}
      <main className="profile-card-container">
        <div className="profile-card">
          {/* Logo */}
          <div className="profile-logo-container">
            <img
              src={
                sellerData.brandLogoUrl ||
                sellerData.profileImage ||
                "/default-profile.png"
              }
              alt="Brand Logo"
              className="profile-logo"
            />
            {isOwner && (
              <label className="upload-logo-btn">
                Upload Logo
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleLogoUpload}
                />
              </label>
            )}
          </div>

          {/* Name + Brand */}
          <h2>{sellerData.name || "Unnamed User"}</h2>
          {sellerData.brandName && (
            <p className="brand-name">{sellerData.brandName}</p>
          )}

          {/* Stats */}
          <div className="profile-stats">
            <div className="stat-card">
              <strong>{postsCount}</strong>
              <span>Posts</span>
            </div>
            <div className="stat-card">
              <strong>{followersCount}</strong>
              <span>Followers</span>
            </div>
            <div className="stat-card">
              <strong>{followingCount}</strong>
              <span>Following</span>
            </div>
          </div>

          {/* Reels */}
          <div className="reels-grid">
            {reels.length > 0 ? (
              reels.map((reel) => (
                <div
                  key={reel.id}
                  className="reel-card"
                  onClick={() => navigate(`/reel/${reel.id}`)}
                >
                  <img
                    src={reel.imageUrl}
                    alt="Reel Thumbnail"
                    className="reel-thumbnail"
                  />
                </div>
              ))
            ) : (
              <p className="no-reels">No reels uploaded yet</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
