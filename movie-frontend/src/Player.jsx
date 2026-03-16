import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, PlayCircle, Star, Calendar, Clapperboard, Users, Loader2, X, User } from 'lucide-react';

export default function Player() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // State to manage which media is currently playing ('movie', 'trailer', or null)
  const [activeMedia, setActiveMedia] = useState(null);
  
  // States for Actor/Director
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [personDetails, setPersonDetails] = useState(null);
  const [isPersonLoading, setIsPersonLoading] = useState(false);

  const videoRef = useRef(null);

  // Scroll to top and fetch movie data when the ID changes
  useEffect(() => {
    window.scrollTo(0, 0);
    setIsLoading(true);
    setActiveMedia(null); 
    
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

  // Fetch person details from API when clicking on their avatar
  const handlePersonClick = (personId) => {
    if (!personId) return;
    setSelectedPerson(personId);
    setIsPersonLoading(true);
    
    fetch(`http://localhost:5000/api/person/${personId}`)
      .then(res => res.json())
      .then(data => {
        setPersonDetails(data);
        setIsPersonLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsPersonLoading(false);
      });
  };

  // Close the person details modal
  const closePersonModal = () => {
    setSelectedPerson(null);
    setPersonDetails(null);
  };

  // Handle media selection and smooth scroll to player
  const handleMediaSelect = (type) => {
    setActiveMedia(type);
    setTimeout(() => {
      videoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  if (isLoading || !movie) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
        <p className="text-gray-400 font-medium animate-pulse">Loading movie details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-[fadeIn_0.5s_ease-in-out] pb-10">
      <Link 
        to="/" 
        className="inline-flex items-center px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white rounded-full transition-all group font-semibold shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-gray-700 hover:border-gray-500 w-fit"
      >
        <ArrowLeft className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" />
        Back to Home
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Poster and Action Buttons */}
        <div className="lg:col-span-1 space-y-6">
          <img 
            src={movie.posterPath} 
            alt={movie.title} 
            className="w-full rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-gray-800"
          />
          
          <div className="flex flex-col gap-3">
            {/* Watch Movie Button - Render only if the movie has a valid videoUrl in the database */}
            {movie.videoUrl && (
              <button 
                onClick={() => handleMediaSelect('movie')}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(220,38,38,0.4)]"
              >
                <PlayCircle className="w-6 h-6 mr-2" />
                Watch Movie
              </button>
            )}

            {/* Watch Trailer Button - Styling adjusts automatically based on movie button existence */}
            <button 
              onClick={() => handleMediaSelect('trailer')}
              className={`w-full font-bold py-4 px-6 rounded-xl flex items-center justify-center transition-all hover:scale-[1.02] active:scale-95 ${
                movie.videoUrl 
                  ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700' 
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]'
              }`}
            >
              <Clapperboard className="w-6 h-6 mr-2" />
              Watch Trailer
            </button>
          </div>
        </div>

        {/* Right Column: Movie Information */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black mb-4 text-white drop-shadow-md">{movie.title}</h1>
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-300 font-medium">
              <span className="flex items-center bg-gray-800 px-3 py-1 rounded-full text-yellow-400 border border-gray-700">
                <Star className="w-4 h-4 mr-1 fill-current" /> {movie.voteAverage?.toFixed(1)} Rating
              </span>
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" /> Release: {movie.releaseDate}
              </span>
            </div>
          </div>

          <div className="bg-gray-900/60 p-6 rounded-2xl border border-gray-800 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-3">Storyline</h3>
            <p className="text-gray-300 text-lg leading-relaxed">{movie.overview}</p>
          </div>

          {/* Director & Cast Section */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white flex items-center border-l-4 border-red-600 pl-3">
              <Users className="w-6 h-6 mr-2 text-red-500" /> Cast & Crew
            </h3>
            
            <div className="flex flex-wrap gap-4">
              {/* Director Card */}
              {movie.director && (
                <div 
                  onClick={() => handlePersonClick(movie.director.id)}
                  className="flex items-center bg-gray-900/80 hover:bg-gray-800 border border-gray-800 hover:border-gray-600 rounded-xl p-3 pr-6 cursor-pointer transition-all duration-300 shadow-md group w-fit"
                >
                  {movie.director.profilePath ? (
                    <img src={movie.director.profilePath} alt={movie.director.name} className="w-14 h-14 rounded-full object-cover mr-4 border-2 border-transparent group-hover:border-red-500 transition-colors" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mr-4">
                      <User className="w-6 h-6 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <p className="text-white font-bold text-sm group-hover:text-red-400 transition-colors">{movie.director.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5 flex items-center">
                      <Clapperboard className="w-3 h-3 mr-1" /> Director
                    </p>
                  </div>
                </div>
              )}

              {/* Cast Cards */}
              {movie.cast && movie.cast.map(actor => (
                <div 
                  key={`cast-${actor.id}`}
                  onClick={() => handlePersonClick(actor.id)}
                  className="flex items-center bg-gray-900/80 hover:bg-gray-800 border border-gray-800 hover:border-gray-600 rounded-xl p-3 pr-6 cursor-pointer transition-all duration-300 shadow-md group w-fit"
                >
                  {actor.profilePath ? (
                    <img src={actor.profilePath} alt={actor.name} className="w-14 h-14 rounded-full object-cover mr-4 border-2 border-transparent group-hover:border-red-500 transition-colors" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mr-4">
                      <User className="w-6 h-6 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <p className="text-white font-bold text-sm group-hover:text-red-400 transition-colors">{actor.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5 italic">{actor.character}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Media Player (Trailer or External Movie Server) */}
          {activeMedia && (
            <div ref={videoRef} className="pt-4 mt-8 border-t border-gray-800 animate-[fadeIn_0.5s_ease-in-out]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center">
                  {activeMedia === 'movie' ? (
                    <><PlayCircle className="w-6 h-6 mr-2 text-red-500" /> Now Playing</>
                  ) : (
                    <><Clapperboard className="w-6 h-6 mr-2 text-red-500" /> Official Trailer</>
                  )}
                </h3>
                <button 
                  onClick={() => setActiveMedia(null)}
                  className="inline-flex items-center px-5 py-2.5 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-full transition-all font-bold shadow-lg border border-red-600/30 hover:border-red-600"
                >
                  <X className="w-5 h-5 mr-1" /> Close Video
                </button>
              </div>
              
              <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800 ring-4 ring-gray-900">
                {activeMedia === 'movie' ? (
                  // Fetch real full movies directly from an external streaming server using TMDb ID
                  <iframe
                    className="w-full aspect-video outline-none"
                    src={`https://vidsrc.xyz/embed/movie?tmdb=${movie.tmdbId}`}
                    title={`${movie.title} Full Movie`}
                    frameBorder="0"
                    allowFullScreen
                  ></iframe>
                ) : movie.trailerKey ? (
                  // YouTube Iframe for Trailers with loop enabled to hide suggestions
                  <iframe
                    className="w-full aspect-video outline-none"
                    src={`https://www.youtube.com/embed/${movie.trailerKey}?autoplay=1&rel=0&loop=1&playlist=${movie.trailerKey}`}
                    title={`${movie.title} Trailer`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                ) : (
                  // Fallback UI if no trailer is available
                  <div className="w-full aspect-video flex flex-col items-center justify-center bg-gray-900 text-gray-500">
                    <PlayCircle className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium">Trailer is not available for this movie.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/*MODAL: PERSON DETAILS*/}
      {selectedPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-[fadeIn_0.2s_ease-in-out]">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closePersonModal}></div>
          
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-gray-800 bg-gray-900 z-10">
              <h2 className="text-xl font-bold text-white flex items-center">
                <User className="w-5 h-5 mr-2 text-red-500" /> Biography
              </h2>
              <button onClick={closePersonModal} className="text-gray-400 hover:text-white bg-gray-800 hover:bg-red-600 rounded-full p-1.5 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 custom-scrollbar">
              {isPersonLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-10 h-10 text-red-600 animate-spin mb-4" />
                  <p className="text-gray-400">Loading details...</p>
                </div>
              ) : personDetails ? (
                <div className="space-y-8">
                  {/* Top: Biography & Info */}
                  <div className="flex flex-col sm:flex-row gap-6">
                    {personDetails.profilePath ? (
                      <img src={personDetails.profilePath} alt={personDetails.name} className="w-40 h-56 object-cover rounded-xl shadow-lg border border-gray-700 shrink-0 mx-auto sm:mx-0" />
                    ) : (
                      <div className="w-40 h-56 rounded-xl bg-gray-800 flex items-center justify-center shrink-0 mx-auto sm:mx-0 border border-gray-700">
                        <User className="w-12 h-12 text-gray-600" />
                      </div>
                    )}
                    
                    <div className="space-y-4 text-center sm:text-left">
                      <h2 className="text-3xl font-black text-white">{personDetails.name}</h2>
                      <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                        <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-md text-sm font-medium border border-gray-700">
                          {personDetails.knownFor}
                        </span>
                        {personDetails.birthday && (
                          <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-md text-sm font-medium border border-gray-700">
                            Born: {personDetails.birthday}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed max-h-40 overflow-y-auto pr-2 custom-scrollbar text-justify">
                        {personDetails.biography}
                      </p>
                    </div>
                  </div>

                  {/* Bottom: Known For Movies */}
                  {personDetails.movies && personDetails.movies.length > 0 && (
                    <div className="pt-6 border-t border-gray-800">
                      <h3 className="text-lg font-bold text-white mb-4">Known For</h3>
                      <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar">
                        {personDetails.movies.map(m => (
                          <Link 
                            to={`/watch/${m.id}`} 
                            key={m.id} 
                            onClick={closePersonModal}
                            className="w-32 shrink-0 group block cursor-pointer"
                          >
                            {m.posterPath ? (
                              <img src={m.posterPath} alt={m.title} className="w-32 h-48 object-cover rounded-lg shadow-md border border-gray-800 group-hover:border-gray-500 transition-colors" />
                            ) : (
                              <div className="w-32 h-48 rounded-lg bg-gray-800 flex items-center justify-center border border-gray-800 group-hover:border-gray-500 transition-colors">
                                <Clapperboard className="w-8 h-8 text-gray-600" />
                              </div>
                            )}
                            <p className="text-white text-sm font-bold mt-2 truncate group-hover:text-red-400 transition-colors">{m.title}</p>
                            <p className="text-gray-500 text-xs truncate">{m.character || "Role unknown"}</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-10">Data not available.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSS For Scrollbar inside Modal */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(31, 41, 55, 0.5); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #dc2626; }
      `}</style>
    </div>
  );
}