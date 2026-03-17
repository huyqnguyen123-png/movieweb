import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination, Navigation, Autoplay } from 'swiper/modules';
import { Play, Star, ChevronLeft, ChevronRight } from 'lucide-react';

import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

// Reusable component that displays the 20 LATEST movies in a horizontally scrollable row
const MovieCategory = ({ title, genreId }) => {
  const [movies, setMovies] = useState([]);
  const rowRef = useRef(null);

  // Fetch data and set up auto-polling
  useEffect(() => {
    const fetchLatestMovies = () => {
      fetch(`http://localhost:5000/api/movies/genre/${genreId}`)
        .then(res => res.json())
        .then(data => setMovies(data))
        .catch(err => console.error("Fetch error:", err));
    };

    fetchLatestMovies();
    const pollingInterval = setInterval(fetchLatestMovies, 300000);
    return () => clearInterval(pollingInterval);
  }, [genreId]);

  // Smooth scroll logic (Lerp)
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

  if (movies.length === 0) return null;

  return (
    <section className="px-8 pb-10 max-w-7xl mx-auto relative">
      <h2 className="text-2xl font-bold mb-6 text-white border-l-4 border-gray-500 pl-3 uppercase tracking-wide">
        {title}
      </h2>
      
      <div ref={rowRef} className="flex gap-5 overflow-x-auto scrollbar-hide pb-4">
        {movies.map(movie => (
          <Link 
            to={`/watch/${movie.id}`} 
            key={`genre-${genreId}-${movie.id}`} 
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

  useEffect(() => {
    fetch('http://localhost:5000/api/movies')
      .then(res => res.json())
      .then(data => setMovies(data))
      .catch(err => console.error(err));
  }, []);

  if (movies.length === 0) return <div className="text-center p-20 text-white animate-pulse">Loading Hub...</div>;

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

      {/* SECTION 1: NEW ARRIVALS (COVERFLOW) */}
      <section className="w-full pt-10">
        <div className="px-8 max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-white border-l-4 border-red-600 pl-3 uppercase tracking-wide">
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
              // Enhanced Image Logic for Coverflow: Use backdrop first, fallback to poster, then placeholder
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
                          <Link to={`/watch/${movie.id}`} className="bg-red-600 hover:bg-red-500 text-white font-bold rounded-full px-8 py-2 flex items-center shadow-md transition-all"><Play className="w-4 h-4 fill-current mr-2" /> Play Now</Link>
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

      {/* SECTION 2: CATEGORY ROWS */}
      <div className="pb-10 space-y-2">
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