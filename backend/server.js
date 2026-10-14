require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const pollRoutes = require('./routes/pollRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas
connectDB();

// CORS Configuration
// Allows the deployed Netlify frontend or local development
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5173']
  : '*';

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Body Parser Middleware
app.use(express.json());

// Health Check Endpoint (useful for Render keep-alive & monitoring)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    tier: 'Application Tier (Backend)',
    platform: 'Render',
    timestamp: new Date().toISOString(),
  });
});

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Cloud Poll REST API is running successfully on Render!',
    documentation: {
      health: 'GET /health',
      polls: 'GET /api/polls',
      createPoll: 'POST /api/polls',
      vote: 'PATCH /api/polls/:id/vote',
    },
  });
});

// API Routes
app.use('/api/polls', pollRoutes);

// Fallback 404 Route
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API Route Not Found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? null : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`[Backend Server] Running on port ${PORT}`);
  console.log(`[Backend Server] Ready to receive requests from Netlify frontend`);
});
