// movie-backend/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import axios from 'axios';
import bcrypt from 'bcryptjs';

const { PrismaClient } = pkg;
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize PostgreSQL connection pool and Prisma adapter
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// AUTHENTICATION ROUTES
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, country, password } = req.body;

    // Check if Email already exists
    const existingEmail = await prisma.user.findUnique({ 
      where: { email: email } 
    });

    if (existingEmail) {
      return res.status(400).json({ message: 'This email is already registered!' });
    }

    // Check if Phone number already exists (if user provided one)
    if (phone && phone.trim() !== '') {
      const existingPhone = await prisma.user.findFirst({ 
        where: { phone: phone } 
      });

      if (existingPhone) {
        return res.status(400).json({ message: 'This phone number is already in use!' });
      }
    }

    // Hash password and create new user
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

// USER PERSONALIZATION ROUTES

// Watch History
app.post('/api/user/history', async (req, res) => {
  try {
    const { userId, tmdbId, title, posterPath, mediaType, season, episode, stoppedAt } = req.body;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const existing = await prisma.watchHistory.findFirst({
      where: { userId, tmdbId }
    });

    if (existing) {
      await prisma.watchHistory.update({
        where: { id: existing.id },
        data: { 
          watchedAt: new Date(),
          season: season !== undefined ? season : existing.season,
          episode: episode !== undefined ? episode : existing.episode,
          stoppedAt: stoppedAt !== undefined ? stoppedAt : existing.stoppedAt
        }
      });
    } else {
      await prisma.watchHistory.create({
        data: { userId, tmdbId, title, posterPath, mediaType, season, episode, stoppedAt }
      });
    }
    res.status(200).json({ message: 'History updated' });
  } catch (error) {
    console.error("History Update Error:", error);
    res.status(500).json({ error: 'Failed to update history' });
  }
});

app.get('/api/user/:userId/history', async (req, res) => {
  try {
    const history = await prisma.watchHistory.findMany({
      where: { userId: req.params.userId },
      orderBy: { watchedAt: 'desc' }
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.get('/api/user/:userId/history/:tmdbId', async (req, res) => {
  try {
    const progress = await prisma.watchHistory.findFirst({
      where: { 
        userId: req.params.userId,
        tmdbId: req.params.tmdbId
      }
    });
    res.json(progress || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch specific history' });
  }
});

// Watch Later
app.post('/api/user/watch-later', async (req, res) => {
  try {
    const { userId, tmdbId, title, posterPath, mediaType } = req.body;
    
    const existing = await prisma.watchLater.findUnique({
      where: { userId_tmdbId: { userId, tmdbId } }
    });

    if (existing) {
      await prisma.watchLater.delete({ where: { id: existing.id } });
      res.status(200).json({ message: 'Removed from Watch Later', isAdded: false });
    } else {
      await prisma.watchLater.create({
        data: { userId, tmdbId, title, posterPath, mediaType }
      });
      res.status(200).json({ message: 'Added to Watch Later', isAdded: true });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle watch later' });
  }
});

app.get('/api/user/:userId/watch-later', async (req, res) => {
  try {
    const list = await prisma.watchLater.findMany({
      where: { userId: req.params.userId },
      orderBy: { addedAt: 'desc' }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch watch later' });
  }
});

// Playlists 
app.post('/api/user/playlists', async (req, res) => {
  try {
    const { userId, name } = req.body;
    const playlist = await prisma.playlist.create({
      data: { userId, name }
    });
    res.status(201).json({ ...playlist, items: [], itemCount: 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

app.get('/api/user/:userId/playlists', async (req, res) => {
  try {
    const playlists = await prisma.playlist.findMany({
      where: { userId: req.params.userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });
    
    const formatted = playlists.map(pl => ({
      ...pl,
      itemCount: pl.items.length
    }));
    
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

app.delete('/api/user/playlists/:id', async (req, res) => {
  try {
    await prisma.playlist.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: 'Playlist deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

app.post('/api/user/playlists/:playlistId/items', async (req, res) => {
  try {
    const { tmdbId, title, posterPath, mediaType } = req.body;
    const existing = await prisma.playlistItem.findFirst({
       where: { playlistId: req.params.playlistId, tmdbId }
    });
    if (existing) return res.status(400).json({message: 'Already in playlist'});
    
    const item = await prisma.playlistItem.create({
      data: { playlistId: req.params.playlistId, tmdbId, title, posterPath, mediaType }
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Get a specific playlist by ID with its items
app.get('/api/playlists/:id', async (req, res) => {
  try {
    const playlist = await prisma.playlist.findUnique({
      where: { id: req.params.id },
      include: { 
        items: {
          orderBy: { addedAt: 'desc' }
        } 
      }
    });
    
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch playlist details' });
  }
});

// MOVIE API ROUTES
const isValidMovie = (m) => {
  const title = m.title || m.name;
  const releaseDate = m.release_date || m.first_air_date;
  const poster = m.poster_path;

  return (
    title &&
    title.toLowerCase() !== 'unknown' &&
    releaseDate &&
    releaseDate !== '' &&
    poster !== null &&
    poster !== undefined
  );
};

const SMART_FILTER_MAP = {
  'hành động': { genre: 28 }, 'action': { genre: 28 },
  'phiêu lưu': { genre: 12 }, 'adventure': { genre: 12 },
  'hoạt hình': { genre: 16 }, 'animation': { genre: 16 },
  'hài': { genre: 35 }, 'comedy': { genre: 35 },
  'hình sự': { genre: 80 }, 'crime': { genre: 80 },
  'tài liệu': { genre: 99 }, 'documentary': { genre: 99 },
  'chính kịch': { genre: 18 }, 'drama': { genre: 18 },
  'gia đình': { genre: 10751 }, 'family': { genre: 10751 },
  'viễn tưởng': { genre: 878 }, 'sci-fi': { genre: 878 }, 'khoa học viễn tưởng': { genre: 878 },
  'kinh dị': { genre: 27 }, 'horror': { genre: 27 },
  'nhạc': { genre: 10402 }, 'music': { genre: 10402 },
  'bí ẩn': { genre: 9648 }, 'mystery': { genre: 9648 },
  'lãng mạn': { genre: 10749 }, 'romance': { genre: 10749 }, 'tình cảm': { genre: 10749 },
  'chiến tranh': { genre: 10752 }, 'war': { genre: 10752 },
  'phim hàn': { language: 'ko' }, 'hàn quốc': { language: 'ko' }, 'korean': { language: 'ko' },
  'phim trung': { language: 'zh' }, 'trung quốc': { language: 'zh' }, 'chinese': { language: 'zh' },
  'phim thái': { language: 'th' }, 'thái lan': { language: 'th' }, 'thai': { language: 'th' },
  'anime': { genre: 16, language: 'ja' },
};

app.get('/api/movies', async (req, res) => {
  try {
    const movies = await prisma.movie.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/movies/trending', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/trending/movie/day?language=en-US`,
      { headers: { Authorization: process.env.TMDB_TOKEN } }
    );

    const movies = response.data.results
      .filter(isValidMovie)
      .slice(0, 20)
      .map(m => ({
        id: m.id.toString(),
        title: m.title,
        posterPath: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
        voteAverage: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0,
        releaseDate: m.release_date,
        mediaType: 'movie'
      }));

    res.json(movies);
  } catch (error) {
    console.error("Trending API Error:", error.message);
    res.status(500).json({ error: 'Failed to fetch trending movies' });
  }
});

app.get('/api/movies/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const queryLower = q.toLowerCase().trim();
    const smartFilter = SMART_FILTER_MAP[queryLower];
    const headers = { Authorization: process.env.TMDB_TOKEN };
    let rawResults = [];

    if (smartFilter) {
      const today = new Date().toISOString().split('T')[0];

      let movieQuery = `sort_by=popularity.desc&primary_release_date.lte=${today}&language=en-US&page=1`;
      let tvQuery = `sort_by=popularity.desc&first_air_date.lte=${today}&language=en-US&page=1`;

      if (smartFilter.genre) {
        movieQuery += `&with_genres=${smartFilter.genre}`;
        tvQuery += `&with_genres=${smartFilter.genre}`;
      }
      if (smartFilter.language) {
        movieQuery += `&with_original_language=${smartFilter.language}`;
        tvQuery += `&with_original_language=${smartFilter.language}`;
      }

      const [movieRes, tvRes] = await Promise.all([
        axios.get(`https://api.themoviedb.org/3/discover/movie?${movieQuery}`, { headers }),
        axios.get(`https://api.themoviedb.org/3/discover/tv?${tvQuery}`, { headers })
      ]);

      const movies = (movieRes.data.results || []).map(item => ({ ...item, mediaType: 'movie', releaseDate: item.release_date, popularity: item.popularity }));
      const tvShows = (tvRes.data.results || []).map(item => ({ ...item, mediaType: 'tv', releaseDate: item.first_air_date, title: item.name, popularity: item.popularity }));

      rawResults = [...movies, ...tvShows].sort((a, b) => b.popularity - a.popularity);
    } else {
      const response = await axios.get(
        `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(q)}&language=en-US&include_adult=false`,
        { headers }
      );
      rawResults = (response.data.results || []);
    }

    const results = rawResults
      .filter(m => (m.media_type !== 'person') && isValidMovie(m))
      .slice(0, 100)
      .map(m => ({
        id: m.id.toString(),
        title: m.title || m.name,
        posterPath: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
        voteAverage: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0,
        releaseDate: m.release_date || m.first_air_date,
        mediaType: m.media_type || (m.title ? 'movie' : 'tv')
      }));

    res.json(results);
  } catch (error) {
    console.error("Search API Error:", error.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/api/movies/:id', async (req, res) => {
  try {
    const paramId = req.params.id;
    const requestedType = req.query.type;

    let movie = null;
    try {
      movie = await prisma.movie.findUnique({ where: { id: paramId } });
    } catch (dbErr) {
    }

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

    let mediaType = requestedType || 'movie';
    let results;

    const fetchData = async (type) => {
      const main = await axios.get(`https://api.themoviedb.org/3/${type}/${paramId}`, { headers: { Authorization: process.env.TMDB_TOKEN } });
      const credits = await axios.get(`https://api.themoviedb.org/3/${type}/${paramId}/credits`, { headers: { Authorization: process.env.TMDB_TOKEN } });
      const videos = await axios.get(`https://api.themoviedb.org/3/${type}/${paramId}/videos`, { headers: { Authorization: process.env.TMDB_TOKEN } });
      return { main: main.data, credits: credits.data, videos: videos.data };
    };

    try {
      results = await fetchData(mediaType);
    } catch (err) {
      mediaType = mediaType === 'movie' ? 'tv' : 'movie';
      results = await fetchData(mediaType);
    }

    const tmdbData = results.main;
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

app.get('/api/movies/genre/:genreId', async (req, res) => {
  try {
    const { genreId } = req.params;
    const response = await axios.get(
      `https://api.themoviedb.org/3/discover/movie?with_genres=${genreId}&language=en-US&sort_by=primary_release_date.desc&vote_count.gte=20&page=1`,
      { headers: { Authorization: process.env.TMDB_TOKEN } }
    );

    const movies = response.data.results
      .filter(isValidMovie)
      .slice(0, 20)
      .map(m => ({
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
      movies: creditsRes.data.cast
        .filter(m => m.poster_path)
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 8)
        .map(m => ({
          id: m.id,
          title: m.title || m.name,
          posterPath: `https://image.tmdb.org/t/p/w200${m.poster_path}`,
          character: m.character,
          mediaType: m.media_type
        }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching person' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));