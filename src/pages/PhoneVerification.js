import React, { useState } from "react";
import { auth, signInWithPhoneNumber, setupRecaptcha, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";
import "./PhoneVerification.css";

const PhoneVerification = () => {
  const [phoneNumber, setPhoneNumber] = useState("+91");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.redirectTo || "/display";
  const productData = location.state?.product || null;
  const productId = location.state?.productId || null;
  const sellerId = location.state?.sellerId || null;

  const sendOtp = async () => {
    try {
      const verifier = setupRecaptcha("recaptcha-container");
      const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      setConfirmationResult(result);
      setMessage("OTP sent!");
    } catch (error) {
      console.error(error);
      setMessage("Failed to send OTP: " + error.message);
    }
  };

  const verifyOtp = async () => {
    if (!confirmationResult) {
      setMessage("Please request OTP first.");
      return;
    }

    try {
      const userCred = await confirmationResult.confirm(otp);
      const user = userCred.user;

      await setDoc(
        doc(db, "users", user.uid),
        {
          phoneNumber,
          phoneVerified: true,
        },
        { merge: true }
      );

      setMessage("Phone number verified!");
      navigate(redirectTo, {
        state: { product: productData, productId, sellerId },
      });
    } catch (error) {
      console.error(error);
      setMessage("Invalid OTP!");
    }
  };

  return (
    <div className="phone-verification-container">
      <div className="card">
        <h2 className="card-title">Phone Verification</h2>

        <input
          type="text"
          placeholder="+91XXXXXXXXXX"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="input-field"
        />
        <div id="recaptcha-container"></div>
        <button onClick={sendOtp} className="btn">
          Send OTP
        </button>

        {confirmationResult && (
          <>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="input-field"
            />
            <button onClick={verifyOtp} className="btn">
              Verify OTP
            </button>
          </>
        )}

        <p className="message">{message}</p>
      </div>
    </div>
  );
};

export default PhoneVerification;
