import React, { useEffect, useState, useRef } from "react";
import { getAuth } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { FaArrowUp, FaArrowDown } from "react-icons/fa";

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReelModal, setShowReelModal] = useState(false);
  const [currentReelUrl, setCurrentReelUrl] = useState("");
  const scrollRef = useRef(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);

  const steps = ["Packing your order", "Packed", "Shipped", "Out for Delivery"];

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        const q = query(
          collection(db, "payments"),
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);

        const ordersList = await Promise.all(
          querySnapshot.docs.map(async (docSnap) => {
            const orderData = docSnap.data();
            let productData = {};

            let shippingStatus =
              orderData.shippingStatus || "Packing your order";
            if (!orderData.shippingStatus) {
              try {
                await updateDoc(doc(db, "payments", docSnap.id), {
                  shippingStatus: "Packing your order",
                });
              } catch (err) {
                console.error("Error setting default shippingStatus:", err);
              }
            }

            if (orderData.productId) {
              try {
                const productRef = doc(db, "reels", orderData.productId);
                const productSnap = await getDoc(productRef);
                if (productSnap.exists()) {
                  productData = productSnap.data();
                }
              } catch (err) {
                console.error("Error fetching product details:", err);
              }
            }

            const expectedDelivery = orderData.deliveryDays
              ? new Date(
                  Date.now() + orderData.deliveryDays * 24 * 60 * 60 * 1000
                )
              : null;

            return {
              paymentDocId: docSnap.id,
              ...orderData,
              shippingStatus,
              expectedDelivery,
              ...productData,
            };
          })
        );

        setOrders(ordersList);
      } catch (error) {
        console.error("Error fetching orders:", error);
        alert("Failed to load your orders. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const watchReel = (reelUrl) => {
    if (!reelUrl) {
      alert("Reel not available for this order!");
      return;
    }
    setCurrentReelUrl(reelUrl);
    setShowReelModal(true);
  };

  const requestCancellation = async (paymentDocId) => {
    try {
      const orderRef = doc(db, "payments", paymentDocId);
      await updateDoc(orderRef, { status: "Cancellation Requested" });

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.paymentDocId === paymentDocId
            ? { ...order, status: "Cancellation Requested" }
            : order
        )
      );

      alert("Cancellation request sent!");
    } catch (error) {
      console.error("Error requesting cancellation:", error);
      alert(`Failed to request cancellation: ${error.message}`);
    }
  };

  const scrollUp = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ top: -200, behavior: "smooth" });
    }
  };

  const scrollDown = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ top: 200, behavior: "smooth" });
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "linear-gradient(135deg, #43cea2, #185a9d)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "40px",
      }}
    >
      <div
        style={{
          position: "relative",
          maxWidth: "800px",
          overflowY: "auto",
          height: "100vh",
          marginTop: "100px",
          width: "100%",
          background: "#fff",
          borderRadius: "15px",
          padding: "30px",
          boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
        }}
        ref={scrollRef}
      >
        <h1 style={{ textAlign: "center", marginBottom: "20px" }}>
          My Orders
        </h1>

        {loading ? (
          <p style={{ textAlign: "center" }}>Loading orders...</p>
        ) : orders.length === 0 ? (
          <p style={{ textAlign: "center" }}>No orders found</p>
        ) : (
          orders.map((order) => {
            const currentStepIndex = steps.indexOf(order.shippingStatus);

            return (
              <div
                key={order.paymentDocId}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  padding: "20px",
                  marginBottom: "20px",
                  background: "#f9f9f9",
                }}
              >
                <div style={{ display: "flex", gap: "20px" }}>
                  <img
                    src={order.productImage || "https://via.placeholder.com/100"}
                    alt={order.productName}
                    style={{
                      width: "100px",
                      height: "100px",
                      borderRadius: "10px",
                      objectFit: "cover",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <p>
                      <strong>Order ID:</strong> {order.paymentDocId}
                    </p>
                    <p>
                      <strong>Product:</strong> {order.productName}
                    </p>
                    <p>
                      <strong>Total:</strong> ₹{order.amount}
                    </p>
                    <p>
                      <strong>Status:</strong> {order.status || "Paid"}
                    </p>
                    <p>
                      <strong>Shipping Status:</strong>{" "}
                      {order.shippingStatus || "Packing your order"}
                    </p>
                    <p>
                      <strong>Address:</strong> {order.address || "Not provided"}
                    </p>
                    <p>
                      <strong>Expected Delivery:</strong>{" "}
                      {order.expectedDelivery
                        ? order.expectedDelivery.toDateString()
                        : "Not available"}
                    </p>

                    <div style={{ marginTop: "10px" }}>
                      <button
                        style={{
                          padding: "8px 16px",
                          background: "#43cea2",
                          color: "#fff",
                          border: "none",
                          borderRadius: "5px",
                          cursor: "pointer",
                          marginRight: "10px",
                        }}
                        onClick={() => watchReel(order.reelUrl)}
                      >
                        Watch Reel
                      </button>

                      {order.status !== "Cancellation Requested" &&
                        order.status !== "Cancelled" && (
                          <button
                            style={{
                              padding: "8px 16px",
                              background: "#d9534f",
                              color: "#fff",
                              border: "none",
                              borderRadius: "5px",
                              cursor: "pointer",
                            }}
                            onClick={() =>
                              requestCancellation(order.paymentDocId)
                            }
                          >
                            Request Cancellation
                          </button>
                        )}
                    </div>
                  </div>
                </div>

                {order.status !== "Cancelled" && (
                  <div
                    style={{
                      display: "flex",
                      marginTop: "20px",
                      justifyContent: "space-between",
                    }}
                  >
                    {steps.map((step, index) => {
                      let bgColor = "#e0e0e0";
                      let textColor = "#555";

                      if (index < currentStepIndex) {
                        bgColor = "#43cea2";
                        textColor = "#fff";
                      } else if (index === currentStepIndex) {
                        bgColor = "#ffc107";
                        textColor = "#000";
                      }

                      return (
                        <div
                          key={index}
                          style={{
                            flex: 1,
                            textAlign: "center",
                            fontSize: "12px",
                            padding: "5px",
                            borderRadius: "8px",
                            backgroundColor: bgColor,
                            color: textColor,
                            margin: "0 5px",
                            fontWeight:
                              index === currentStepIndex ? "bold" : "normal",
                          }}
                        >
                          {step}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* ✅ Reel Modal */}
        {showReelModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0,0,0,0.7)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 9999,
            }}
            onClick={() => setShowReelModal(false)}
          >
            <div
              style={{ width: "80%", maxWidth: "500px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <video
                src={currentReelUrl}
                controls
                autoPlay
                style={{ width: "100%", borderRadius: "10px" }}
              />
              <button
                onClick={() => setShowReelModal(false)}
                style={{
                  marginTop: "10px",
                  padding: "8px 16px",
                  background: "#d9534f",
                  color: "#fff",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* ✅ Scroll arrows only on desktop */}
                {/* ✅ Scroll arrows only on desktop */}
                {/* ✅ Scroll arrows only on desktop */}
                {/* ✅ Scroll arrows only on desktop */}
        {isDesktop && (
          <div
            style={{
              position: "fixed",   // 👈 fixed so it stays in place
              top: "50%",          // 👈 50% from top
              right: "30px",       // 👈 thoda right side
              transform: "translateY(-50%)", // 👈 perfect vertical center
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              zIndex: 1000,
            }}
          >
            <button
              onClick={scrollUp}
              style={{
                background: "#43cea2",
                border: "none",
                borderRadius: "50%",
                padding: "14px",
                cursor: "pointer",
                color: "#fff",
                fontSize: "18px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
              }}
            >
              <FaArrowUp />
            </button>
            <button
              onClick={scrollDown}
              style={{
                background: "#43cea2",
                border: "none",
                borderRadius: "50%",
                padding: "14px",
                cursor: "pointer",
                color: "#fff",
                fontSize: "18px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
              }}
            >
              <FaArrowDown />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default MyOrdersPage;
