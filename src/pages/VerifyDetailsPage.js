import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom'; // make sure your logo path is correct

const VerifyDetails = () => {
  const [name, setName] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [dob, setDob] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !aadharNumber || !dob || !ifsc || !accountNumber) {
      alert('❌ Please fill in all fields.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert('⚠️ Please login first.');
      navigate('/login');
      return;
    }

    setLoading(true);

    try {
      const docRef = doc(db, 'sellerDetails', user.uid);
      await setDoc(docRef, {
        name,
        aadharNumber,
        dob,
        ifsc,
        accountNumber,
        isVerified: false,
        uid: user.uid,
        createdAt: new Date(),
      });

      alert('✅ Details submitted successfully. Wait for admin verification.');
    } catch (err) {
      console.error('❌ Error uploading verification details:', err);
      alert(`Error submitting details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkVerificationStatus = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert('⚠️ Please login first.');
      navigate('/login');
      return;
    }

    try {
      const docRef = doc(db, 'sellerDetails', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        if (data.isVerified === true) {
          setStatusMessage('✅ Verified! Redirecting to Upload page...');
          setTimeout(() => {
            navigate('/upload', { replace: true });
          }, 1500);
        } else {
          setStatusMessage('❌ Not verified yet. Please wait for approval.');
        }
      } else {
        setStatusMessage('⚠️ No verification details found.');
      }
    } catch (err) {
      console.error('❌ Error fetching verification status:', err);
      setStatusMessage('❌ Error checking status. Try again later.');
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <img src="rhino-kart.png" alt="Rhino Kart" style={{ width: 60, marginBottom: 10 }} />
        <h2 style={{ margin: 0 }}>Rhino Kart</h2>
        <p style={{ fontStyle: 'italic', color: '#666', marginTop: 4 }}>Your Fashion. Your Way.</p>

        <h3 style={{ marginTop: 20 }}>Seller Verification Details</h3>

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
          <input type="text" placeholder="Aadhaar Number" value={aadharNumber} onChange={(e) => setAadharNumber(e.target.value)} required style={inputStyle} />
          <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required style={inputStyle} />
          <input type="text" placeholder="IFSC Code" value={ifsc} onChange={(e) => setIfsc(e.target.value)} required style={inputStyle} />
          <input type="text" placeholder="Account Number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required style={inputStyle} />

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Submitting...' : 'Submit Details'}
          </button>
        </form>

        <hr style={{ width: '100%', margin: '20px 0' }} />

        <button onClick={checkVerificationStatus} style={buttonStyle}>
          🔄 Check Verification Status
        </button>

        {statusMessage && (
          <p style={{ marginTop: 12, fontWeight: 'bold', color: '#444' }}>{statusMessage}</p>
        )}
      </div>
    </div>
  );
};

const pageStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  background: 'linear-gradient(135deg, #FF7E5F, #FEB47B)', // same as first page
  padding: '20px',
};

const cardStyle = {
  background: 'white',
  padding: '30px',
  borderRadius: '16px',
  boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
  width: '100%',
  maxWidth: '400px',
  textAlign: 'center',
};

const inputStyle = {
  display: 'block',
  width: '100%',
  marginBottom: '12px',
  padding: '10px',
  fontSize: '16px',
  borderRadius: '8px',
  border: '1px solid #ccc',
};

const buttonStyle = {
  width: '100%',
  padding: '12px',
  backgroundColor: '#1976d2',
  color: 'white',
  fontSize: '16px',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
};

export default VerifyDetails;
