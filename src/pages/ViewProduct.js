// src/pages/ViewProduct.js
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import ImageGallery from 'react-image-gallery'; // 🔴 NEW: Import Image Gallery
import "react-image-gallery/styles/css/image-gallery.css"; // 🔴 NEW: Import Gallery CSS
import "./ViewProduct.css";

const ViewProduct = () => {
  const { reelId } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const calculateDeliveryDate = (days) => {
    if (!days || isNaN(days)) return "N/A";
    const date = new Date();
    date.setDate(date.getDate() + Number(days));
    return date.toDateString();
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const reelRef = doc(db, "reels", reelId);
        const reelSnap = await getDoc(reelRef);

        if (reelSnap.exists()) {
          const data = reelSnap.data();
          const productList = [];

          if (data.outfits && Array.isArray(data.outfits)) {
            data.outfits.forEach((outfit, index) => {
              productList.push({
                id: `${reelId}_${index}`,
                name: outfit.name || "Unnamed Product",
                mainPrice: outfit.mainPrice || null,
                images: outfit.images || [], 
                colors: outfit.colors || [],
                sizes: outfit.sizes || [],
                price: outfit.price || null,
                deliveryDays: outfit.deliveryDays || null,
              });
            });
          }

          setProducts(productList);
        } else {
          console.log("No such reel document found!");
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    if (reelId) fetchProducts();
  }, [reelId]);

  // 🔹 Add to Cart 
  const handleAddToCart = async (product) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("Please login first!");
        return;
      }

      const primaryImageUrl = product.images.length > 0 ? product.images[0].url : null;

      await addDoc(collection(db, "carts"), {
        userId: user.uid,
        productId: product.id,
        name: product.name,
        price: product.price,
        imageUrl: primaryImageUrl,
        deliveryDays: product.deliveryDays || null,
        quantity: 1,
        createdAt: new Date(),
      });

      alert(`${product.name} added to cart ✅`);
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert("Something went wrong!");
    }
  };

  if (loading) return <p className="loading">Loading...</p>;
  if (products.length === 0) return <p className="not-found">No products found</p>;

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "linear-gradient(135deg, #ff7e5f, #feb47b)",
        overflowY: "auto",
        padding: "20px",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: "20px", color: "#fff" }}>
        Products for this Reel
      </h1>

      <div className="product-list">
        {products.map((product) => {
          
          // 🔴 NEW: Prepare images array in the format required by react-image-gallery
          const galleryImages = product.images.map(img => ({
            original: img.url, // Full size image
            thumbnail: img.url, // Thumbnail image
            originalTitle: product.name // Optional title
          }));

          return (
            <div key={product.id} className="product-card2">
              
              {/* 🔴 NEW: Use ImageGallery Component */}
              <div className="media-section-gallery">
                {galleryImages.length > 0 ? (
                  <ImageGallery
                    items={galleryImages}
                    showPlayButton={false}      // Reel नहीं है, इसलिए Play बटन की जरूरत नहीं
                    showFullscreenButton={true} // Fullscreen/Expand बटन
                    showBullets={true}          // नीचे डॉट्स
                    showNav={true}              // Left/Right Arrows
                    showThumbnails={false}      // थंबनेल हटा सकते हैं, या इसे on रखें
                    autoPlay={false}
                    lazyLoad={true}
                    // 'originalClass' property to custom style the main image container if needed
                  />
                ) : (
                  <div className="product-image placeholder">
                    No Image Available
                  </div>
                )}
              </div>
              {/* ------------------------------------- */}

              <div className="details-section">
                <h2 className="product-title">{product.name}</h2>

                {product.sizes.length > 0 && (
                  <p className="product-size">
                    Sizes: {product.sizes.join(", ")}
                  </p>
                )}

                {product.colors.length > 0 && (
                  <p className="product-color">
                    Colors: {product.colors.join(", ")}
                  </p>
                )}

                {product.mainPrice && product.price && (
                  <p className="product-price">
                    MRP: <span style={{ textDecoration: 'line-through', color: '#999' }}>₹ {product.mainPrice}</span> 
                    &nbsp; Offer Price: ₹ {product.price}
                  </p>
                )}

                {product.deliveryDays !== null && (
                  <p className="product-delivery">
                    Expected Delivery: {calculateDeliveryDate(product.deliveryDays)}
                  </p>
                )}

                <div className="button-row">
                  <button
                    className="add-cart-btn"
                    onClick={() => handleAddToCart(product)}
                  >
                    🛒 Add to Cart
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ViewProduct;