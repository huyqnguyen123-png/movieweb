import dotenv from 'dotenv';
import axios from 'axios';
import pkg from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Load environment variables (.env)
dotenv.config();

const { PrismaClient } = pkg;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TMDB_TOKEN = process.env.TMDB_TOKEN;
const API_BASE_URL = 'https://api.themoviedb.org/3';

async function importMovies() {
  console.log("🚀 Starting movie import process from TMDb...");

  try {
    for (let page = 1; page <= 5; page++) {
      console.log(`📥 Fetching page ${page}...`);
      
      const response = await axios.get(`${API_BASE_URL}/movie/popular?language=en-US&page=${page}`, {
        headers: {
          Authorization: TMDB_TOKEN
        }
      });

      const movies = response.data.results;

      // Iterate through each movie and save it to the database
      for (const tmdbMovie of movies) {
        await prisma.movie.upsert({
          where: { tmdbId: tmdbMovie.id.toString() }, 
          update: {},
          create: {
            tmdbId: tmdbMovie.id.toString(),
            title: tmdbMovie.title,
            overview: tmdbMovie.overview || "No overview available.",
            posterPath: tmdbMovie.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}` : null,
            backdropPath: tmdbMovie.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdbMovie.backdrop_path}` : null,
            releaseDate: tmdbMovie.release_date || "Unknown",
            voteAverage: tmdbMovie.vote_average || 0.0,
            videoUrl: null
          }
        });
      }
      
      console.log(`✅ Page ${page} imported successfully.`);
    }

    console.log("🎉 All movies have been successfully imported into the database!");

  } catch (error) {
    console.error("❌ Error importing movies:", error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Execute the import function
importMovies();