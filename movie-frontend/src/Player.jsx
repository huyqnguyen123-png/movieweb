// movie-frontend/src/Player.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion'; 
import { 
  ArrowLeft, PlayCircle, Star, Calendar, Clapperboard, 
  Users, X, User, List, Bookmark, BookmarkCheck, Plus, Check, ChevronDown,
  SkipForward, SkipBack, Sparkles, MessageSquare, Trash2, Send
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

  // Recommendations State
  const [recommendations, setRecommendations] = useState([]);

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

  // REVIEW & RATING STATES
  const [reviews, setReviews] = useState([]);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewContent, setReviewContent] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  
  // Refs
  const dropdownRef = useRef(null);
  const seasonDropdownRef = useRef(null); 
  const videoRef = useRef(null);
  const scrollRef = useRef(null); 
  const isDragging = useRef(false); 

  const [bookmarkAnimState, setBookmarkAnimState] = useState("idle");
  const [toast, setToast] = useState({ show: false, message: "" });

  let API_URL = 'https://movixbackend-efpd.onrender.com';
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    API_URL = 'http://localhost:5000';
  }
  
  // Extract primitive user ID to avoid dependency array infinite loops
  const storedUser = localStorage.getItem('currentUser');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const currentUserId = currentUser ? currentUser.id : null;

  const showToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  };

  // Helper to save history to DB
  const saveHistoryProgress = useCallback((movieData, currentSeason, currentEp) => {
    if (!currentUserId || !movieData) return;
    
    fetch(`${API_URL}/api/user/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUserId,
        tmdbId: movieData.id.toString(), 
        title: movieData.title || movieData.name,
        posterPath: movieData.posterPath,
        mediaType: movieData.mediaType || mediaType,
        season: movieData.mediaType === 'tv' ? currentSeason : null,
        episode: movieData.mediaType === 'tv' ? currentEp : null
      })
    }).catch(console.error);
  }, [API_URL, currentUserId, mediaType]);

  // Fetch Reviews Helper
  const fetchReviews = useCallback(async (tmdbId) => {
    try {
      const res = await fetch(`${API_URL}/api/movies/${tmdbId}/reviews`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
        
        if (currentUserId) {
          const myReview = data.find(r => r.userId === currentUserId);
          if (myReview) {
            setUserRating(myReview.rating);
            setReviewContent(myReview.content);
            setHasUserReviewed(true);
          } else {
            setHasUserReviewed(false);
            setUserRating(0);
            setReviewContent("");
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch reviews", err);
    }
  }, [API_URL, currentUserId]);

  // Initial Load: Fetch Movie Details, Progress & Recommendations
  useEffect(() => {
    window.scrollTo(0, 0);
    setIsLoading(true);
    setActiveMedia(null); 
    setError(false);
    setRecommendations([]); 
    
    fetch(`${API_URL}/api/movies/${id}?type=${mediaType}`)
      .then(res => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(async (data) => {
        setMovie(data);
        
        let initialSeason = 1;
        let initialEpisode = 1;

        if (data.mediaType === 'tv' && data.seasons && data.seasons.length > 0) {
          const firstSeason = data.seasons.find(s => s.season_number === 1) || data.seasons[0];
          initialSeason = firstSeason.season_number;
          setMaxEpisodes(firstSeason.episode_count || 1);
        }

        // Fetch Recommendations
        fetch(`${API_URL}/api/movies/${data.id}/recommendations?type=${data.mediaType || mediaType}`)
          .then(res => res.json())
          .then(recs => setRecommendations(recs))
          .catch(console.error);

        // Fetch Reviews
        fetchReviews(data.id.toString());

        // GET SAVED PROGRESS & SAVE HISTORY
        if (currentUserId) {
          try {
            const progressRes = await fetch(`${API_URL}/api/user/${currentUserId}/history/${data.id}`);
            if (progressRes.ok) {
              const progressData = await progressRes.json();
              if (progressData && data.mediaType === 'tv') {
                if (progressData.season) initialSeason = progressData.season;
                if (progressData.episode) initialEpisode = progressData.episode;
                
                const savedSeasonData = data.seasons.find(s => s.season_number === initialSeason);
                if (savedSeasonData) setMaxEpisodes(savedSeasonData.episode_count || 1);
              }
            }

            saveHistoryProgress(data, initialSeason, initialEpisode);

            const wlRes = await fetch(`${API_URL}/api/user/${currentUserId}/watch-later`);
            if (wlRes.ok) {
              const list = await wlRes.json();
              setIsInWatchLater(list.some(item => item.tmdbId === data.id.toString()));
            }
              
            const plRes = await fetch(`${API_URL}/api/user/${currentUserId}/playlists`);
            if (plRes.ok) {
              const list = await plRes.json();
              setCustomPlaylists(list);
            }
          } catch (err) {
            console.error("Failed to fetch user data:", err);
          }
        }

        setSeason(initialSeason);
        setEpisode(initialEpisode);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(true);
        setIsLoading(false);
      });
  }, [id, mediaType, API_URL, currentUserId, saveHistoryProgress, fetchReviews]);

  useEffect(() => {
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
  }, []);

  // Horizontal Scroll & Drag Logic for Recommendations
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollBy({
        left: e.deltaY > 0 ? 400 : -400, 
        behavior: 'smooth'
      });
    };

    let isDown = false;
    let startX;
    let scrollLeft;

    const handleMouseDown = (e) => {
      isDown = true;
      isDragging.current = false;
      el.classList.add('active');
      el.style.scrollBehavior = 'auto'; 
      
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };
    
    const handleMouseLeave = () => {
      isDown = false;
      el.classList.remove('active');
    };
    
    const handleMouseUp = () => {
      isDown = false;
      el.classList.remove('active');
      el.style.scrollBehavior = 'smooth';

      setTimeout(() => {
        isDragging.current = false;
      }, 50);
    };
    
    const handleMouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      isDragging.current = true; 
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5; 
      el.scrollLeft = scrollLeft - walk;
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('mousedown', handleMouseDown);
    el.addEventListener('mouseleave', handleMouseLeave);
    el.addEventListener('mouseup', handleMouseUp);
    el.addEventListener('mousemove', handleMouseMove);

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('mousedown', handleMouseDown);
      el.removeEventListener('mouseleave', handleMouseLeave);
      el.removeEventListener('mouseup', handleMouseUp);
      el.removeEventListener('mousemove', handleMouseMove);
    };
  }, [recommendations]);

  const handleToggleWatchLater = async () => {
    if (!movie) return;
    
    if (!currentUserId) {
      showToast("Please log in to save movies!");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/user/watch-later`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          tmdbId: movie.id.toString(),
          title: movie.title || movie.name,
          posterPath: movie.posterPath,
          mediaType: movie.mediaType || mediaType
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setIsInWatchLater(data.isAdded);
        setBookmarkAnimState(data.isAdded ? "selected" : "unselected");
        showToast(data.message);
      }
    } catch (err) {
      console.error(err);
      showToast("Server connection error");
    }
    
    setTimeout(() => setBookmarkAnimState("idle"), 500); 
  };

  const handleAddToCustomPlaylist = async (playlistId) => {
    if (!movie) return;

    if (!currentUserId) {
      showToast("Please log in to use the playlist!");
      setShowPlaylistDropdown(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/user/playlists/${playlistId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: movie.id.toString(),
          title: movie.title || movie.name,
          posterPath: movie.posterPath,
          mediaType: movie.mediaType || mediaType
        })
      });
      
      if (res.ok) {
        showToast("Added to playlist successfully!");
        setCustomPlaylists(prev => prev.map(pl => {
          if (pl.id === playlistId) {
            return { ...pl, items: [...(pl.items || []), { tmdbId: movie.id.toString() }] };
          }
          return pl;
        }));
      } else {
        const errData = await res.json();
        showToast(errData.message || "This movie is already in the playlist.");
      }
    } catch (err) {
      console.error(err);
      showToast("Server connection error");
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
    saveHistoryProgress(movie, newSeasonNumber, 1);
  };

  const handleEpisodeChange = (newEp) => {
    if (newEp < 1 || newEp > maxEpisodes) return;
    setEpisode(newEp);
    saveHistoryProgress(movie, season, newEp);
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

  // SUBMIT REVIEW
  const submitReview = async (e) => {
    e.preventDefault();
    if (!currentUserId) {
      showToast("Please log in to submit a review.");
      return;
    }
    if (userRating === 0) {
      showToast("Please select a star rating.");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const res = await fetch(`${API_URL}/api/movies/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: movie.id.toString(),
          userId: currentUserId,
          rating: userRating,
          content: reviewContent.trim()
        })
      });

      if (res.ok) {
        showToast("Review posted successfully!");
        fetchReviews(movie.id.toString()); 
      } else {
        showToast("Failed to post review.");
      }
    } catch (err) {
      console.error(err);
      showToast("Server connection error.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // DELETE REVIEW
  const deleteReview = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    
    try {
      const res = await fetch(`${API_URL}/api/movies/reviews/${reviewId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast("Review deleted.");
        fetchReviews(movie.id.toString());
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to delete review.");
    }
  };

  const getEmbedUrl = () => {
    if (movie?.mediaType === 'tv' || mediaType === 'tv') {
      return `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`;
    }
    return `https://vidsrc.xyz/embed/movie?tmdb=${id}`;
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1); 
    } else {
      navigate("/");
    }
  };

  const renderAvatar = (url) => {
    if (url && url !== "null") {
      return (
        <img 
          src={url} 
          alt="Avatar" 
          className="w-10 h-10 rounded-full object-cover border border-white/10 shadow-sm shrink-0"
          onError={(e) => { e.target.src = "https://ui-avatars.com/api/?name=User&background=374151&color=fff"; }}
        />
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden shrink-0 border border-white/10 shadow-md">
        <User className="w-5 h-5 text-gray-400" />
      </div>
    );
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
  const averageReviewRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

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
        
        {/* LEFT COLUMN: POSTER & ACTIONS */}
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
                              const isAdded = pl.items?.some(item => item.tmdbId === movie.id.toString());
                              return (
                                <button
                                  key={pl.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAddToCustomPlaylist(pl.id);
                                  }}
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

        {/* RIGHT COLUMN: INFO, VIDEO, REVIEWS */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black mb-4 text-white drop-shadow-md">{movie.title || movie.name}</h1>
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-300 font-medium">
              <span className="flex items-center bg-gray-800 px-3 py-1 rounded-full text-yellow-400 border border-gray-700">
                <Star className="w-4 h-4 mr-1 fill-current" /> {movie.voteAverage?.toFixed(1)} 
              </span>
              {reviews.length > 0 && (
                <span className="flex items-center bg-red-600/10 px-3 py-1 rounded-full text-red-500 border border-red-600/20">
                  <MessageSquare className="w-4 h-4 mr-1" /> {averageReviewRating} User Rating
                </span>
              )}
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" /> Release: {formatDate(movie.releaseDate || movie.first_air_date)}
              </span>
            </div>
          </div>

          <div className="bg-gray-900/60 p-6 rounded-2xl border border-gray-800 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-3">Storyline</h3>
            <p className="select-text cursor-default caret-transparent text-gray-300 text-lg leading-relaxed">{movie.overview}</p>
          </div>

          {/* CAST & CREW */}
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

          {/* VIDEO PLAYER */}
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
                <div className="mb-6 p-5 bg-[#121212]/80 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col md:flex-row gap-4 relative">
                  {/* SEASON DROPDOWN */}
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
                      <PlayCircle className="w-3.5 h-3.5 mr-2 text-red-500" /> Episode Selection
                    </label>
                    <div className="flex items-center relative">
                      <button onClick={() => handleEpisodeChange(Math.max(1, episode - 1))} className="absolute left-1.5 w-8 h-8 flex justify-center items-center bg-white/5 hover:bg-red-600 text-white rounded-lg transition-colors">-</button>
                      <input type="number" value={episode} readOnly className="w-full bg-black/60 border border-white/10 text-white rounded-xl py-3 px-12 text-center font-bold text-sm shadow-inner" />
                      <button onClick={() => handleEpisodeChange(Math.min(maxEpisodes, episode + 1))} className="absolute right-1.5 w-8 h-8 flex justify-center items-center bg-white/5 hover:bg-red-600 text-white rounded-lg transition-colors">+</button>
                    </div>
                  </div>
                </div>
              )}

              {/* BINGE-WATCHING CONTROLS */}
              {activeMedia === 'movie' && movie.mediaType === 'tv' && (
                <div className="flex items-center justify-between bg-black/40 border border-gray-800 p-4 mb-4 rounded-xl shadow-inner">
                  <button 
                    onClick={() => handleEpisodeChange(episode - 1)}
                    disabled={episode <= 1}
                    className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <SkipBack className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Prev Ep
                  </button>
                  
                  <div className="text-center">
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-widest block">Currently Playing</span>
                    <span className="text-white font-black text-sm">Season {season} - Episode {episode}</span>
                  </div>

                  <button 
                    onClick={() => handleEpisodeChange(episode + 1)}
                    disabled={episode >= maxEpisodes}
                    className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed group shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                  >
                    Next Ep
                    <SkipForward className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </button>
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

          {/* REVIEWS & RATINGS SECTION */}
          <div className="space-y-6 pt-10 mt-10 border-t border-gray-800/50">
            <h3 className="text-2xl font-bold text-white flex items-center border-l-4 border-red-600 pl-3">
              <MessageSquare className="w-6 h-6 mr-2 text-red-500" /> User Reviews
            </h3>

            {/* Post Review Form */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 shadow-lg">
              {!currentUserId ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 mb-4 font-medium">Please log in to share your thoughts about this movie.</p>
                  <button onClick={() => navigate('/auth?mode=login')} className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full transition-colors">
                    Log In to Review
                  </button>
                </div>
              ) : (
                <form onSubmit={submitReview} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                    <div className="flex items-center gap-3">
                      {renderAvatar(currentUser?.avatarUrl)}
                      <div>
                        <p className="text-white font-bold text-sm">{hasUserReviewed ? "Edit your review" : "Rate this movie"}</p>
                        <p className="text-xs text-gray-500 font-medium">Share your thoughts with the community</p>
                      </div>
                    </div>
                    {/* Star Rating Picker */}
                    <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setUserRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          className="focus:outline-none transition-transform hover:scale-110"
                        >
                          <Star 
                            className={`w-6 h-6 sm:w-8 sm:h-8 ${
                              star <= (hoverRating || userRating)
                                ? 'fill-yellow-500 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]'
                                : 'text-gray-600'
                            } transition-colors`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      value={reviewContent}
                      onChange={(e) => setReviewContent(e.target.value)}
                      placeholder="Write your review here..."
                      className="w-full bg-black/40 border border-gray-700 text-white rounded-xl p-4 min-h-[120px] focus:outline-none focus:border-red-500 transition-colors text-sm resize-y custom-scrollbar"
                    ></textarea>
                  </div>

                  <div className="flex justify-end">
                    <button 
                      type="submit"
                      disabled={isSubmittingReview || userRating === 0}
                      className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-600/20"
                    >
                      <Send className="w-4 h-4" />
                      {isSubmittingReview ? "Posting..." : (hasUserReviewed ? "Update Review" : "Post Review")}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Reviews List */}
            <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
              {reviews.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-gray-800 rounded-2xl">
                  <MessageSquare className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No reviews yet. Be the first to share your thoughts!</p>
                </div>
              ) : (
                reviews.map((review) => {
                  const isMyReview = review.userId === currentUserId;
                  return (
                    <div key={review.id} className={`p-5 rounded-2xl border transition-colors ${isMyReview ? 'bg-red-600/5 border-red-500/20' : 'bg-gray-900/40 border-gray-800'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          {renderAvatar(review.user?.avatarUrl)}
                          <div>
                            <p className="text-white font-bold text-sm flex items-center gap-2">
                              {review.user?.firstName} {review.user?.lastName}
                              {isMyReview && <span className="px-2 py-0.5 bg-red-600/20 text-red-500 text-[10px] rounded-full uppercase tracking-wider">You</span>}
                            </p>
                            <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">
                              {new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-700'}`} />
                            ))}
                          </div>
                          {isMyReview && (
                            <button onClick={() => deleteReview(review.id)} className="text-gray-500 hover:text-red-500 transition-colors p-1" title="Delete Review">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap pl-12">{review.content}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* HORIZONTAL SCROLL RECOMMENDATIONS SECTION */}
          {recommendations.length > 0 && (
            <div className="space-y-6 pt-10 mt-10 border-t border-gray-800/50">
              <h3 className="text-2xl font-bold text-white flex items-center border-l-4 border-red-600 pl-3">
                <Sparkles className="w-6 h-6 mr-2 text-red-500" /> More Like This
              </h3>
              
              <div 
                ref={scrollRef}
                className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar cursor-grab active:cursor-grabbing select-none"
              >
                {recommendations.map((rec) => (
                  <Link 
                    to={`/watch/${rec.id}?type=${rec.mediaType}`} 
                    key={rec.id}
                    draggable="false"
                    onClick={(e) => {
                      if (isDragging.current) {
                        e.preventDefault(); 
                      }
                    }}
                    className="group block relative w-36 sm:w-40 md:w-48 flex-shrink-0 aspect-[2/3] rounded-xl overflow-hidden bg-gray-900 border border-gray-800 shadow-lg hover:border-red-500 transition-colors duration-300"
                  >
                    <img 
                      src={rec.posterPath} 
                      alt={rec.title} 
                      draggable="false"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                      <h4 className="text-white text-xs font-bold truncate">{rec.title}</h4>
                      <div className="flex items-center gap-1 mt-1 text-yellow-500 text-[10px] font-bold">
                        <Star className="w-3 h-3 fill-current" /> {rec.voteAverage}
                      </div>
                    </div>
                  </Link>
                ))}
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

      {/* CUSTOM MODAL ACTOR INFO - MOBILE OPTIMIZED */}
      <AnimatePresence>
        {selectedPerson && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center sm:p-4"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={closePersonModal}></div>
            
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full sm:max-w-4xl h-[85vh] sm:h-auto sm:max-h-[90vh] bg-[#121212] sm:border border-gray-800 rounded-t-[2rem] sm:rounded-2xl flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] sm:shadow-2xl"
            >
              {/* Swipe indicator (Mobile) */}
              <div className="w-full flex justify-center pt-4 pb-2 sm:hidden cursor-pointer" onClick={closePersonModal}>
                <div className="w-12 h-1.5 bg-gray-700 rounded-full"></div>
              </div>

              {/* Header Modal */}
              <div className="flex justify-between items-center p-5 border-b border-white/5 shrink-0">
                <h2 className="text-xl font-black text-white flex items-center">
                  <User className="w-5 h-5 mr-2 text-red-500" /> Biography
                </h2>
                <button 
                  onClick={closePersonModal} 
                  className="text-gray-400 hover:text-white bg-gray-800 hover:bg-red-600 rounded-full p-2 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-8 custom-scrollbar">
                {isPersonLoading ? (
                  <div className="h-full flex items-center justify-center min-h-[200px]">
                    <MovieLoader size="lg" />
                  </div>
                ) : personDetails && (
                  <div className="space-y-8 pb-10 sm:pb-0">
                    
                    <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
                      <img 
                        src={personDetails.profilePath || ""} 
                        alt="" 
                        className="w-32 h-48 sm:w-48 sm:h-72 object-cover rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-gray-800 shrink-0" 
                        onError={(e) => { e.target.src = "https://via.placeholder.com/300x450?text=No+Image"; }}
                      />
                      <div className="space-y-4">
                        <h2 className="text-3xl font-black text-white leading-tight">{personDetails.name}</h2>
                        <p className="text-gray-300 text-sm leading-relaxed sm:text-justify max-w-full">
                          {personDetails.biography || "No biography available for this person."}
                        </p>
                      </div>
                    </div>

                    {/* KNOWN FOR MOVIES */}
                    {personDetails.movies && personDetails.movies.length > 0 && (
                      <div className="space-y-4 pt-6 border-t border-white/5">
                        <h3 className="text-lg font-bold text-white flex items-center">
                          <Clapperboard className="w-5 h-5 mr-2 text-red-500" /> Known For
                        </h3>
                        <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar snap-x">
                          {personDetails.movies.map(m => (
                            <Link 
                              key={m.id}
                              to={`/watch/${m.id}?type=${m.mediaType}`} 
                              onClick={closePersonModal}
                              className="w-28 sm:w-32 shrink-0 group flex flex-col snap-start"
                            >
                              <div className="w-full aspect-[2/3] rounded-xl overflow-hidden shadow-lg border-2 border-transparent group-hover:border-red-500 transition-colors bg-gray-900">
                                <img 
                                  src={m.posterPath} 
                                  alt={m.title} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                  loading="lazy"
                                />
                              </div>
                              <p className="text-white text-xs font-bold mt-2 truncate group-hover:text-red-400 transition-colors" title={m.title}>
                                {m.title}
                              </p>
                              <p className="text-gray-500 text-[10px] truncate" title={m.character}>
                                {m.character}
                              </p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
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