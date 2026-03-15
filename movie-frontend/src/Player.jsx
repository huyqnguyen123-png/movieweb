import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, PlayCircle, Star, Calendar, Clapperboard, Users, Loader2, X } from 'lucide-react';

export default function Player() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    setIsLoading(true);
    
    fetch(`http://localhost:5000/api/movies/${id}`)
      .then(res => res.json())
      .then(data => {
        setMovie(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, [id]);

  if (isLoading || !movie) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
        <p className="text-gray-400 font-medium animate-pulse">Loading movie details...</p>
      </div>
    );
  }

  const handleWatchTrailer = () => {
    setShowTrailer(true);
    setTimeout(() => {
      videoRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-[fadeIn_0.5s_ease-in-out]">
      <Link 
        to="/" 
        className="inline-flex items-center px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white rounded-full transition-all group font-semibold shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-gray-700 hover:border-gray-500 w-fit"
      >
        <ArrowLeft className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" />
        Back to Home
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          <img 
            src={movie.posterPath} 
            alt={movie.title} 
            className="w-full rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-gray-800"
          />
          {!showTrailer && (
            <button 
              onClick={handleWatchTrailer}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center transition-all hover:scale-[1.02] active:scale-95"
            >
              <PlayCircle className="w-6 h-6 mr-2" />
              Watch Trailer
            </button>
          )}
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black mb-4 text-white drop-shadow-md">{movie.title}</h1>
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-300 font-medium">
              <span className="flex items-center bg-gray-800 px-3 py-1 rounded-full text-yellow-400">
                <Star className="w-4 h-4 mr-1 fill-current" /> {movie.voteAverage?.toFixed(1)} Rating
              </span>
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" /> Release: {movie.releaseDate}
              </span>
            </div>
          </div>

          <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
            <h3 className="text-xl font-bold text-white mb-3">Storyline</h3>
            <p className="text-gray-300 text-lg leading-relaxed">{movie.overview}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <Clapperboard className="w-5 h-5 mr-2 text-red-500" /> Director
              </h3>
              <p className="text-gray-400">{movie.director}</p>
            </div>
            <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-red-500" /> Top Cast
              </h3>
              <p className="text-gray-400">{movie.cast && movie.cast.length > 0 ? movie.cast.join(', ') : "Unknown"}</p>
            </div>
          </div>

          {/* Video Player */}
          {showTrailer && (
            <div ref={videoRef} className="pt-4 mt-8 border-t border-gray-800 animate-[fadeIn_0.5s_ease-in-out]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center">
                  <PlayCircle className="w-6 h-6 mr-2 text-red-500" /> Official Trailer
                </h3>
                
                <button 
                  onClick={() => setShowTrailer(false)}
                  className="inline-flex items-center px-5 py-2.5 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-full transition-all font-bold shadow-lg border border-red-600/30 hover:border-red-600"
                >
                  <X className="w-5 h-5 mr-1" /> Close Trailer
                </button>
              </div>
              
              <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800 ring-4 ring-gray-900">
                <video controls autoPlay className="w-full aspect-video outline-none" poster={movie.backdropPath}>
                  <source src={movie.videoUrl} type="application/x-mpegURL" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}