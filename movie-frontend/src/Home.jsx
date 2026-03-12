import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/movies')
      .then(res => res.json())
      .then(data => setMovies(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
      {movies.map(movie => (
        <Link to={`/watch/${movie.id}`} key={movie.id} className="group relative overflow-hidden rounded-lg shadow-xl hover:scale-105 transition-transform">
          <img src={movie.posterPath} alt={movie.title} className="w-full aspect-[2/3] object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <h3 className="font-bold text-sm truncate">{movie.title}</h3>
            <span className="text-xs text-red-500 font-medium">★ {movie.voteAverage.toFixed(1)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}