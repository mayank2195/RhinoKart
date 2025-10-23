import React from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import './RoleSelection.css';

const RoleSelection = ({ setUserRole }) => {
  const navigate = useNavigate();

  const handleRoleSelect = async (role) => {
    const user = auth.currentUser;

    if (!user) {
      alert('Please login first.');
      navigate('/login');
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);

      await setDoc(
        userRef,
        {
          role: role,
          email: user.email,
        },
        { merge: true }
      );

      if (setUserRole) setUserRole(role);

      if (role === 'seller') {
        navigate('/verify');
      } else {
        navigate('/display');
      }
    } catch (err) {
      console.error('Role selection failed:', err);
      alert(`Something went wrong: ${err.message || err}`);
    }
  };

  return (
    <div className="role-container">
      <div className="role-card">
        <div className="role-logo-container">
          <img src="rhino-kart.png" alt="App Logo" className="role-logo" />
          <span className="role-brand">Rhino Kart</span>
        </div>
        <p className="role-tagline">Your Fashion. Your Way.</p>

        <h2 className="role-title">Select Your Role</h2>
        <p className="role-subtitle">Choose how you want to use the app:</p>

        <div className="role-buttons">
          <button
            onClick={() => handleRoleSelect('seller')}
            className="role-button seller-btn"
          >
            I want to sell (Seller)
          </button>

          <button
            onClick={() => handleRoleSelect('customer')}
            className="role-button customer-btn"
          >
            I want to buy (Customer)
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
