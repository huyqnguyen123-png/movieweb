// movie-frontend/src/Player.jsx
import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion'; 
import { 
  ArrowLeft, PlayCircle, Star, Calendar, Clapperboard, 
  Users, X, User, List, Bookmark, BookmarkCheck, Plus, Check, ChevronDown 
} from 'lucide-react';
import MovieLoader from './MovieLoader';

const formatDate = (dateString) => {
  if (!dateString) return "Unknown";
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
};

// Animation variants for Bookmark button
const bookmarkVariants = {
  idle: { scale: 1, rotate: 0 },
  selected: { 
    scale: [1, 1.2, 1], 
    rotate: [0, -15, 0], 
    transition: { duration: 0.4, ease: "easeInOut" } 
  },
  unselected: { 
    scale: [1, 0.8, 1], 
    transition: { duration: 0.3, ease: "easeOut" } 
  }
};

export default function Player() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const mediaType = searchParams.get('type') || 'movie';
  const navigate = useNavigate(); 

  const [movie, setMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMedia, setActiveMedia] = useState(null);
  const [error, setError] = useState(false);

  // TV Series States
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [maxEpisodes, setMaxEpisodes] = useState(1); 
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false); 
  
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [personDetails, setPersonDetails] = useState(null);
  const [isPersonLoading, setIsPersonLoading] = useState(false);

  // Playlist & Watch Later States 
  const [isInWatchLater, setIsInWatchLater] = useState(false);
  const [showPlaylistDropdown, setShowPlaylistDropdown] = useState(false);
  const [customPlaylists, setCustomPlaylists] = useState([]);
  
  // Refs
  const dropdownRef = useRef(null);
  const seasonDropdownRef = useRef(null); 
  const videoRef = useRef(null);

  const [bookmarkAnimState, setBookmarkAnimState] = useState("idle");
  const [toast, setToast] = useState({ show: false, message: "" });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Helper to show toast messages
  const showToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    setIsLoading(true);
    setActiveMedia(null); 
    setError(false);
    
    fetch(`${API_URL}/api/movies/${id}?type=${mediaType}`)
      .then(res => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(data => {
        setMovie(data);
        
        if (data.mediaType === 'tv' && data.seasons && data.seasons.length > 0) {
          const firstSeason = data.seasons.find(s => s.season_number === 1) || data.seasons[0];
          setSeason(firstSeason.season_number);
          setMaxEpisodes(firstSeason.episode_count || 1);
        }

        // Check Watch Later status
        const watchLaterList = JSON.parse(localStorage.getItem('movix_watch_later')) || [];
        setIsInWatchLater(watchLaterList.some(item => item.id === data.id));

        // Save to Recently Watched
        let recent = JSON.parse(localStorage.getItem('movix_recent')) || [];
        const recentItem = { 
          id: data.id, 
          title: data.title, 
          posterPath: data.posterPath, 
          mediaType: data.mediaType || mediaType 
        };
        recent = [recentItem, ...recent.filter(item => item.id !== data.id)].slice(0, 20);
        localStorage.setItem('movix_recent', JSON.stringify(recent));

        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(true);
        setIsLoading(false);
      });
  }, [id, mediaType, API_URL]);

  useEffect(() => {
    const playlists = JSON.parse(localStorage.getItem('movix_playlists')) || [];
    setCustomPlaylists(playlists);

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowPlaylistDropdown(false);
      }
      if (seasonDropdownRef.current && !seasonDropdownRef.current.contains(event.target)) {
        setIsSeasonDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPlaylistDropdown, isSeasonDropdownOpen]);

  const handleToggleWatchLater = () => {
    if (!movie) return;
    let watchLaterList = JSON.parse(localStorage.getItem('movix_watch_later')) || [];
    
    if (isInWatchLater) {
      watchLaterList = watchLaterList.filter(item => item.id !== movie.id);
      setIsInWatchLater(false);
      setBookmarkAnimState("unselected"); 
      showToast("Removed from Watch Later"); 
    } else {
      watchLaterList.unshift({
        id: movie.id,
        title: movie.title,
        posterPath: movie.posterPath,
        mediaType: movie.mediaType || mediaType
      });
      setIsInWatchLater(true);
      setBookmarkAnimState("selected");
      showToast("Added to Watch Later"); 
    }
    localStorage.setItem('movix_watch_later', JSON.stringify(watchLaterList));
    setTimeout(() => setBookmarkAnimState("idle"), 500); 
  };

  const handleAddToCustomPlaylist = (playlistId) => {
    if (!movie) return;
    let playlists = JSON.parse(localStorage.getItem('movix_playlists')) || [];
    const playlistIndex = playlists.findIndex(pl => pl.id === playlistId);
    
    if (playlistIndex > -1) {
      if (!playlists[playlistIndex].items) playlists[playlistIndex].items = [];
      const exists = playlists[playlistIndex].items.some(item => item.id === movie.id);
      if (!exists) {
        playlists[playlistIndex].items.unshift({
          id: movie.id,
          title: movie.title,
          posterPath: movie.posterPath,
          mediaType: movie.mediaType || mediaType
        });
        playlists[playlistIndex].itemCount = playlists[playlistIndex].items.length;
        localStorage.setItem('movix_playlists', JSON.stringify(playlists));
        setCustomPlaylists(playlists);
        showToast(`Added to ${playlists[playlistIndex].name}`); 
      }
    }
    setShowPlaylistDropdown(false); 
  };

  const handleSeasonChange = (newSeasonNumber) => {
    setSeason(newSeasonNumber);
    setEpisode(1); 
    const selectedSeasonData = movie.seasons.find(s => s.season_number === newSeasonNumber);
    if (selectedSeasonData) {
      setMaxEpisodes(selectedSeasonData.episode_count || 1);
    }
  };

  const handlePersonClick = (personId) => {
    if (!personId) return;
    setSelectedPerson(personId);
    setIsPersonLoading(true);
    fetch(`${API_URL}/api/person/${personId}`)
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

  // Clean and simple Back logic 
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1); 
    } else {
      navigate("/");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <MovieLoader size="xl" text={true} className="text-red-600" />
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-white space-y-4">
        <h2 className="text-3xl font-bold">Content Not Found</h2>
        <p className="text-gray-400">The movie or TV show you are looking for does not exist.</p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-bold transition-colors">
          Return Home
        </button>
      </div>
    );
  }

  const currentSeasonData = movie?.seasons?.find(s => s.season_number === season);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8 animate-[fadeIn_0.5s_ease-in-out] pb-10 relative">
      <button 
        onClick={handleBack}
        className="inline-flex items-center px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white rounded-full transition-all group font-semibold shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-gray-700 hover:border-gray-500 w-fit mt-6"
      >
        <ArrowLeft className="select-none w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" />
        Back
      </button>

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
              <PlayCircle className="w-5 h-5" /> Watch Now
            </button>

            <button 
              onClick={() => handleMediaSelect('trailer')}
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 border border-gray-700 shadow-md"
            >
              <Clapperboard className="w-5 h-5" /> Watch Trailer
            </button>

            <div className="flex items-center gap-3 mt-2 relative">
              <button 
                onClick={handleToggleWatchLater}
                className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors duration-300 shadow-md group ${
                  isInWatchLater 
                    ? 'bg-red-600/10 text-red-500 hover:bg-red-600/20' 
                    : 'bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
                title={isInWatchLater ? "Remove from Watch Later" : "Add to Watch Later"}
              >
                <motion.div
                  animate={bookmarkAnimState}
                  variants={bookmarkVariants}
                  className="flex items-center justify-center"
                >
                  {isInWatchLater ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                </motion.div>
              </button>

              <div className="flex-1" ref={dropdownRef}>
                <button 
                  onClick={() => setShowPlaylistDropdown(!showPlaylistDropdown)}
                  className={`w-full py-3 px-4 rounded-xl flex items-center justify-center transition-all shadow-md group ${
                    showPlaylistDropdown
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                  title="Add to Custom Playlist"
                >
                  <motion.div
                    animate={{ rotate: showPlaylistDropdown ? 135 : 0 }} 
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex items-center justify-center"
                  >
                    <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {showPlaylistDropdown && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute bottom-full mb-3 left-0 w-full sm:w-64 bg-[#121212]/95 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden z-50 origin-bottom-left"
                    >
                      <div className="p-4 border-b border-gray-800 bg-black/50">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Save to Playlist</h4>
                      </div>
                      <div className="max-h-56 overflow-y-auto custom-scrollbar">
                        {customPlaylists.length === 0 ? (
                          <p className="p-6 text-sm text-gray-500 text-center italic">No playlists created yet.</p>
                        ) : (
                          <div className="p-2 space-y-1">
                            {customPlaylists.map(pl => {
                              const isAdded = pl.items?.some(item => item.id === movie.id);
                              return (
                                <button
                                  key={pl.id}
                                  onClick={() => handleAddToCustomPlaylist(pl.id)}
                                  disabled={isAdded}
                                  className="w-full flex items-center justify-between p-3 text-sm text-left hover:bg-gray-800 rounded-lg transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed group"
                                >
                                  <span className="truncate pr-3 font-medium">{pl.name}</span>
                                  {isAdded ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <Plus className="w-4 h-4 text-gray-600 group-hover:text-white shrink-0 transition-colors" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
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
            <p className="select-text cursor-default caret-transparent text-gray-300 text-lg leading-relaxed">{movie.overview}</p>
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
                <button onClick={() => setActiveMedia(null)} className="inline-flex items-center px-5 py-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-full transition-all font-bold border border-red-600/30">
                  <X className="w-5 h-5 mr-1" /> Close Video
                </button>
              </div>

              {activeMedia === 'movie' && movie.mediaType === 'tv' && (
                <div className="mb-8 p-5 bg-[#121212]/80 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col md:flex-row gap-4 relative">
                  
                  {/* CUSTOM SEASON DROPDOWN */}
                  <div className="flex-1 space-y-3 relative z-10" ref={seasonDropdownRef}>
                    <label className="text-[11px] uppercase font-black text-gray-400 flex items-center tracking-widest pl-1">
                      <List className="w-3.5 h-3.5 mr-2 text-red-500" /> Season
                    </label>
                    <button 
                      onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                      className="w-full flex items-center justify-between bg-black/60 hover:bg-black/80 border border-white/10 text-white rounded-xl py-3 px-4 transition-all focus:outline-none focus:border-red-600/50 shadow-inner group"
                    >
                      <span className="font-bold text-sm truncate pr-4">
                        {currentSeasonData ? `${currentSeasonData.name} (${currentSeasonData.episode_count} Eps)` : 'Select Season'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 group-hover:text-white transition-transform duration-300 shrink-0 ${isSeasonDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isSeasonDropdownOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-[80px] left-0 right-0 bg-[#121212]/95 backdrop-blur-2xl border border-gray-700 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 overflow-hidden"
                        >
                          <div className="max-h-60 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {movie.seasons?.map(s => (
                              <button 
                                key={s.id} 
                                onClick={() => {
                                  handleSeasonChange(s.season_number);
                                  setIsSeasonDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 text-sm rounded-lg transition-colors flex items-center justify-between ${
                                  season === s.season_number 
                                    ? 'bg-red-600/20 text-red-500 font-bold border border-red-500/20' 
                                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                }`}
                              >
                                <span className="truncate">{s.name}</span>
                                <span className={`text-[10px] uppercase font-bold tracking-wider ${season === s.season_number ? 'text-red-500/70' : 'text-gray-500'}`}>
                                  {s.episode_count} Eps
                                </span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="w-full md:w-48 space-y-3 relative z-0">
                    <label className="text-[11px] uppercase font-black text-gray-400 flex items-center tracking-widest pl-1">
                      <PlayCircle className="w-3.5 h-3.5 mr-2 text-red-500" /> Episode
                    </label>
                    <div className="flex items-center relative">
                      <button onClick={() => setEpisode(prev => Math.max(1, prev - 1))} className="absolute left-1.5 w-8 h-8 flex justify-center items-center bg-white/5 hover:bg-red-600 text-white rounded-lg transition-colors">-</button>
                      <input type="number" value={episode} readOnly className="w-full bg-black/60 border border-white/10 text-white rounded-xl py-3 px-12 text-center font-bold text-sm shadow-inner" />
                      <button onClick={() => setEpisode(prev => Math.min(maxEpisodes, prev + 1))} className="absolute right-1.5 w-8 h-8 flex justify-center items-center bg-white/5 hover:bg-red-600 text-white rounded-lg transition-colors">+</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800 ring-4 ring-gray-900">
                {activeMedia === 'movie' ? (
                  <iframe 
                    key={getEmbedUrl()} 
                    className="w-full aspect-video outline-none" 
                    src={getEmbedUrl()} 
                    frameBorder="0" 
                    allowFullScreen
                  ></iframe>
                ) : (
                  <iframe 
                    key={movie.trailerKey} 
                    className="w-full aspect-video outline-none" 
                    src={`https://www.youtube.com/embed/${movie.trailerKey}?autoplay=1&rel=0&loop=1&playlist=${movie.trailerKey}`} 
                    frameBorder="0" 
                    allowFullScreen
                  ></iframe>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {toast.show && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: "-50%" }} 
            animate={{ opacity: 1, y: 0, x: "-50%" }} 
            exit={{ opacity: 0, y: 20, x: "-50%" }} 
            className="fixed bottom-10 left-1/2 z-[200] bg-white text-black px-6 py-3 rounded-2xl shadow-[0_10px_40px_rgba(255,255,255,0.2)] flex items-center gap-3 font-bold"
          >
            <div className="bg-green-500 p-1 rounded-full"><Check className="text-white w-4 h-4" strokeWidth={3} /></div>
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPerson && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closePersonModal}></div>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="flex justify-between items-center p-5 border-b border-gray-800">
                <h2 className="text-xl font-bold text-white flex items-center"><User className="w-5 h-5 mr-2 text-red-500" /> Biography</h2>
                <button onClick={closePersonModal} className="text-gray-400 hover:text-white bg-gray-800 hover:bg-red-600 rounded-full p-1.5 transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="overflow-y-auto p-6 custom-scrollbar">
                {isPersonLoading ? <MovieLoader size="lg" /> : personDetails && (
                  <div className="space-y-8">
                    <div className="flex flex-col sm:flex-row gap-6">
                      <img src={personDetails.profilePath || ""} alt="" className="w-40 h-56 object-cover rounded-xl border border-gray-700 shadow-lg" />
                      <div className="space-y-4">
                        <h2 className="text-3xl font-black text-white">{personDetails.name}</h2>
                        <p className="text-gray-300 text-sm leading-relaxed text-justify">{personDetails.biography}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`.custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }.custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 10px; }`}</style>
    </div>
  );
}