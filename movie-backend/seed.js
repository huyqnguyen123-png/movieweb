import axios from 'axios';
import dotenv from 'dotenv';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seed() {
  try {
    console.log("Fetching movies from TMDb...");
    const response = await axios.get('https://api.themoviedb.org/3/movie/popular?language=en-US&page=1', {
      headers: { Authorization: process.env.TMDB_TOKEN }
    });

    for (const item of response.data.results) {
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
    console.log("✅ Seed completed successfully!");
  } catch (error) {
    console.error("❌ Seed error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seed();