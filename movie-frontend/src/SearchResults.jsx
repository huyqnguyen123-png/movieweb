import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Star, ArrowLeft, Film, Tv } from 'lucide-react'; // Removed Loader2
import MovieLoader from './MovieLoader'; // Imported custom loader

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const navigate = useNavigate();
  
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch search results when the query parameter changes
  useEffect(() => {
    if (!query) return;
    
    setIsLoading(true);
    
    // Determine API URL from environment variables or use local fallback
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    fetch(`${API_URL}/api/movies/search?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        setResults(data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching search results:', error);
        setIsLoading(false);
      });
  }, [query]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      {/* Header Area */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5 pt-8 pb-4 mb-6">
        <div className="max-w-3xl mx-auto px-4 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Search Results
            </h1>
            <p className="text-sm text-gray-400">
              Showing matches for <span className="text-white font-semibold">"{query}"</span>
            </p>
          </div>
        </div>
      </div>

      {/* List Container */}
      <div className="max-w-3xl mx-auto px-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <MovieLoader size="lg" text={true} className="text-red-600" />
          </div>
        ) : results.length > 0 ? (
          <div className="flex flex-col gap-3">
            {results.map((item) => (
              <div 
                key={item.id}
                onClick={() => navigate(`/watch/${item.id}?type=${item.mediaType}`)}
                className="flex items-center bg-[#151515] hover:bg-[#202020] border border-white/5 hover:border-white/10 rounded-xl p-3 cursor-pointer transition-all duration-200 shadow-sm group"
              >
                {/* Left Thumbnail */}
                <div className="w-14 h-20 shrink-0 bg-gray-900 rounded-md overflow-hidden mr-4 shadow-md">
                  {item.posterPath ? (
                    <img 
                      src={item.posterPath} 
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-700">
                      {item.mediaType === 'tv' ? <Tv className="w-6 h-6" /> : <Film className="w-6 h-6" />}
                    </div>
                  )}
                </div>

                {/* Right Information */}
                <div className="flex flex-col flex-1 min-w-0 justify-center">
                  <h2 className="text-base sm:text-lg font-bold text-white truncate mb-1 group-hover:text-red-500 transition-colors">
                    {item.title}
                  </h2>
                  
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-400">
                    <span className="uppercase tracking-wider font-bold text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-300">
                      {item.mediaType === 'tv' ? 'TV Series' : 'Movie'}
                    </span>
                    
                    {item.releaseDate && (
                      <span className="font-medium">
                        {item.releaseDate.split('-')[0]}
                      </span>
                    )}

                    {item.voteAverage > 0 && (
                      <span className="flex items-center text-yellow-500 font-bold">
                        <Star className="w-3.5 h-3.5 fill-current mr-1" />
                        {item.voteAverage}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-[#151515] rounded-2xl border border-white/5">
            <p className="text-gray-400 text-lg">No results found for "{query}".</p>
            <p className="text-gray-500 text-sm mt-2">Try checking for typos or using different keywords.</p>
          </div>
        )}
      </div>
    </div>
  );
}