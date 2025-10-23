import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFirestore, collection, getDocs, doc, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // 👈 auth for user
import { app } from "../firebase";
import "./ProductDetails.css";

const ProductDetails = () => {
  const { productName } = useParams();
  const [productList, setProductList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const db = getFirestore(app);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      const snapshot = await getDocs(collection(db, "reels"));
      const products = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      let matched;
      if (productName) {
        const decodedSearch = decodeURIComponent(productName).toLowerCase();
        matched = products.filter((p) =>
          p.productName?.toLowerCase().includes(decodedSearch)
        );
        setSearchTerm(decodedSearch);
      } else {
        matched = products;
      }

      setProductList(products);
      setFilteredList(matched);
    };

    fetchProducts();
  }, [productName, db]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    const filtered = productList.filter((p) =>
      p.productName?.toLowerCase().includes(value.toLowerCase())
    );

    setFilteredList(filtered);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      navigate(`/product/${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleWatchReel = (id) => {
    navigate(`/reel/${id}`);
  };

  // 🔥 Function to add product to cart
  const handleAddToCart = async (product) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        alert("Please login to add to cart");
        navigate("/login");
        return;
      }

      // unique doc id = user.uid + product.id
      const cartRef = doc(db, "carts", `${user.uid}_${product.id}`);
      await setDoc(cartRef, {
        userId: user.uid,
        productId: product.id,
        productName: product.productName,
        price: product.price,
        imageUrl: product.imageUrl,
        quantity: 1,
        addedAt: new Date(),
      });

      alert("✅ Added to cart!");
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert("❌ Failed to add to cart");
    }
  };

  return (
    <div className="product-details-container">
      {/* Top bar */}
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ←
        </button>
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          className="search-bar"
          placeholder="Search by product name"
        />
      </div>

      {/* Product List */}
      <div className="product-list">
        {filteredList.length > 0 ? (
          filteredList.map((product) => (
            <div key={product.id} className="product-card">
              <img
                src={product.imageUrl || "https://via.placeholder.com/200"}
                alt={product.productName || "Product"}
                className="product-image"
              />
              <div className="product-info">
                <h3 className="product-name">
                  {product.productName || "Unnamed"}
                </h3>
                <p className="product-price">₹ {product.price || "—"}</p>
              </div>
              <div className="product-actions">
                <button
                  className="watch-btn"
                  onClick={() => handleWatchReel(product.id)}
                >
                  WATCH REEL ▶
                </button>
                <button
                  className="add-btn"
                  onClick={() => handleAddToCart(product)}
                >
                  ADD TO CART 🛒
                </button>
              </div>
            </div>
          ))
        ) : (
          <h2
            style={{
              color: "black",
              textAlign: "center",
              marginTop: "50px",
            }}
          >
            No product found
          </h2>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;
