import React, { useState } from 'react';
import {
  Button,
  TextField,
  CircularProgress,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Typography,
  Box,
  Container,
  Paper,
  IconButton,
  LinearProgress
} from '@mui/material';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { auth, app } from '../firebase';
import { useNavigate } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';

const UploadPage = () => {
  const [brandName, setBrandName] = useState('');
  const [contact, setContact] = useState('');
  const [reel, setReel] = useState(null);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [outfits, setOutfits] = useState([
    { name: '', mainPrice: '', price: '', sizes: '', colors: '', images: [], deliveryDays: '' }
  ]);

  const navigate = useNavigate();
  const db = getFirestore(app);
  const storage = getStorage(app);

  const handleOutfitChange = (index, field, value) => {
    const updated = [...outfits];
    updated[index][field] = value;
    setOutfits(updated);
  };

  // 🔴 FIX APPLIED HERE: To allow appending new images 
  const handleOutfitImages = (index, files) => {
    const updated = [...outfits];
    const existingImages = updated[index].images;
    const nextIndex = existingImages.length > 0 ? existingImages[existingImages.length - 1].index + 1 : 0;
    
    // Create new image objects and assign consecutive indices
    const newImages = Array.from(files).map((file, idx) => ({
      file,
      index: nextIndex + idx // Ensure unique and consecutive index across multiple selections
    }));

    // Append new images to the existing list
    updated[index].images = [...existingImages, ...newImages];
    setOutfits(updated);
  };

  // New function to remove an image
  const removeOutfitImage = (outfitIndex, imageIndex) => {
    const updated = [...outfits];
    updated[outfitIndex].images.splice(imageIndex, 1);
    setOutfits(updated);
  };

  const addOutfit = () => {
    setOutfits([...outfits, { name: '', mainPrice: '', price: '', sizes: '', colors: '', images: [], deliveryDays: '' }]);
  };

  const removeOutfit = (index) => {
    const updated = [...outfits];
    updated.splice(index, 1);
    setOutfits(updated);
  };

  const handleUpload = async () => {
    // Basic Validation Check
    if (!brandName || !contact || !reel || !category || !description) {
      alert('कृपया सभी मुख्य फ़ील्ड भरें।');
      return;
    }
    if (outfits.some(o => !o.name || !o.mainPrice || !o.price || !o.sizes || !o.colors || o.images.length === 0 || !o.deliveryDays)) {
      alert('कृपया प्रत्येक ऑउटफिट के लिए सभी विवरण, डिलीवरी के दिन और इमेज अपलोड करें।');
      return;
    }
    if (!auth.currentUser) {
      alert('अपलोड करने के लिए आपको लॉग इन करना होगा।');
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const sellerId = auth.currentUser.uid;

      // 1. Upload Reel (Video) - Using Resumable for progress
      const reelRef = ref(storage, `reels/${Date.now()}_${reel.name}`);
      const reelUploadTask = uploadBytesResumable(reelRef, reel);

      await new Promise((resolve, reject) => {
        reelUploadTask.on(
          'state_changed',
          snapshot => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100 * 0.2; // Reel is 20% of total progress
            setUploadProgress(progress);
          },
          error => reject(error),
          () => resolve()
        );
      });

      const reelUrl = await getDownloadURL(reelRef);
      setUploadProgress(20); // Set reel upload as complete (20% done)


      // 2. Upload Outfit Images
      const outfitsData = [];
      let totalImages = outfits.reduce((acc, outfit) => acc + outfit.images.length, 0);
      let imagesUploaded = 0;

      const baseProgress = 20; // Starting point after reel upload (20%)
      const imageContribution = 80; // Images contribute 80% of total progress

      for (let i = 0; i < outfits.length; i++) {
        const outfit = outfits[i];

        // Create an array of Promises for concurrent image uploads
        const uploadPromises = outfit.images.map(async (imgObj) => {
          // Unique path including original index
          const imgRef = ref(storage, `images/${Date.now()}_${i}_${imgObj.index}_${imgObj.file.name}`);
          
          await uploadBytes(imgRef, imgObj.file);
          
          const url = await getDownloadURL(imgRef);

          // Update progress after each image upload
          imagesUploaded++;
          const currentProgress = baseProgress + (imagesUploaded / totalImages) * imageContribution;
          setUploadProgress(currentProgress);
          
          // Return the object with the URL and the crucial original index
          return { url, index: imgObj.index };
        });

        // Wait for all images of the current outfit to upload
        let uploadedImages = await Promise.all(uploadPromises);

        // ESSENTIAL FIX: Sort the uploaded images by their original index
        uploadedImages.sort((a, b) => a.index - b.index);

        outfitsData.push({
          name: outfit.name,
          mainPrice: parseFloat(outfit.mainPrice),
          price: parseFloat(outfit.price),
          sizes: outfit.sizes.split(',').map(s => s.trim()),
          colors: outfit.colors.split(',').map(c => c.trim()),
          deliveryDays: parseInt(outfit.deliveryDays),
          images: uploadedImages
        });
      }

      // 3. Save to Firestore (Efficient Single Write)
      const newDocRef = doc(collection(db, 'reels'));
      const uploadData = {
        id: newDocRef.id,
        sellerId,
        brandName,
        contact,
        category,
        description,
        reelUrl,
        outfits: outfitsData,
        createdAt: new Date(),
        likes: 0
      };

      await setDoc(newDocRef, uploadData);
      setUploadProgress(100); // Final progress update

      alert('अपलोड सफल रहा!');
      navigate('/display');
    } catch (err) {
      console.error('अपलोड विफल हुआ:', err);
      alert('अपलोड विफल हुआ। विवरण के लिए कंसोल देखें।');
    }

    setLoading(false);
    setUploadProgress(0);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #ff9966, #ff5e62)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        p: 2,
        width: '100vw',
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={4} sx={{ p: 4, borderRadius: 3, textAlign: 'center', marginTop: '40px' }}>
          <Typography variant="h5" fontWeight="bold">Rhino Kart</Typography>
          <Typography variant="body2" sx={{ mb: 3, fontStyle: 'italic', color: 'gray' }}>
            Your Fashion. Your Way.
          </Typography>

          <TextField label="Brand Name" fullWidth margin="normal" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
          <TextField label="Contact" fullWidth margin="normal" value={contact} onChange={(e) => setContact(e.target.value)} />
          <TextField label="Product Description" multiline rows={3} fullWidth margin="normal" value={description} onChange={(e) => setDescription(e.target.value)} />

          <FormControl fullWidth margin="normal">
            <InputLabel>Category</InputLabel>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <MenuItem value="Men's Wear">Men's Wear</MenuItem>
              <MenuItem value="Women's Wear">Women's Wear</MenuItem>
              <MenuItem value="Kids Wear">Kids Wear</MenuItem>
              <MenuItem value="Innovative Products">Innovative Products</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ my: 2 }}>
            <Button variant="outlined" component="label" fullWidth sx={{ mb: 1 }}>
              Upload Reel (Video) - {reel ? reel.name : 'No file selected'}
              <input type="file" accept="video/*" hidden onChange={(e) => setReel(e.target.files[0])} />
            </Button>
          </Box>

          <Typography variant="h6" sx={{ mt: 3 }}>Outfits</Typography>

          {outfits.map((outfit, index) => (
            <Paper key={index} sx={{ p: 2, mb: 2, position: 'relative' }}>
              <IconButton
                sx={{ position: 'absolute', top: 8, right: 8 }}
                onClick={() => removeOutfit(index)}
                disabled={outfits.length === 1}
              >
                <DeleteIcon />
              </IconButton>

              <TextField
                label="Outfit Name"
                fullWidth
                margin="normal"
                value={outfit.name}
                onChange={(e) => handleOutfitChange(index, 'name', e.target.value)}
              />
              <TextField
                label="Main Price (MRP ₹)"
                type="number"
                fullWidth
                margin="normal"
                value={outfit.mainPrice}
                onChange={(e) => handleOutfitChange(index, 'mainPrice', e.target.value)}
              />
              <TextField
                label="Discounted Price (₹)"
                type="number"
                fullWidth
                margin="normal"
                value={outfit.price}
                onChange={(e) => handleOutfitChange(index, 'price', e.target.value)}
              />
              <TextField
                label="Sizes (comma separated)"
                fullWidth
                margin="normal"
                value={outfit.sizes}
                onChange={(e) => handleOutfitChange(index, 'sizes', e.target.value)}
              />
              <TextField
                label="Colors (comma separated)"
                fullWidth
                margin="normal"
                value={outfit.colors}
                onChange={(e) => handleOutfitChange(index, 'colors', e.target.value)}
              />
              <TextField
                label="Delivery Days"
                type="number"
                fullWidth
                margin="normal"
                value={outfit.deliveryDays}
                onChange={(e) => handleOutfitChange(index, 'deliveryDays', e.target.value)}
              />

              <Button
                variant="outlined"
                component="label"
                fullWidth
                sx={{ mt: 1 }}
              >
                Upload Images ({outfit.images.length} selected)
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => handleOutfitImages(index, e.target.files)}
                  // Key point: The input field will be cleared after selection, allowing new files to be selected
                  value={''} // Clear value to allow re-selection of the same file(s)
                />
              </Button>

              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                {outfit.images.map((imgObj, idx) => imgObj?.file ? (
                  <Box key={idx} sx={{ position: 'relative', width: 60, height: 60 }}>
                    <img
                      src={URL.createObjectURL(imgObj.file)}
                      alt={`outfit-${index}-img-${idx}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }}
                    />
                    <IconButton
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        backgroundColor: 'error.main',
                        color: 'white',
                        '&:hover': { backgroundColor: 'error.dark' },
                        p: 0.2 // Smaller padding
                      }}
                      onClick={() => removeOutfitImage(index, idx)}
                    >
                      {/* Using a simple 'x' or a minus icon for a small button */}
                      <DeleteIcon sx={{ fontSize: 12 }} /> 
                    </IconButton>
                  </Box>
                ) : null)}
              </Box>
            </Paper>
          ))}

          {loading && <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 2 }} />}

          <Button variant="outlined" fullWidth sx={{ mt: 2 }} onClick={addOutfit}>
            + Add Another Outfit
          </Button>

          <Button
            variant="contained"
            fullWidth
            sx={{
              backgroundColor: '#4CAF50',
              color: 'white',
              py: 1.2,
              mt: 3,
              '&:hover': { backgroundColor: '#45a049' },
            }}
            onClick={handleUpload}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Upload Reel with Outfits'}
          </Button>

          <Button
            variant="contained"
            fullWidth
            sx={{
              backgroundColor: '#2196F3',
              color: 'white',
              py: 1.2,
              mt: 2,
              '&:hover': { backgroundColor: '#1976d2' },
            }}
            onClick={() => navigate('/display')}
          >
            Go to Home Page
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default UploadPage;