require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn("Razorpay environment variables are not set.");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/create-order", async (req, res) => {
  try {
    const amount = 10000; // ₹100 in paise
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: { purpose: "premium-access-test" }
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create payment order." });
  }
});

app.post("/api/verify-payment", (req, res) => {
  try {
    const { order_id, payment_id, signature } = req.body;

    if (!order_id || !payment_id || !signature) {
      return res.status(400).json({ verified: false });
    }

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${order_id}|${payment_id}`)
      .digest("hex");

    const verified = crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );

    res.json({ verified });
  } catch (err) {
    console.error(err);
    res.status(400).json({ verified: false });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Server listening on ${port}`));
