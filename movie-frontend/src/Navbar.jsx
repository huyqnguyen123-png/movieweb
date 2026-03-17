import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Star, Loader2, X, ArrowRight, History } from 'lucide-react';

export default function Navbar() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const searchRef = useRef(null);
  const navigate = useNavigate();

  // Load search history from local storage
  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem('movix_history')) || [];
    setSearchHistory(savedHistory);
  }, []);

  // Handle outside clicks to close the dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search logic with 500ms debounce
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setIsSearching(true);
      fetch(`http://localhost:5000/api/movies/search?q=${encodeURIComponent(searchTerm)}`)
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
    if (searchTerm.trim()) {
      const updatedHistory = [searchTerm, ...searchHistory.filter(item => item !== searchTerm)].slice(0, 5);
      setSearchHistory(updatedHistory);
      localStorage.setItem('movix_history', JSON.stringify(updatedHistory));
      setShowDropdown(true);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  return (
    <nav className="sticky top-0 z-[100] w-full bg-[#0a0a0a]/70 backdrop-blur-lg border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-8">
        
        {/* LOGO */}
        <Link to="/" className="shrink-0" onClick={clearSearch}>
          <span className="text-3xl font-black text-red-600 tracking-tighter drop-shadow-[0_0_10px_rgba(220,38,38,0.3)]">
            MOVIX
          </span>
        </Link>

        {/* CENTERED SEARCH BAR */}
        <div className="relative flex-1 max-w-xl mx-auto" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="relative w-full flex items-center group">
            
            {/* Magnifying Glass Icon */}
            <div className="absolute left-4 pointer-events-none">
              <Search className="w-4 h-4 text-gray-400 group-focus-within:text-red-500 transition-colors" />
            </div>
    
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search cartoons, movies..."
              className="w-full bg-white/10 border border-white/10 text-white rounded-xl py-2.5 pl-12 pr-12 focus:outline-none focus:border-red-600/50 focus:bg-white/15 transition-all text-sm placeholder:text-gray-500 shadow-inner"
            />

            {/* Circular Action Button */}
            <div className="absolute right-2">
              {searchTerm ? (
                <button 
                  type="button" 
                  onClick={clearSearch} 
                  className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-red-600 text-gray-300 hover:text-white rounded-full transition-all duration-300 hover:scale-105 active:scale-90 group shadow-lg"
                >
                  <X className="w-4 h-4 transition-transform duration-500 group-hover:rotate-180" />
                </button>
              ) : (
                <button 
                  type="submit" 
                  className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-red-600 text-gray-500 hover:text-white rounded-full transition-all duration-300 hover:scale-105 active:scale-90"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>

          {/* DROPDOWN GLASS EFFECT */}
          {showDropdown && (searchTerm || searchHistory.length > 0) && (
            <div className="absolute top-full mt-3 w-full bg-[#121212]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
              
              {/* History Section */}
              {!searchTerm && searchHistory.length > 0 && (
                <div className="p-2">
                  <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Recent Searches</div>
                  {searchHistory.map((term, i) => (
                    <div 
                      key={i} 
                      onClick={() => { setSearchTerm(term); handleSearchSubmit(); }} 
                      className="flex items-center justify-between px-3 py-2 hover:bg-white/5 rounded-lg cursor-pointer group text-sm text-gray-300"
                    >
                      <div className="flex items-center gap-3"><History className="w-4 h-4 text-gray-600" />{term}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Results Section */}
              {searchTerm && (
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  {isSearching ? (
                    <div className="flex items-center justify-center p-8 text-gray-400 text-sm">
                      <Loader2 className="w-5 h-5 animate-spin mr-3 text-red-600" /> Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="p-2">
                      {searchResults.map(movie => (
                        <div 
                          key={movie.id} 
                          onClick={() => { 
                            navigate(`/watch/${movie.id}?type=${movie.mediaType}`); 
                            clearSearch(); 
                          }}
                          className="flex items-center gap-4 p-2 hover:bg-white/10 rounded-xl cursor-pointer transition-all border-b border-white/5 last:border-0"
                        >
                          <img src={movie.posterPath || ""} alt="" className="w-10 h-14 object-cover rounded-lg bg-gray-800" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-white font-bold text-sm truncate">{movie.title}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-gray-500 text-xs">{movie.releaseDate?.split('-')[0]}</span>
                              <div className="flex items-center text-yellow-500 text-[10px] font-bold">
                                <Star className="w-3 h-3 fill-current mr-1" />{movie.voteAverage}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-10 text-center text-gray-500 text-sm">No results found.</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Spacer for centering */}
        <div className="w-[100px] hidden lg:block"></div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(220, 38, 38, 0.5); }
      `}</style>
    </nav>
  );
}