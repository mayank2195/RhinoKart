import React, { useState } from 'react';
import { auth, app, googleProvider } from '../firebase';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './Signup.css';

function Signup() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const db = getFirestore(app);

  // Generate referral code (RK + 6 random characters)
  const generateUniqueCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'RK';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Ensure the generated code is unique
  const getUniqueReferralCode = async () => {
    let newCode;
    let exists = true;

    while (exists) {
      newCode = generateUniqueCode();
      const q = query(collection(db, 'sellerDetails'), where('referralCode', '==', newCode));
      const querySnapshot = await getDocs(q);
      exists = !querySnapshot.empty;
    }

    return newCode;
  };

  // Email/Password Signup
  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Create unique code and save data under that code
      const referralCode = await getUniqueReferralCode();

      await setDoc(doc(db, 'sellerDetails', referralCode), {
        displayName: username,
        email: newUser.email,
        uid: newUser.uid,
        role: null,
        referralCode: referralCode,
        walletAmount: 0, // ✅ Added default walletAmount as number
        createdAt: new Date(),
      });

      navigate('/display');
    } catch (error) {
      alert(error.message);
      console.error('Signup Error:', error);
    }
  };

  // Google Signup/Login
  const handleGoogleSignup = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if this email already has a code
      const q = query(collection(db, 'sellerDetails'), where('email', '==', user.email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        const referralCode = await getUniqueReferralCode();

        await setDoc(doc(db, 'sellerDetails', referralCode), {
          displayName: user.displayName || 'Unnamed User',
          email: user.email,
          uid: user.uid,
          role: null,
          referralCode: referralCode,
          walletAmount: 0, // ✅ Added here too for Google users
          createdAt: new Date(),
        });
      }

      navigate('/display');
    } catch (error) {
      alert(error.message);
      console.error('Google Signup Error:', error);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <div className="signup-logo-container">
          <img src="rhino-kart.png" alt="App Logo" className="signup-logo" />
          <span className="signup-brand">Rhino Kart</span>
        </div>
        <h2 className="signup-title">Create an Account</h2>

        <form onSubmit={handleSignup}>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="signup-input"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="signup-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="signup-input"
          />
          <button type="submit" className="signup-button">Sign Up</button>
        </form>

        <button onClick={handleGoogleSignup} className="signup-button google-signup">
          <img
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google Logo"
            className="google-logo"
          />
          Sign up with Google
        </button>

        <p className="signup-footer">
          Already have an account? <span onClick={() => navigate('/login')}>Login</span>
        </p>
      </div>
    </div>
  );
}

export default Signup;
