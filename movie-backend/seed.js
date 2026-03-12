import axios from 'axios';
import dotenv from 'dotenv';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TMDB_TOKEN = process.env.TMDB_TOKEN;

async function seedMovies() {
  try {
    const response = await axios.get('https://api.themoviedb.org/3/movie/popular?language=en-US&page=1', {
      headers: { Authorization: TMDB_TOKEN }
    });

    const movies = response.data.results;

    for (const item of movies) {
      await prisma.movie.upsert({
        where: { tmdbId: String(item.id) },
        update: {},
        create: {
          tmdbId: String(item.id),
          title: item.title,
          overview: item.overview,
          posterPath: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
          backdropPath: `https://image.tmdb.org/t/p/original${item.backdrop_path}`,
          releaseDate: item.release_date,
          voteAverage: item.vote_average,
          videoUrl: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8"
        }
      });
    }
    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Seeding error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedMovies();