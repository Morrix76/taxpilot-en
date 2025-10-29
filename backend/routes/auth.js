// File: backend/routes/auth.js
import express from "express";
const router = express.Router();

console.log("📦 routes/auth.js caricato correttamente");

// ====== Test semplice per GET ======
router.get("/test", (req, res) => {
  res.json({ message: "✅ Auth routes funzionanti (GET test)" });
});

// ====== Demo login (GET e POST entrambi per test) ======
router.get("/demo-login", (req, res) => {
  res.json({
    success: true,
    message: "Demo login (GET) effettuato",
    data: {
      user: { id: 999, name: "Demo User", email: "demo@studio.com" },
      token: "demo-token-123",
    },
  });
});

router.post("/demo-login", (req, res) => {
  res.json({
    success: true,
    message: "Demo login (POST) effettuato",
    data: {
      user: { id: 999, name: "Demo User", email: "demo@studio.com" },
      token: "demo-token-123",
    },
  });
});

export default router;
