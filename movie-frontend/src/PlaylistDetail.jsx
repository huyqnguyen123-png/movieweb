// movie-frontend/src/PlaylistDetail.jsx
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Play, Star, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PlaylistDetail() {
  const { type, id } = useParams(); 
  const navigate = useNavigate();
  const [listInfo, setListInfo] = useState({ name: '', items: [] });

  useEffect(() => {
    window.scrollTo(0, 0);
    loadData();
  }, [type, id]);

  const loadData = () => {
    let name = '';
    let items = [];

    // Check standard types
    if (type === 'recent') {
      name = 'Recently Watched';
      items = JSON.parse(localStorage.getItem('movix_recent')) || [];
    } else if (type === 'watch-later') {
      name = 'Watch Later';
      items = JSON.parse(localStorage.getItem('movix_watch_later')) || [];
    } else if (id) { 
      const playlists = JSON.parse(localStorage.getItem('movix_playlists')) || [];
      const currentPL = playlists.find(pl => pl.id === id);
      if (currentPL) {
        name = currentPL.name;
        items = currentPL.items || [];
      }
    }

    setListInfo({ name, items });
  };

  const removeItem = (e, movieId) => {
    e.preventDefault();
    e.stopPropagation();
    
    let storageKey = '';
    if (type === 'recent') storageKey = 'movix_recent';
    else if (type === 'watch-later') storageKey = 'movix_watch_later';
    
    if (storageKey) {
      const current = JSON.parse(localStorage.getItem(storageKey)) || [];
      const updated = current.filter(m => m.id !== movieId);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } else if (id) { 
      const playlists = JSON.parse(localStorage.getItem('movix_playlists')) || [];
      const updatedPLs = playlists.map(pl => {
        if (pl.id === id) {
          const newItems = (pl.items || []).filter(m => m.id !== movieId);
          return { ...pl, items: newItems, itemCount: newItems.length };
        }
        return pl;
      });
      localStorage.setItem('movix_playlists', JSON.stringify(updatedPLs));
    }
    
    loadData(); 
  };

  return (
    <div className="max-w-7xl mx-auto px-6 pt-12 pb-20 min-h-screen animate-[fadeIn_0.4s_ease-out]">
      {/* HEADER SECTION */}
      <header className="mb-12">
        <button 
          onClick={() => navigate(-1)} 
          className="text-gray-500 hover:text-red-500 transition-colors flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] mb-6 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back
        </button>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-600/10 rounded-2xl border border-red-600/20">
              <LayoutGrid className="text-red-500 w-6 h-6" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none">
              {listInfo.name}
            </h1>
          </div>
          
          <div className="px-4 py-2 bg-gray-900 border border-white/5 rounded-xl text-gray-400 font-bold text-xs uppercase tracking-widest shadow-lg">
            <span className="text-white">{listInfo.items.length}</span> Movies Found
          </div>
        </div>
      </header>

      {/* GRID SECTION */}
      {listInfo.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-gray-900/40 rounded-[2rem] border border-dashed border-white/5 shadow-inner">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-6 text-gray-600">
            <Star size={32} />
          </div>
          <p className="text-gray-500 font-bold text-lg">Your list is feeling a bit lonely.</p>
          <Link to="/" className="mt-4 px-8 py-3 bg-white text-black rounded-full font-black text-sm uppercase tracking-wider hover:bg-red-600 hover:text-white transition-all shadow-xl">
            Explore Content
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10">
          {listInfo.items.map((movie, index) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              key={movie.id} 
              className="group relative"
            >
              <Link to={`/watch/${movie.id}?type=${movie.mediaType}`} className="block aspect-[2/3] rounded-2xl overflow-hidden bg-gray-900 shadow-2xl relative border border-white/5 group-hover:border-red-600/50 transition-colors duration-300">
                <img 
                  src={movie.posterPath} 
                  alt={movie.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  loading="lazy"
                />
                
                {/* Overlay on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <div className="bg-red-600 w-12 h-12 rounded-full flex items-center justify-center self-center mb-10 shadow-[0_0_20px_rgba(220,38,38,0.5)] scale-0 group-hover:scale-100 transition-transform duration-500 delay-75">
                    <Play className="fill-white text-white w-5 h-5 ml-1" />
                  </div>
                </div>
                
                {/* Delete button */}
                <button 
                  onClick={(e) => removeItem(e, movie.id)}
                  className="absolute top-3 right-3 p-2.5 bg-black/60 backdrop-blur-xl text-gray-400 hover:text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all z-20 border border-white/10 hover:border-red-500/50 hover:scale-110 active:scale-90"
                >
                  <Trash2 size={16} />
                </button>
              </Link>
              
              <div className="mt-4 px-1">
                <h3 className="text-sm font-bold text-gray-200 truncate group-hover:text-red-500 transition-colors duration-300">
                  {movie.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter bg-gray-800 px-1.5 py-0.5 rounded">
                     {movie.mediaType === 'tv' ? 'Series' : 'Movie'}
                   </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}