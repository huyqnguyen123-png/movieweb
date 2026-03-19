import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination, Navigation, Autoplay } from 'swiper/modules';
import { Play, Star, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

// Reusable component for movie rows
const MovieCategory = ({ title, genreId, isTrending = false }) => {
  const [movies, setMovies] = useState([]);
  const rowRef = useRef(null);

  useEffect(() => {
    const fetchMovies = () => {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      const fetchUrl = isTrending 
        ? `${API_URL}/api/movies/trending` 
        : `${API_URL}/api/movies/genre/${genreId}`;

      fetch(fetchUrl)
        .then(res => {
          if (!res.ok) throw new Error('Network response was not ok');
          return res.json();
        })
        .then(data => {
          const cleanData = data.filter(m => 
            m.posterPath && 
            m.title && 
            m.title.toLowerCase() !== 'unknown' &&
            m.releaseDate
          );
          setMovies(cleanData);
        })
        .catch(err => console.error("Fetch error for row:", err));
    };

    fetchMovies();
    const pollingInterval = setInterval(fetchMovies, 300000);
    return () => clearInterval(pollingInterval);
  }, [genreId, isTrending]);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    let target = el.scrollLeft;
    let animating = false;

    const onWheel = (e) => {
      e.preventDefault();
      target += e.deltaY * 2.5; 
      const max = el.scrollWidth - el.clientWidth;
      target = Math.max(0, Math.min(target, max));

      if (!animating) {
        animating = true;
        const animate = () => {
          const step = (target - el.scrollLeft) * 0.08;
          el.scrollLeft += step;
          if (Math.abs(target - el.scrollLeft) > 1) {
            requestAnimationFrame(animate);
          } else {
            el.scrollLeft = target;
            animating = false;
          }
        };
        requestAnimationFrame(animate);
      }
    };

    const onScroll = () => { if (!animating) target = el.scrollLeft; };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', onScroll);
    };
  }, [movies]); 

  // Do not render the category if it has no movies (after trying to fetch)
  if (movies.length === 0) return null;

  return (
    <section className="px-8 pb-10 max-w-7xl mx-auto relative">
      <h2 className={`select-none text-2xl font-bold mb-6 text-white border-l-4 ${isTrending ? 'border-yellow-500' : 'border-gray-500'} pl-3 uppercase tracking-wide flex items-center gap-2`}>
        {title}
      </h2>
      
      <div ref={rowRef} className="flex gap-5 overflow-x-auto scrollbar-hide pb-4">
        {movies.map(movie => (
          <Link 
            to={`/watch/${movie.id}?type=${movie.mediaType || 'movie'}`} 
            key={`row-${genreId || 'trending'}-${movie.id}`} 
            className="group/card relative overflow-hidden rounded-xl shadow-xl hover:-translate-y-2 transition-transform duration-300 border border-gray-800 w-[160px] sm:w-[200px] shrink-0"
          >
            <img 
              src={movie.posterPath || ""} 
              alt={movie.title} 
              className="w-full h-[240px] sm:h-[300px] object-cover pointer-events-none bg-gray-900" 
              onError={(e) => { e.target.src = 'https://via.placeholder.com/500x750?text=No+Image'; }}
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-4 opacity-0 group-hover/card:opacity-100 transition-all duration-300">
              <div className="transform translate-y-4 group-hover/card:translate-y-0 transition-transform duration-300">
                <h3 className="font-bold text-sm md:text-base text-white line-clamp-2 leading-tight">
                  {movie.title}
                </h3>
                
                <div className="flex items-center justify-between mt-1.5 mb-3">
                  <div className="flex items-center text-yellow-400 text-xs md:text-sm font-bold">
                    <Star className="w-3.5 h-3.5 fill-current mr-1" /> {movie.voteAverage?.toFixed(1)}
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {movie.releaseDate?.split('-')[0]}
                  </span>
                </div>

                <div className="bg-red-600 text-white text-sm font-bold rounded-full py-1.5 px-4 flex items-center justify-center w-full transition-colors duration-200 hover:bg-red-500 shadow-lg">
                  <Play className="w-4 h-4 fill-current mr-1.5" /> Play
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default function Home() {
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHomeMovies = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${API_URL}/api/movies`);
        
        if (!res.ok) {
          throw new Error('Failed to fetch movies from the server.');
        }

        const data = await res.json();
        const cleanData = data.filter(m => m.posterPath && m.title && m.title.toLowerCase() !== 'unknown');
        setMovies(cleanData);
      } catch (err) {
        console.error("Home component fetch error:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeMovies();
  }, []);

  // Show a professional loading spinner while fetching
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-white">
        <svg className="animate-spin h-12 w-12 text-red-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="animate-pulse text-xl font-medium tracking-wider">Loading Hub...</p>
      </div>
    );
  }

  // Show a professional error message if fetch fails
  if (error || movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-white px-4 text-center">
        <AlertCircle className="w-16 h-16 text-gray-600 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Oops! Couldn't load movies.</h2>
        <p className="text-gray-400 max-w-md">
          {error || "We couldn't find any movies to display right now. Please make sure your backend server is running on port 5000."}
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-500 rounded-full font-bold transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const newestMovies = [...movies]
    .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))
    .slice(0, 10);
  
  const categories = [
    { title: "Action", genreId: 28 },
    { title: "Romance", genreId: 10749 },
    { title: "Horror", genreId: 27 },
    { title: "Mystery", genreId: 9648 },
    { title: "Sci-Fi", genreId: 878 },
    { title: "TV Series", genreId: 10770 },
    { title: "Animation", genreId: 16 },
    { title: "Psychological", genreId: 18 },
    { title: "Comedy", genreId: 35 }
  ];

  return (
    <div className="space-y-12 overflow-hidden bg-black min-h-screen">
      <style>{`
        .swiper-pagination-bullet { background-color: rgba(255,255,255,0.5) !important; }
        .swiper-pagination-bullet-active { background-color: #dc2626 !important; }
        .custom-prev.swiper-button-disabled, .custom-next.swiper-button-disabled { opacity: 0.2; cursor: not-allowed; transform: none !important; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <section className="w-full pt-10">
        <div className="px-8 max-w-7xl mx-auto">
          <h2 className="select-none text-2xl font-bold mb-6 text-white border-l-4 border-red-600 pl-3 uppercase tracking-wide">
            New Arrivals
          </h2>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-16">
          <button className="custom-prev absolute left-0 top-1/2 -translate-y-1/2 z-20 text-white/50 hover:text-white transition-all duration-300 hover:scale-125"><ChevronLeft size={60} strokeWidth={1} /></button>
          <button className="custom-next absolute right-0 top-1/2 -translate-y-1/2 z-20 text-white/50 hover:text-white transition-all duration-300 hover:scale-125"><ChevronRight size={60} strokeWidth={1} /></button>

          <Swiper
            effect={'coverflow'}
            grabCursor={true}
            centeredSlides={true}
            slidesPerView={'auto'}
            loop={true}
            autoplay={{ delay: 3000, disableOnInteraction: false }}
            coverflowEffect={{ rotate: 0, stretch: 50, depth: 200, modifier: 1, slideShadows: false }}
            navigation={{ prevEl: '.custom-prev', nextEl: '.custom-next' }}
            modules={[EffectCoverflow, Pagination, Navigation, Autoplay]}
            className="w-full py-10"
          >
            {newestMovies.map((movie) => {
              const validImg = movie.backdropPath && !movie.backdropPath.includes('null') 
                               ? movie.backdropPath 
                               : movie.posterPath;

              return (
                <SwiperSlide key={`hero-${movie.id}`} style={{ width: '650px', maxWidth: '85vw' }}>
                  {({ isActive }) => (
                    <div className={`relative w-full aspect-video rounded-2xl overflow-hidden transition-all duration-500 bg-gray-900 ${isActive ? 'group' : ''}`}>
                      <img 
                        src={validImg} 
                        alt="" 
                        className="w-full h-full object-cover" 
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/1280x720?text=Image+Coming+Soon'; }}
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="absolute bottom-6 left-6 right-6 transform translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 z-10">
                        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center shadow-2xl">
                          <h3 className="text-gray-900 font-black text-xl mb-3 text-center truncate w-full px-2">{movie.title}</h3>
                          <Link to={`/watch/${movie.id}?type=${movie.mediaType || 'movie'}`} className="bg-red-600 hover:bg-red-500 text-white font-bold rounded-full px-8 py-2 flex items-center shadow-md transition-all"><Play className="w-4 h-4 fill-current mr-2" /> Play Now</Link>
                        </div>
                      </div>
                    </div>
                  )}
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>
      </section>

      <div className="pb-10 space-y-2">
        <MovieCategory title="Trending Now" isTrending={true} />

        {categories.map((category) => (
          <MovieCategory 
            key={category.genreId} 
            title={category.title} 
            genreId={category.genreId} 
          />
        ))}
      </div>
    </div>
  );
}