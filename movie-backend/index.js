import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize PostgreSQL connection pool and Prisma Adapter
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  headers: {
    Authorization: process.env.TMDB_TOKEN,
    accept: 'application/json'
  }
});

// Get all movies
app.get('/api/movies', async (req, res) => {
  try {
    const movies = await prisma.movie.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: 'Database Error' });
  }
});

// Get movie details (Local + TMDb extra info)
app.get('/api/movies/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const localMovie = await prisma.movie.findUnique({ where: { id } });
    if (!localMovie) return res.status(404).json({ error: 'Movie not found' });

    let extraInfo = {};
    if (localMovie.tmdbId) {
      try {
        const [videoRes, creditRes] = await Promise.all([
          tmdb.get(`/movie/${localMovie.tmdbId}/videos?language=en-US`),
          tmdb.get(`/movie/${localMovie.tmdbId}/credits?language=en-US`)
        ]);

        extraInfo = {
          trailer: videoRes.data.results.find(v => v.type === 'Trailer'),
          cast: creditRes.data.cast.slice(0, 10)
        };
      } catch (tmdbErr) {
        console.error('TMDb Fetch Error:', tmdbErr.message);
      }
    }

    res.json({ ...localMovie, ...extraInfo });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
});