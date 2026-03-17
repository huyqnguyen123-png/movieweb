import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, PlayCircle, Star, Calendar, Clapperboard, Users, Loader2, X, User, List } from 'lucide-react';

const formatDate = (dateString) => {
  if (!dateString) return "Unknown";
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
};

export default function Player() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const mediaType = searchParams.get('type') || 'movie'; // Detect movie or tv from URL

  const [movie, setMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMedia, setActiveMedia] = useState(null);

  // TV Series States
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [personDetails, setPersonDetails] = useState(null);
  const [isPersonLoading, setIsPersonLoading] = useState(false);

  const videoRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    setIsLoading(true);
    setActiveMedia(null); 
    
    // Fetch with type hint to backend
    fetch(`http://localhost:5000/api/movies/${id}?type=${mediaType}`)
      .then(res => res.json())
      .then(data => {
        setMovie(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, [id, mediaType]);

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

  const closePersonModal = () => {
    setSelectedPerson(null);
    setPersonDetails(null);
  };

  const handleMediaSelect = (type) => {
    setActiveMedia(type);
    setTimeout(() => {
      videoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const getEmbedUrl = () => {
    if (movie?.mediaType === 'tv' || mediaType === 'tv') {
      return `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`;
    }
    return `https://vidsrc.xyz/embed/movie?tmdb=${id}`;
  };

  if (isLoading || !movie) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
        <p className="text-gray-400 font-medium animate-pulse">Loading content details...</p>
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
        <div className="lg:col-span-1 space-y-6">
          <img 
            src={movie.posterPath} 
            alt={movie.title} 
            className="w-full rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-gray-800"
          />
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => handleMediaSelect('movie')}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(220,38,38,0.4)]"
            >
              <PlayCircle className="w-5 h-5" />
              Watch Now
            </button>

            <button 
              onClick={() => handleMediaSelect('trailer')}
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 border border-gray-700 shadow-md"
            >
              <Clapperboard className="w-5 h-5" />
              Watch Trailer
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black mb-4 text-white drop-shadow-md">{movie.title}</h1>
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-300 font-medium">
              <span className="flex items-center bg-gray-800 px-3 py-1 rounded-full text-yellow-400 border border-gray-700">
                <Star className="w-4 h-4 mr-1 fill-current" /> {movie.voteAverage?.toFixed(1)} Rating
              </span>
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" /> Release: {formatDate(movie.releaseDate)}
              </span>
            </div>
          </div>

          <div className="bg-gray-900/60 p-6 rounded-2xl border border-gray-800 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-3">Storyline</h3>
            <p className="text-gray-300 text-lg leading-relaxed">{movie.overview}</p>
          </div>

          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white flex items-center border-l-4 border-red-600 pl-3">
              <Users className="w-6 h-6 mr-2 text-red-500" /> Cast & Crew
            </h3>
            <div className="flex flex-wrap gap-4">
              {movie.director && (
                <div onClick={() => handlePersonClick(movie.director.id)} className="flex items-center bg-gray-900/80 hover:bg-gray-800 border border-gray-800 hover:border-gray-600 rounded-xl p-3 pr-6 cursor-pointer transition-all duration-300 shadow-md group w-fit">
                  <img src={movie.director.profilePath || ""} alt="" className="w-14 h-14 rounded-full object-cover mr-4 border-2 border-transparent group-hover:border-red-500 transition-colors" />
                  <div>
                    <p className="text-white font-bold text-sm group-hover:text-red-400">{movie.director.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5 flex items-center"><Clapperboard className="w-3 h-3 mr-1" /> Director</p>
                  </div>
                </div>
              )}
              {movie.cast?.map(actor => (
                <div key={actor.id} onClick={() => handlePersonClick(actor.id)} className="flex items-center bg-gray-900/80 hover:bg-gray-800 border border-gray-800 hover:border-gray-600 rounded-xl p-3 pr-6 cursor-pointer transition-all duration-300 shadow-md group w-fit">
                  <img src={actor.profilePath || ""} alt="" className="w-14 h-14 rounded-full object-cover mr-4 border-2 border-transparent group-hover:border-red-500 transition-colors" />
                  <div>
                    <p className="text-white font-bold text-sm group-hover:text-red-400">{actor.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5 italic">{actor.character}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DYNAMIC PLAYER SECTION */}
          {activeMedia && (
            <div ref={videoRef} className="pt-4 mt-8 border-t border-gray-800 animate-[fadeIn_0.5s_ease-in-out]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center">
                  {activeMedia === 'movie' ? (
                    <><PlayCircle className="w-6 h-6 mr-2 text-red-500" /> Now Playing</>
                  ) : (
                    <><Clapperboard className="w-6 h-6 mr-2 text-red-500" /> Official Trailer</>
                  )}
                </h3>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setActiveMedia(null)}
                    className="inline-flex items-center px-5 py-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-full transition-all font-bold border border-red-600/30 shadow-lg"
                  >
                    <X className="w-5 h-5 mr-1" /> Close Video
                  </button>
                </div>
              </div>

              {/* TV SERIES SELECTOR */}
              {activeMedia === 'movie' && movie.mediaType === 'tv' && (
                <div className="animate-[fadeIn_0.4s_ease-out] mb-8 group">
                  <div className="flex flex-col md:flex-row gap-4 p-5 bg-[#121212]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl transition-all group-hover:border-red-600/30">
      
                    {/* Season Selection */}
                    <div className="flex-1 space-y-3">
                      <label className="text-[11px] uppercase font-black text-gray-400 tracking-[0.2em] flex items-center ml-1">
                        <List className="w-3.5 h-3.5 mr-2 text-red-500" /> 
                        Choose Season
                      </label>
                      <div className="relative">
                        <select 
                          value={season} 
                          onChange={(e) => { setSeason(Number(e.target.value)); setEpisode(1); }}
                          className="w-full appearance-none bg-black/40 border border-white/10 text-white rounded-xl py-3.5 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600 transition-all cursor-pointer hover:bg-black/60"
                        >
                          {movie.seasons?.map(s => (
                            <option key={s.id} value={s.season_number} className="bg-[#1a1a1a] text-white py-2">
                              {s.name} ({s.episode_count} Episodes)
                            </option>
                          ))}
                        </select>
                        {/* Custom Arrow Icon for Select */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                    </div>

                    {/* Episode Selection */}
                    <div className="w-full md:w-48 space-y-3">
                      <label className="text-[11px] uppercase font-black text-gray-400 tracking-[0.2em] flex items-center ml-1">
                        <PlayCircle className="w-3.5 h-3.5 mr-2 text-red-500" /> 
                        Episode
                      </label>
                      <div className="relative flex items-center">
                        <button 
                          onClick={() => setEpisode(prev => Math.max(1, prev - 1))}
                          className="absolute left-1 w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-red-600 rounded-lg transition-colors text-white"
                        >
                          -
                        </button>
                        <input 
                          type="number" 
                          min="1" 
                          value={episode} 
                          onChange={(e) => setEpisode(Number(e.target.value))}
                          className="w-full bg-black/40 border border-white/10 text-white rounded-xl py-3.5 px-10 text-center text-sm font-black focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button 
                          onClick={() => setEpisode(prev => prev + 1)}
                          className="absolute right-1 w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-red-600 rounded-lg transition-colors text-white"
                        >
                          +
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800 ring-4 ring-gray-900">
                {activeMedia === 'movie' ? (
                  <iframe
                    className="w-full aspect-video outline-none"
                    src={getEmbedUrl()}
                    title={`${movie.title} Player`}
                    frameBorder="0"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <iframe
                    className="w-full aspect-video outline-none"
                    src={`https://www.youtube.com/embed/${movie.trailerKey}?autoplay=1&rel=0&loop=1&playlist=${movie.trailerKey}`}
                    title="Trailer"
                    frameBorder="0"
                    allowFullScreen
                  ></iframe>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: PERSON DETAILS (REMAINED SAME AS YOURS) */}
      {selectedPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-in-out]">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closePersonModal}></div>
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-gray-800 bg-gray-900 z-10">
              <h2 className="text-xl font-bold text-white flex items-center"><User className="w-5 h-5 mr-2 text-red-500" /> Biography</h2>
              <button onClick={closePersonModal} className="text-gray-400 hover:text-white bg-gray-800 hover:bg-red-600 rounded-full p-1.5 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="overflow-y-auto p-6 custom-scrollbar">
              {isPersonLoading ? <Loader2 className="w-10 h-10 text-red-600 animate-spin mx-auto my-20" /> : personDetails && (
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row gap-6">
                    <img src={personDetails.profilePath || ""} alt="" className="w-40 h-56 object-cover rounded-xl shadow-lg border border-gray-700 mx-auto sm:mx-0" />
                    <div className="space-y-4 text-center sm:text-left">
                      <h2 className="text-3xl font-black text-white">{personDetails.name}</h2>
                      <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                        <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-md text-sm border border-gray-700">{personDetails.knownFor}</span>
                        {personDetails.birthday && <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-md text-sm border border-gray-700">Born: {formatDate(personDetails.birthday)}</span>}
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed text-justify">{personDetails.biography}</p>
                    </div>
                  </div>
                  {personDetails.movies?.length > 0 && (
                    <div className="pt-6 border-t border-gray-800">
                      <h3 className="text-lg font-bold text-white mb-4">Known For</h3>
                      <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar">
                        {personDetails.movies.map(m => (
                          <Link to={`/watch/${m.id}?type=${m.mediaType || 'movie'}`} key={m.id} onClick={closePersonModal} className="w-32 shrink-0 group">
                            <img src={m.posterPath || ""} alt="" className="w-32 h-48 object-cover rounded-lg shadow-md border border-gray-800 group-hover:border-red-500 transition-all" />
                            <p className="text-white text-sm font-bold mt-2 truncate group-hover:text-red-400">{m.title}</p>
                            <p className="text-gray-500 text-xs truncate">{m.character}</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <style>{`.custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }.custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 10px; }.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #dc2626; }`}</style>
    </div>
  );
}