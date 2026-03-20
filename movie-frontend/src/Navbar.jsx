// movie-frontend/src/Navbar.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Star, X, ArrowRight, History, 
  Menu, Clock, Bookmark, Plus, ListVideo, Trash2, Check,
  User, LogIn, UserPlus, LogOut 
} from 'lucide-react'; 
import MovieLoader from './MovieLoader'; 

export default function Navbar() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Sidebar & Playlist states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  
  // User Menu state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Use real state for logged in status and user data
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [currentUser, setCurrentUser] = useState(null);

  const searchRef = useRef(null);
  const inputRef = useRef(null); 
  const navigate = useNavigate();
  const location = useLocation();

  // Load user data and their specific search history on mount or route change
  useEffect(() => {
    // Check user login status first
    const storedUser = localStorage.getItem('currentUser');
    let activeUser = null;
    
    if (storedUser) {
      activeUser = JSON.parse(storedUser);
      setCurrentUser(activeUser);
      setIsLoggedIn(true);
    } else {
      setCurrentUser(null);
      setIsLoggedIn(false);
      setPlaylists([]); 
    }

    // Load search history based on whether user is logged in or guest
    const historyKey = activeUser ? `movix_history_${activeUser.id}` : 'movix_history_guest';
    const savedHistory = JSON.parse(localStorage.getItem(historyKey)) || [];
    setSearchHistory(savedHistory);
    
  }, [location.pathname]); 

  // Sync logic: Fetch playlists from Backend whenever the sidebar is opened AND user is logged in
  useEffect(() => {
    const fetchPlaylists = async () => {
      if (!currentUser?.id) return;
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${API_URL}/api/user/${currentUser.id}/playlists`);
        if (res.ok) {
          const data = await res.json();
          setPlaylists(data);
        }
      } catch (error) {
        console.error("Failed to fetch playlists:", error);
      }
    };

    if (isSidebarOpen && isLoggedIn) {
      fetchPlaylists();
    } else if (!isLoggedIn) {
      setPlaylists([]);
    }
  }, [isSidebarOpen, isLoggedIn, currentUser]);

  // Handle outside clicks to close the search dropdown and user menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isSidebarOpen]);

  // Search logic with 500ms debounce
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setIsSearching(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      fetch(`${API_URL}/api/movies/search?q=${encodeURIComponent(searchTerm)}`)
        .then(res => res.json())
        .then(data => {
          setSearchResults(data);
          setIsSearching(false);
        })
        .catch(() => setIsSearching(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const term = searchTerm.trim();
    if (term) {
      // Update history state
      const updatedHistory = [term, ...searchHistory.filter(item => item !== term)].slice(0, 5);
      setSearchHistory(updatedHistory);
      
      // Save history to the user-specific key
      const historyKey = currentUser ? `movix_history_${currentUser.id}` : 'movix_history_guest';
      localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
      
      setShowDropdown(false);
      navigate(`/search?q=${encodeURIComponent(term)}`);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  // Playlist logic via Backend API 
  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim() || !currentUser) return;

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_URL}/api/user/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, name: newPlaylistName.trim() })
      });
      
      if (res.ok) {
        const newPlaylist = await res.json();
        setPlaylists([newPlaylist, ...playlists]);
        setNewPlaylistName('');
        setIsCreatingPlaylist(false);
      }
    } catch (error) {
      console.error("Error creating playlist:", error);
    }
  };

  const handleDeletePlaylist = async (e, id) => {
    e.stopPropagation(); 
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_URL}/api/user/playlists/${id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setPlaylists(playlists.filter(pl => pl.id !== id));
      }
    } catch (error) {
      console.error("Error deleting playlist:", error);
    }
  };

  // Logout Logic
  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setIsLoggedIn(false);
    setCurrentUser(null);
    setPlaylists([]); 
    
    // Switch back to guest search history immediately
    const guestHistory = JSON.parse(localStorage.getItem('movix_history_guest')) || [];
    setSearchHistory(guestHistory);
    
    setIsUserMenuOpen(false);
    navigate('/');
  };

  // Get Initial 
  const getInitial = () => {
    if (currentUser && currentUser.firstName) {
      return currentUser.firstName.charAt(0).toUpperCase();
    }
    return <User className="w-5 h-5" />;
  };

  return (
    <>
      <nav className="sticky top-0 z-[100] w-full bg-[#0a0a0a]/50 backdrop-blur-xl border-b border-white/5 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4 sm:gap-8">
          
          <div className="flex items-center gap-6 shrink-0 z-[160]">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-3 hover:bg-white/5 rounded-full transition-colors text-white"
            >
              <Menu className="w-6 h-6" />
            </button>

            <Link to="/" className="hidden sm:block shrink-0" onClick={clearSearch}>
              <span className="text-3xl font-black text-red-600 tracking-tighter drop-shadow-[0_0_10px_rgba(220,38,38,0.3)]">
                MOVIX
              </span>
            </Link>
          </div>

          <div className="relative flex-1 max-w-xl mx-auto" ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="relative w-full flex items-center group">
              <div className="absolute left-4 pointer-events-none z-10">
                <Search className="w-4 h-4 text-gray-500 group-focus-within:text-red-500 transition-colors" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search movies..."
                className="w-full bg-black/40 border border-white/10 text-white rounded-full py-3 pl-12 pr-12 focus:outline-none focus:border-red-600/50 focus:bg-white/10 transition-all text-sm placeholder:text-gray-600 shadow-inner"
              />
              <div className="absolute right-3 z-10 flex items-center gap-2">
                {searchTerm && (
                  <button type="button" onClick={clearSearch} className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-red-600 text-gray-300 hover:text-white rounded-full transition-all duration-300 shadow-lg">
                    <X className="w-4 h-4" />
                  </button>
                )}
                {!searchTerm && (
                  <button type="submit" className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-red-600 text-gray-500 hover:text-white rounded-full transition-all duration-300">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>

            <AnimatePresence>
              {showDropdown && (searchTerm || searchHistory.length > 0) && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute top-full mt-3 w-full bg-[#121212]/95 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
                  {!searchTerm && searchHistory.length > 0 && (
                    <div className="p-2">
                      <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Recent Searches</div>
                      {searchHistory.map((term, i) => (
                        <div 
                          key={i} 
                          onClick={() => { 
                            setSearchTerm(term); 
                            setShowDropdown(false); 
                            navigate(`/search?q=${encodeURIComponent(term)}`); 
                          }} 
                          className="flex items-center justify-between px-3 py-2 hover:bg-white/5 rounded-lg cursor-pointer group text-sm text-gray-300"
                        >
                          <div className="flex items-center gap-3">
                            <History className="w-4 h-4 text-gray-600" />
                            {term}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchTerm && (
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {isSearching ? (
                        <div className="flex items-center justify-center p-12 text-gray-400 text-sm"><MovieLoader size="sm" className="mr-3" text={false} /> Searching...</div>
                      ) : searchResults.length > 0 ? (
                        <div className="p-3">
                          {searchResults.map(movie => (
                            <div key={movie.id} onClick={() => { navigate(`/watch/${movie.id}?type=${movie.mediaType}`); clearSearch(); }} className="flex items-center gap-5 p-2.5 hover:bg-white/5 rounded-xl cursor-pointer border-b border-white/5 last:border-0 group">
                              <img src={movie.posterPath || ""} alt="" className="w-12 h-16 object-cover rounded-lg bg-gray-900 border border-white/5" />
                              <div className="flex flex-col min-w-0">
                                <span className="text-white font-bold text-sm truncate group-hover:text-red-500 transition-colors">{movie.title}</span>
                                <div className="flex items-center gap-2 mt-1.5 text-yellow-500 text-[10px] font-bold"><Star className="w-3 h-3 fill-current" />{movie.voteAverage?.toFixed(1)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : ( <div className="p-16 text-center text-gray-600 text-sm">No results found.</div> )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* USER AUTH MENU AREA */}
          <div className="flex items-center justify-end shrink-0 z-[160] relative lg:min-w-[100px]" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 focus:outline-none relative z-10 ${
                isUserMenuOpen || isLoggedIn
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' 
                  : 'bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
               {getInitial()}
            </button>

            <AnimatePresence>
              {isUserMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-4 w-52 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] py-1 overflow-visible z-[200]"
                >
                  <div className="absolute -top-[7px] right-[14px] w-3.5 h-3.5 bg-[#1a1a1a] border-t border-l border-white/10 rotate-45 z-20 rounded-tl-[2px]"></div>
                  
                  {/* Menu Items */}
                  <div className="relative z-10 bg-transparent flex flex-col">
                    {isLoggedIn ? (
                      <>
                        <div className="px-5 py-4 cursor-default">
                          <p className="text-[15px] font-bold text-white truncate leading-tight">
                            {currentUser?.firstName} {currentUser?.lastName}
                          </p>
                          <p className="text-xs text-gray-400 mt-1 truncate">
                            {currentUser?.email}
                          </p>
                        </div>
                        
                        <div className="h-px bg-white/10 w-full"></div>
                        
                        {/* Profile Link */}
                        <div className="p-1.5">
                          <Link
                            to="/profile"
                            className="flex items-center px-3.5 py-3 text-sm font-bold text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <User className="w-4 h-4 mr-3 text-gray-400" />
                            Profile
                          </Link>
                        </div>

                        <div className="h-px bg-white/10 w-full"></div>
                        
                        {/* Log out Button */}
                        <div className="p-1.5">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center px-3.5 py-3 text-sm font-bold text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                          >
                            <LogOut className="w-4 h-4 mr-3" />
                            Log out
                          </button>
                        </div>
                      </>
                    ) : (
                      /* Guest Menu (Log in / Sign up) */
                      <div className="p-1.5 flex flex-col gap-1">
                        <Link
                          to="/auth?mode=login"
                          className="flex items-center px-3.5 py-2.5 text-[15px] font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <LogIn className="w-5 h-5 mr-3 text-gray-400" />
                          Log in
                        </Link>
                        <Link
                          to="/auth?mode=signup"
                          className="flex items-center px-3.5 py-2.5 text-[15px] font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <UserPlus className="w-5 h-5 mr-3 text-gray-400" />
                          Sign up
                        </Link>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </nav>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150]" onClick={() => setIsSidebarOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="fixed top-0 left-0 h-full w-[300px] sm:w-[340px] bg-[#0a0a0a]/90 backdrop-blur-2xl z-[200] border-r border-white/5 flex flex-col shadow-2xl overflow-hidden" >
            <div className="h-20 flex items-center justify-between px-6 border-b border-white/5 shrink-0 relative">
              <span className="text-2xl font-black text-white tracking-tighter flex items-center gap-2"><Menu className="w-6 h-6 text-red-600" /> Library</span>
              <button onClick={() => setIsSidebarOpen(false)} className="p-3 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto py-8 px-5 space-y-10 custom-scrollbar relative z-10">
              <div className="space-y-3">
                <h3 className="text-[11px] font-black text-gray-600 uppercase tracking-widest px-4 mb-4">System Playlists</h3>
                
                <Link to="/library/recent" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/5 transition-all text-gray-300 hover:text-white group">
                  <Clock className="w-5 h-5 text-gray-500 group-hover:text-red-500 transition-colors" />
                  <span className="font-semibold text-sm">Recently Watched</span>
                </Link>
                
                <Link to="/library/watch-later" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/5 transition-all text-gray-300 hover:text-white group">
                  <Bookmark className="w-5 h-5 text-gray-500 group-hover:text-red-500 transition-colors" />
                  <span className="font-semibold text-sm">Watch Later</span>
                </Link>
              </div>

              <div className="h-px bg-white/5 w-full"></div>

              <div className="space-y-3">
                <h3 className="text-[11px] font-black text-gray-600 uppercase tracking-widest leading-none px-4 mb-4">My Playlists</h3>

                {!isLoggedIn ? (
                  /* GUEST UI: Prompt to log in */
                  <div className="px-4 py-6 text-center bg-white/5 rounded-2xl border border-white/5">
                     <User className="w-8 h-8 text-gray-500 mx-auto mb-3" />
                     <p className="text-sm text-gray-400 mb-4 leading-relaxed">Log in to create and save your own personalized playlists.</p>
                     <Link 
                       to="/auth?mode=login" 
                       onClick={() => setIsSidebarOpen(false)} 
                       className="inline-block bg-red-600 text-white text-xs font-bold px-6 py-2.5 rounded-full hover:bg-red-500 transition-colors"
                     >
                       Log In Now
                     </Link>
                  </div>
                ) : (
                  /* LOGGED IN UI: Show playlists and create button */
                  <>
                    {isCreatingPlaylist ? (
                      <form onSubmit={handleCreatePlaylist} className="flex items-center gap-2 px-2 mb-5">
                        <input autoFocus type="text" value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} placeholder="Name..." className="flex-1 bg-black/40 border border-red-500/50 text-white rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-red-500" />
                        <button type="submit" className="p-2.5 bg-red-600 rounded-xl text-white"><Check className="w-4 h-4" /></button>
                        <button type="button" onClick={() => setIsCreatingPlaylist(false)} className="p-2.5 bg-gray-800 rounded-xl text-gray-300"><X className="w-4 h-4" /></button>
                      </form>
                    ) : (
                      <button onClick={() => setIsCreatingPlaylist(true)} className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 border-dashed border-gray-800 hover:border-red-600/40 hover:bg-red-600/10 transition-all text-gray-500 hover:text-white group mb-5">
                        <div className="bg-gray-800 group-hover:bg-red-600 p-2 rounded-lg transition-colors"><Plus className="w-4 h-4 text-white" /></div>
                        <span className="font-semibold text-sm">Create New Playlist</span>
                      </button>
                    )}

                    <div className="space-y-2">
                      {playlists.length === 0 && !isCreatingPlaylist && (
                        <p className="text-xs text-center text-gray-500 py-2">No playlists yet.</p>
                      )}
                      {playlists.map((pl) => (
                        <div 
                          key={pl.id}
                          onClick={() => { 
                            setIsSidebarOpen(false); 
                            setTimeout(() => navigate(`/library/playlist/${pl.id}`), 200); 
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-white/5 transition-all text-gray-300 hover:text-white group border border-transparent hover:border-white/5 cursor-pointer"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <ListVideo className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                            <div className="flex flex-col items-start flex-1 min-w-0">
                              <span className="font-semibold text-sm truncate w-full text-left">{pl.name}</span>
                              <span className="text-[11px] text-gray-600 mt-0.5">{pl.itemCount || 0} items</span>
                            </div>
                          </div>
                          <button onClick={(e) => handleDeletePlaylist(e, pl.id)} className="p-2 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-red-600/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(220, 38, 38, 0.5); }
      `}</style>
    </>
  );
}