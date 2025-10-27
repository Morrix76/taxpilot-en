import express from 'express';
const app = express();
const PORT = process.env.PORT || 3003;

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
