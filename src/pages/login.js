import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const db = getFirestore();

  // Email/Password Login
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/display');
    } catch (err) {
      alert(err.message);
    }
  };

  // Google Login
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Ensure user exists in Firestore
      const userRef = doc(db, 'sellerDetails', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          displayName: user.displayName || 'Unnamed User',
          email: user.email,
          role: null,
        });
      }

      navigate('/display');
    } catch (error) {
      alert(error.message);
      console.error('Google Login Error:', error);
    }
  };

  // Forgot Password
  const handleForgotPassword = async () => {
    if (!email) {
      alert("Please enter your email first!");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent! Check your inbox.");
    } catch (error) {
      console.error("Forgot Password Error:", error);
      alert(error.message);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        
        {/* Left Section */}
        <div className="login-left">
          <div className="logo-text">
            <img src="./rhino-kart.png" alt="Rhinokart Logo" />
            <span>Rhino Kart</span>
          </div>

          <p className="login-tagline">Sign in to your account</p>
          
          <div 
            className="left-images" 
            style={{ display: 'flex', gap: '25px', marginTop: '20px' }}
          >
            <img src="tshirt.png" alt="Shirt" style={{ width: '100px', height: 'auto' }} />
            <img src="/shoes.png" alt="Shoes" style={{ width: '100px', height: 'auto' }} />
            <img src="/purse.png" alt="Purse" style={{ width: '100px', height: 'auto' }} />
          </div>
        </div>

        {/* Right Section */}
        <div className="login-right">
          <h2 className="login-title">Login</h2>
          <p className="login-sub">
            or <span onClick={() => navigate('/signup')}>Sign up</span> (Click Signup for creating account)
          </p>

          <form onSubmit={handleLogin}>
            <label>Email address</label>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <p 
              className="forgot-password" 
              onClick={handleForgotPassword}
            >
              Forgot password?
            </p>

            <button type="submit" className="login-button">Sign in</button>
          </form>

          {/* Google Login Button */}
          <button onClick={handleGoogleLogin} className="google-login-button">
            <img
              src="https://developers.google.com/identity/images/g-logo.png"
              alt="Google Logo"
              className="google-logo"
            />
            Log in with Google
          </button>
        </div>

      </div>
    </div>
  );
};

export default Login;
