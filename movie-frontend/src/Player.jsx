import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

function Player() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:5000/api/movies/${id}`)
      .then((res) => res.json())
      .then((data) => setMovie(data))
      .catch((err) => console.error('Fetch error:', err));
  }, [id]);

  if (!movie) return <div className="text-center mt-20 text-gray-400">Loading movie data...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <Link to="/" className="text-gray-400 hover:text-white mb-4 inline-block">
        &larr; Back to Home
      </Link>
      
      {movie.trailer ? (
        <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-2xl mb-8">
          <iframe
            width="100%" height="100%"
            src={`https://www.youtube.com/embed/${movie.trailer.key}`}
            title="YouTube video player"
            frameBorder="0"
            allowFullScreen
          ></iframe>
        </div>
      ) : (
        <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center mb-8 border border-gray-800">
          <p className="text-gray-500">Official trailer not available</p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <h1 className="text-4xl font-bold">{movie.title}</h1>
          <div className="flex gap-4 text-gray-400 mt-2 text-sm font-medium">
            <span>Release: {movie.releaseDate}</span>
            <span>Rating: {movie.voteAverage}/10</span>
          </div>
          <p className="mt-6 text-lg text-gray-300 leading-relaxed">{movie.overview}</p>
        </div>

        {movie.cast && (
          <div>
            <h3 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">Top Cast</h3>
            <div className="space-y-4">
              {movie.cast.map(actor => (
                <div key={actor.id} className="flex items-center gap-3">
                  {actor.profile_path ? (
                    <img 
                      src={`https://image.tmdb.org/t/p/w200${actor.profile_path}`} 
                      className="w-12 h-12 rounded-full object-cover border border-gray-600"
                      alt={actor.name}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-800 border border-gray-700"></div>
                  )}
                  <div>
                    <p className="font-medium text-sm text-gray-200">{actor.name}</p>
                    <p className="text-xs text-gray-500">{actor.character}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Player;