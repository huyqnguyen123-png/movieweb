import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function Home() {
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/movies')
      .then((res) => res.json())
      .then((data) => setMovies(data))
      .catch((err) => console.error('Fetch error:', err));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Trending Movies</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {movies.map((movie) => (
          <Link to={`/watch/${movie.id}`} key={movie.id} className="group">
            <div className="overflow-hidden rounded-lg shadow-lg relative aspect-[2/3]">
              <img 
                src={movie.posterPath} 
                alt={movie.title} 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black p-4">
                <p className="font-medium text-sm truncate">{movie.title}</p>
                <p className="text-xs text-gray-400">{movie.releaseDate?.split('-')[0]}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Home;