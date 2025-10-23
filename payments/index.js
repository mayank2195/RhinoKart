const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const cors = require("cors")({ origin: true }); // Enable CORS for all origins

admin.initializeApp();

// Test Function
exports.helloWorld = functions.https.onRequest((req, res) => {
  res.send("Hello from Firebase Functions!");
});

// Razorpay Order Creation
exports.createRazorpayOrder = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // Only allow POST requests
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
      }

      // Validate amount
      const amount = req.body.amount;
      if (!amount || typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      // Initialize Razorpay
      const razorpay = new Razorpay({
        key_id: "rzp_test_R9HA39dBh0XKSU",
        key_secret: "22umHzplyWPY797HmSk01DCW"
      });

      // Order options
      const options = {
        amount: amount * 100, // Convert to paise
        currency: "INR",
        receipt: `order_rcptid_${Date.now()}`,
        payment_capture: 1 // Auto-capture
      };

      // Create order
      const order = await razorpay.orders.create(options);

      // Send response
      res.status(200).json(order);
    } catch (error) {
      console.error("Razorpay Order Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
});
