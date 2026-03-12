import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function Player() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:5000/api/movies/${id}`)
      .then(res => res.json())
      .then(data => setMovie(data))
      .catch(err => console.error(err));
  }, [id]);

  if (!movie) return <div className="text-center p-20">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link to="/" className="text-gray-400 hover:text-white mb-4 inline-block">← Back</Link>
      <div className="bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800">
        <video controls className="w-full aspect-video" poster={movie.backdropPath}>
          <source src={movie.videoUrl} type="application/x-mpegURL" />
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="p-4">
        <h1 className="text-4xl font-black mb-2">{movie.title}</h1>
        <p className="text-gray-400 text-lg leading-relaxed">{movie.overview}</p>
      </div>
    </div>
  );
}