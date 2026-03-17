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

// API: Get films from local database
app.get('/api/movies', async (req, res) => {
  try {
    const movies = await prisma.movie.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// API: Smart Search
app.get('/api/movies/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const response = await axios.get(
      `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(q)}&language=en-US&include_adult=false`,
      { headers: { Authorization: process.env.TMDB_TOKEN } }
    );

    const results = response.data.results
      .filter(m => m.media_type === 'movie' || m.media_type === 'tv')
      .slice(0, 8)
      .map(m => ({
        id: m.id.toString(),
        title: m.title || m.name, 
        posterPath: m.poster_path ? `https://image.tmdb.org/t/p/w200${m.poster_path}` : null,
        voteAverage: m.vote_average?.toFixed(1),
        releaseDate: m.release_date || m.first_air_date,
        mediaType: m.media_type 
      }));

    res.json(results);
  } catch (error) {
    console.error("Search API Error:", error.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

// API: Get movie/tv details with intelligent type detection
app.get('/api/movies/:id', async (req, res) => {
  try {
    const paramId = req.params.id;
    const requestedType = req.query.type; 
    
    let movie = null;
    try {
      movie = await prisma.movie.findUnique({ where: { id: paramId } });
    } catch (dbErr) {}

    if (movie) {
      const [creditsRes, videosRes] = await Promise.all([
        axios.get(`https://api.themoviedb.org/3/movie/${movie.tmdbId}/credits`, { headers: { Authorization: process.env.TMDB_TOKEN } }),
        axios.get(`https://api.themoviedb.org/3/movie/${movie.tmdbId}/videos`, { headers: { Authorization: process.env.TMDB_TOKEN } })
      ]);
      const directorData = creditsRes.data.crew.find(c => c.job === 'Director');
      movie.director = directorData ? { id: directorData.id, name: directorData.name, profilePath: directorData.profile_path ? `https://image.tmdb.org/t/p/w200${directorData.profile_path}` : null } : null;
      movie.cast = creditsRes.data.cast.slice(0, 5).map(c => ({ id: c.id, name: c.name, character: c.character, profilePath: c.profile_path ? `https://image.tmdb.org/t/p/w200${c.profile_path}` : null }));
      const trailer = videosRes.data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
      movie.trailerKey = trailer ? trailer.key : null;
      movie.mediaType = 'movie';
      return res.json(movie);
    }

    // Auto-detect or use the provided hint
    let mediaType = requestedType || 'movie';
    let tmdbData;

    const fetchData = async (type) => {
      const main = await axios.get(`https://api.themoviedb.org/3/${type}/${paramId}`, { headers: { Authorization: process.env.TMDB_TOKEN } });
      const credits = await axios.get(`https://api.themoviedb.org/3/${type}/${paramId}/credits`, { headers: { Authorization: process.env.TMDB_TOKEN } });
      const videos = await axios.get(`https://api.themoviedb.org/3/${type}/${paramId}/videos`, { headers: { Authorization: process.env.TMDB_TOKEN } });
      return { main: main.data, credits: credits.data, videos: videos.data };
    };

    let results;
    try {
      results = await fetchData(mediaType);
    } catch (err) {
      mediaType = mediaType === 'movie' ? 'tv' : 'movie';
      results = await fetchData(mediaType);
    }

    tmdbData = results.main;
    const directorData = results.credits.crew.find(c => c.job === 'Director' || c.job === 'Executive Producer');
    const trailer = results.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');

    return res.json({
      id: paramId,
      tmdbId: paramId,
      title: tmdbData.title || tmdbData.name,
      overview: tmdbData.overview,
      posterPath: tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : null,
      backdropPath: tmdbData.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdbData.backdrop_path}` : null,
      releaseDate: tmdbData.release_date || tmdbData.first_air_date,
      voteAverage: tmdbData.vote_average,
      mediaType: mediaType,
      seasons: tmdbData.seasons ? tmdbData.seasons.filter(s => s.season_number > 0) : null,
      director: directorData ? { id: directorData.id, name: directorData.name, profilePath: directorData.profile_path ? `https://image.tmdb.org/t/p/w200${directorData.profile_path}` : null } : null,
      cast: results.credits.cast.slice(0, 8).map(c => ({ id: c.id, name: c.name, character: c.character, profilePath: c.profile_path ? `https://image.tmdb.org/t/p/w200${c.profile_path}` : null })),
      trailerKey: trailer ? trailer.key : null
    });

  } catch (error) {
    console.error("Details API Error:", error.message);
    res.status(404).json({ error: 'Content not found' });
  }
});

app.get('/api/person/:id', async (req, res) => {
  try {
    const [personRes, creditsRes] = await Promise.all([
      axios.get(`https://api.themoviedb.org/3/person/${req.params.id}`, { headers: { Authorization: process.env.TMDB_TOKEN } }),
      axios.get(`https://api.themoviedb.org/3/person/${req.params.id}/combined_credits`, { headers: { Authorization: process.env.TMDB_TOKEN } })
    ]);

    res.json({
      id: personRes.data.id,
      name: personRes.data.name,
      biography: personRes.data.biography || "No biography available.",
      profilePath: personRes.data.profile_path ? `https://image.tmdb.org/t/p/w500${personRes.data.profile_path}` : null,
      knownFor: personRes.data.known_for_department,
      birthday: personRes.data.birthday,
      movies: creditsRes.data.cast.sort((a, b) => b.popularity - a.popularity).slice(0, 8).map(m => ({
        id: m.id,
        title: m.title || m.name,
        posterPath: m.poster_path ? `https://image.tmdb.org/t/p/w200${m.poster_path}` : null,
        character: m.character,
        mediaType: m.media_type
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching person' });
  }
});

app.get('/api/movies/genre/:genreId', async (req, res) => {
  try {
    const { genreId } = req.params;
    const response = await axios.get(
      `https://api.themoviedb.org/3/discover/movie?with_genres=${genreId}&language=en-US&sort_by=primary_release_date.desc&vote_count.gte=20&page=1`,
      { headers: { Authorization: process.env.TMDB_TOKEN } }
    );

    const movies = response.data.results.slice(0, 20).map(m => ({
      id: m.id.toString(),
      title: m.title,
      posterPath: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
      voteAverage: m.vote_average,
      releaseDate: m.release_date,
      mediaType: 'movie'
    }));

    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch latest movies' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));