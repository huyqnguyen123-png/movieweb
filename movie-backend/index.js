import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import axios from 'axios'; 

const { PrismaClient } = pkg;
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// API: Get film list
app.get('/api/movies', async (req, res) => {
  try {
    const movies = await prisma.movie.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// API: Movie details 
app.get('/api/movies/:id', async (req, res) => {
  try {
    const movie = await prisma.movie.findUnique({ where: { id: req.params.id } });
    if (!movie) return res.status(404).json({ error: 'Not found' });

    // Actor and Director details
    try {
      const creditsRes = await axios.get(`https://api.themoviedb.org/3/movie/${movie.tmdbId}/credits`, {
        headers: { Authorization: process.env.TMDB_TOKEN }
      });
      movie.director = creditsRes.data.crew.find(c => c.job === 'Director')?.name || "Unknown";
      movie.cast = creditsRes.data.cast.slice(0, 5).map(c => c.name) || [];
    } catch (err) {
      movie.director = "Unknown";
      movie.cast = [];
    }

    res.json(movie);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));