import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "../firebase";
import { FaSearch } from "react-icons/fa";
import "./SearchResultsPage.css";

const SearchResultsPage = () => {
  const { searchTerm } = useParams();
  const [results, setResults] = useState([]);
  const [searchInput, setSearchInput] = useState(searchTerm || "");
  const db = getFirestore(app);
  const auth = getAuth(app);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const snapshot = await getDocs(collection(db, "reels"));
        const allData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const filtered = allData.filter((item) =>
          item.outfits?.some((outfit) =>
            outfit.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        );

        setResults(filtered);
      } catch (error) {
        console.error("Error fetching search results:", error);
      }
    };

    fetchResults();
  }, [db, searchTerm]);

  const handleSearch = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/search/${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const handleAddToCart = async (reelItem) => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please login first to add items to your cart.");
      navigate("/login");
      return;
    }

    const outfit = reelItem.outfits?.[0];
    
    // Ensure the first outfit exists and has an ID for cart reference
    if (!outfit) {
        alert("Product details missing. Cannot add to cart.");
        return;
    }

    // Since the outfit ID is typically constructed as 'reelId_0'
    const outfitId = `${reelItem.id}_0`;
    const primaryImageUrl = outfit.images?.[0]?.url || "";

    try {
      await addDoc(collection(db, "carts"), { // Changed 'cart' to 'carts' for consistency
        userId: user.uid,
        productId: outfitId, // Use the unique outfit ID
        name: outfit.name,
        price: outfit.price,
        imageUrl: primaryImageUrl,
        quantity: 1,
        createdAt: new Date(),
      });
      alert(`${outfit.name} added to cart!`);
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert("Failed to add product to cart.");
    }
  };

  return (
    <div className="full-page">
      <div className="search-page">
        {/* Top Search Bar */}
        <div className="search-bar-wrapper">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search product by name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
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

        <h2 className="search-title">Search Results for "{searchTerm}"</h2>

        {results.length === 0 ? (
          <p>No products found.</p>
        ) : (
          <div className="search-grid">
            {results.map((item) => {
              const product = item.outfits?.[0];
              
              // 🔴 FIX: Get the URL of the image with index 0
              const primaryImageUrl = product?.images?.[0]?.url;

              return (
                <div key={item.id} className="product-card3">
                  <div className="image-container2">
                    <img
                      // 🔴 FIX APPLIED HERE
                      src={primaryImageUrl || "/placeholder.png"}
                      alt={product?.name || "Product"}
                    />
                  </div>
                  <div className="product-info">
                    <h3>{product?.name}</h3>
                    <p className="product-price">₹{product?.price}</p>
                    {item.brandName && (
                      <p className="product-brand">Brand: {item.brandName}</p>
                    )}
                    <div className="product-actions">
                      <button className="cart" onClick={() => handleAddToCart(item)}>
                        Add to Cart
                      </button>
                      <button className="watch" onClick={() => navigate(`/reel/${item.id}`)}>
                        Watch Reel
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultsPage;