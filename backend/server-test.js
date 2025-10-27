import express from 'express';
import { initializeDatabase } from './database/db-new.js';

const app = express();
const PORT = process.env.PORT || 3003;

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
    });
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

startServer();
