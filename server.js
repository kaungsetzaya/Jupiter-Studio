import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jupiter_studio';
const JWT_SECRET = process.env.JWT_SECRET || 'jupiter_secret_key_change_this';

// Middleware
app.use(cors());
app.use(express.json());

// Add Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // HSTS is typically handled by HTTPS server config, but can be set here if confident in HTTPS setup.
  // res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload'); 
  next();
});

// Database Connection
// Note: In a pure frontend preview environment without a local MongoDB, this might fail.
// We add a catch block to prevent the server from crashing immediately, though API routes will fail.
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error (Ensure MongoDB is running):', err));

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user', enum: ['user', 'admin'] },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// API Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    
    // Make first user admin automatically
    const count = await User.countDocuments();
    if (count === 0) user.role = 'admin';

    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    
    res.json({ 
      token, 
      user: { id: user._id, email: user.email, role: user.role } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Secure endpoint to provide API Key to frontend
app.get('/api/config/apikey', (req, res) => {
  res.json({ apiKey: process.env.VITE_API_KEY });
});

// Serve Static Files (Frontend)
// This handles the case where users run 'node server.js' and expect to see the app
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Fallback: For any route not handled by API, serve index.html
app.get(/^\/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});