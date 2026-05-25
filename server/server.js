const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Route imports
const authRoutes      = require('./routes/authRoutes');
const periodRoutes    = require('./routes/periodRoutes');
const pcosRoutes      = require('./routes/pcosRoutes');
const pregnancyRoutes = require('./routes/pregnancyRoutes');
const safetyRoutes    = require('./routes/safetyRoutes');
const lifestyleRoutes = require('./routes/lifestyleRoutes');
const errorHandler    = require('./middleware/errorHandler');

dotenv.config();
connectDB();

const app = express();
app.set('trust proxy', 1);

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/period',    periodRoutes);
app.use('/api/pcos',      pcosRoutes);
app.use('/api/pregnancy', pregnancyRoutes);
app.use('/api/safety',    safetyRoutes);
app.use('/api/lifestyle', lifestyleRoutes);

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'SheCare API is running 🌸' });
});

// ── Error handler (must be last) ────────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🌸 SheCare server running on port ${PORT}`));