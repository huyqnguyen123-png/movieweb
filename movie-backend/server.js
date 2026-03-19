// server.js
import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Initialize PostgreSQL connection pool
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// Initialize Prisma Client passing the adapter
const prisma = new PrismaClient({ adapter });

const app = express();

// Middleware 
app.use(express.json()); 
app.use(cors()); 

// AUTHENTICATION ROUTES (SIGN UP & LOGIN)

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, country, password } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email: email } });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await prisma.user.create({
      data: { firstName, lastName, email, phone, country, password: hashedPassword },
    });

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email } });

    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

    const { password: userPassword, ...userData } = user;
    res.status(200).json({ message: 'Login successful', user: userData });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// MOVIE ROUTES

// Get all new arrivals/movies
app.get('/api/movies', async (req, res) => {
  try {
    const movies = await prisma.movie.findMany({
      orderBy: { releaseDate: 'desc' },
      take: 20 
    });
    res.json(movies);
  } catch (error) {
    console.error('Fetch Movies Error:', error);
    res.status(500).json({ message: 'Failed to fetch movies' });
  }
});

// Get trending movies
app.get('/api/movies/trending', async (req, res) => {
  try {
    const trendingMovies = await prisma.movie.findMany({
      orderBy: { voteAverage: 'desc' },
      take: 15
    });
    res.json(trendingMovies);
  } catch (error) {
    console.error('Fetch Trending Error:', error);
    res.status(500).json({ message: 'Failed to fetch trending movies' });
  }
});

// Get movies by genre 
app.get('/api/movies/genre/:id', async (req, res) => {
  try {
    const movies = await prisma.movie.findMany({
      take: 10
    });
    res.json(movies);
  } catch (error) {
    console.error('Fetch Genre Error:', error);
    res.status(500).json({ message: 'Failed to fetch genre movies' });
  }
});

// Start the Server 
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});