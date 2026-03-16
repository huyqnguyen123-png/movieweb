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

// API: Get movie details (Supports both Local DB ID and TMDb ID)
app.get('/api/movies/:id', async (req, res) => {
  try {
    const paramId = req.params.id;
    let movie = null;

    // Attempt to find the movie in the local database
    try {
      movie = await prisma.movie.findUnique({ where: { id: paramId } });
    } catch (dbErr) {
      // Ignore error if paramId is not a valid internal DB ID format
    }

    // If found in local DB, fetch additional Cast & Trailer details from TMDb
    if (movie) {
      try {
        const [creditsRes, videosRes] = await Promise.all([
          axios.get(`https://api.themoviedb.org/3/movie/${movie.tmdbId}/credits`, {
            headers: { Authorization: process.env.TMDB_TOKEN }
          }),
          axios.get(`https://api.themoviedb.org/3/movie/${movie.tmdbId}/videos`, {
            headers: { Authorization: process.env.TMDB_TOKEN }
          })
        ]);

        const directorData = creditsRes.data.crew.find(c => c.job === 'Director');
        movie.director = directorData ? {
          id: directorData.id,
          name: directorData.name,
          profilePath: directorData.profile_path ? `https://image.tmdb.org/t/p/w200${directorData.profile_path}` : null
        } : null;

        movie.cast = creditsRes.data.cast.slice(0, 5).map(c => ({
          id: c.id,
          name: c.name,
          character: c.character,
          profilePath: c.profile_path ? `https://image.tmdb.org/t/p/w200${c.profile_path}` : null
        })) || [];

        const trailer = videosRes.data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
        movie.trailerKey = trailer ? trailer.key : null;
      } catch (tmdbErr) {
        console.error("TMDb API Error for local movie:", tmdbErr.message);
        movie.director = null;
        movie.cast = [];
        movie.trailerKey = null;
      }

      return res.json(movie);
    }

    // If NOT found in local DB, fetch EVERYTHING directly from TMDb
    const [tmdbMovieRes, creditsRes, videosRes] = await Promise.all([
      axios.get(`https://api.themoviedb.org/3/movie/${paramId}`, {
        headers: { Authorization: process.env.TMDB_TOKEN }
      }),
      axios.get(`https://api.themoviedb.org/3/movie/${paramId}/credits`, {
        headers: { Authorization: process.env.TMDB_TOKEN }
      }),
      axios.get(`https://api.themoviedb.org/3/movie/${paramId}/videos`, {
        headers: { Authorization: process.env.TMDB_TOKEN }
      })
    ]);

    const tmdbMovie = tmdbMovieRes.data;
    const directorData = creditsRes.data.crew.find(c => c.job === 'Director');
    const trailer = videosRes.data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');

    // Format the TMDb response to perfectly match Frontend schema requirements
    const formattedMovie = {
      id: paramId,
      tmdbId: paramId,
      title: tmdbMovie.title,
      overview: tmdbMovie.overview,
      posterPath: tmdbMovie.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}` : null,
      backdropPath: tmdbMovie.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdbMovie.backdrop_path}` : null,
      releaseDate: tmdbMovie.release_date,
      voteAverage: tmdbMovie.vote_average,
      director: directorData ? {
        id: directorData.id,
        name: directorData.name,
        profilePath: directorData.profile_path ? `https://image.tmdb.org/t/p/w200${directorData.profile_path}` : null
      } : null,
      cast: creditsRes.data.cast.slice(0, 5).map(c => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profilePath: c.profile_path ? `https://image.tmdb.org/t/p/w200${c.profile_path}` : null
      })) || [],
      trailerKey: trailer ? trailer.key : null
    };

    return res.json(formattedMovie);

  } catch (error) {
    console.error("Server error or TMDb movie not found:", error.message);
    res.status(404).json({ error: 'Movie not found' });
  }
});

// API: Actor/Director Details & Movie Credits
app.get('/api/person/:id', async (req, res) => {
  try {
    const [personRes, creditsRes] = await Promise.all([
      axios.get(`https://api.themoviedb.org/3/person/${req.params.id}`, {
        headers: { Authorization: process.env.TMDB_TOKEN }
      }),
      axios.get(`https://api.themoviedb.org/3/person/${req.params.id}/movie_credits`, {
        headers: { Authorization: process.env.TMDB_TOKEN }
      })
    ]);

    const person = {
      id: personRes.data.id,
      name: personRes.data.name,
      biography: personRes.data.biography || "No biography available.",
      profilePath: personRes.data.profile_path ? `https://image.tmdb.org/t/p/w500${personRes.data.profile_path}` : null,
      knownFor: personRes.data.known_for_department,
      birthday: personRes.data.birthday,
      // Fetch the top 8 most popular movies 
      movies: creditsRes.data.cast.sort((a, b) => b.popularity - a.popularity).slice(0, 8).map(m => ({
        id: m.id,
        title: m.title,
        posterPath: m.poster_path ? `https://image.tmdb.org/t/p/w200${m.poster_path}` : null,
        character: m.character
      }))
    };
    
    res.json(person);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching person' });
  }
});

// API: Fetch movies by specific TMDb Genre ID for the homepage categories
app.get('/api/movies/genre/:genreId', async (req, res) => {
  try {
    const { genreId } = req.params;
    
    // Discover movies associated with the provided genre ID, sorted by popularity
    const response = await axios.get(
      `https://api.themoviedb.org/3/discover/movie?with_genres=${genreId}&language=en-US&sort_by=popularity.desc&page=1`,
      { headers: { Authorization: process.env.TMDB_TOKEN } }
    );

    // Map and format the top 10 results to match the frontend expectations
    const movies = response.data.results.slice(0, 20).map(m => ({
      id: m.id.toString(),
      title: m.title,
      posterPath: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
      voteAverage: m.vote_average
    }));

    res.json(movies);
  } catch (error) {
    console.error("Error fetching genre:", error.message);
    res.status(500).json({ error: 'Failed to fetch movies by genre' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));