import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination, Navigation, Autoplay } from 'swiper/modules';
import { Play, Star, ChevronLeft, ChevronRight } from 'lucide-react';

import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

// Reusable component that displays movies in a horizontally scrollable row
const MovieCategory = ({ title, genreId }) => {
  const [movies, setMovies] = useState([]);
  const rowRef = useRef(null);

  // Fetch data specific to this genre and set up auto-polling for real-time updates
  useEffect(() => {
    const fetchPopularMovies = () => {
      fetch(`http://localhost:5000/api/movies/genre/${genreId}`)
        .then(res => res.json())
        .then(data => setMovies(data))
        .catch(err => console.error("Error fetching auto-update movies:", err));
    };

    fetchPopularMovies();
    const pollingInterval = setInterval(fetchPopularMovies, 300000);
    return () => clearInterval(pollingInterval);
  }, [genreId]);

  useEffect(() => {
    const rowElement = rowRef.current;
    if (!rowElement) return;

    let targetScroll = rowElement.scrollLeft;
    let isAnimating = false;

    const handleWheel = (e) => {
      e.preventDefault();
      targetScroll += e.deltaY * 2.5; 
      const maxScroll = rowElement.scrollWidth - rowElement.clientWidth;
      targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));

      if (!isAnimating) {
        isAnimating = true;
        
        const animateScroll = () => {
          const step = (targetScroll - rowElement.scrollLeft) * 0.08;
          rowElement.scrollLeft += step;

          if (Math.abs(targetScroll - rowElement.scrollLeft) > 1) {
            requestAnimationFrame(animateScroll);
          } else {
            rowElement.scrollLeft = targetScroll;
            isAnimating = false;
          }
        };
        
        requestAnimationFrame(animateScroll);
      }
    };

    const handleScroll = () => {
      if (!isAnimating) {
        targetScroll = rowElement.scrollLeft;
      }
    };

    rowElement.addEventListener('wheel', handleWheel, { passive: false });
    rowElement.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      rowElement.removeEventListener('wheel', handleWheel);
      rowElement.removeEventListener('scroll', handleScroll);
    };
  }, [movies]); 

  if (movies.length === 0) return null;

  return (
    <section className="px-8 pb-10 max-w-7xl mx-auto relative">
      <h2 className="text-2xl font-bold mb-6 text-white border-l-4 border-gray-500 pl-3 uppercase tracking-wide">
        {title}
      </h2>
      
      <div 
        ref={rowRef}
        className="flex gap-5 overflow-x-auto scrollbar-hide pb-4"
      >
        {movies.map(movie => (
          <Link 
            to={`/watch/${movie.id}`} 
            key={`genre-${genreId}-${movie.id}`} 
            className="group/card relative overflow-hidden rounded-xl shadow-xl hover:-translate-y-2 transition-transform duration-300 border border-gray-800 w-[160px] sm:w-[200px] shrink-0"
          >
            <img 
              src={movie.posterPath} 
              alt={movie.title} 
              className="w-full h-[240px] sm:h-[300px] object-cover pointer-events-none" 
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-4 opacity-0 group-hover/card:opacity-100 transition-all duration-300">

              <div className="transform translate-y-4 group-hover/card:translate-y-0 transition-transform duration-300">
                <h3 className="font-bold text-sm md:text-base text-white line-clamp-2 drop-shadow-md leading-tight">
                  {movie.title}
                </h3>
                
                <div className="flex items-center text-yellow-400 text-xs md:text-sm font-bold mt-1.5 mb-3">
                  <Star className="w-3.5 h-3.5 fill-current mr-1" /> {movie.voteAverage?.toFixed(1)}
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

  // Fetch initial generic movies for the top slider
  useEffect(() => {
    fetch('http://localhost:5000/api/movies')
      .then(res => res.json())
      .then(data => setMovies(data))
      .catch(err => console.error(err));
  }, []);

  if (movies.length === 0) return <div className="text-center p-20 text-white animate-pulse">Loading data...</div>;

  const upcomingMovies = [...movies]
    .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))
    .slice(0, 10);
  
  // Array defining custom categories mapped to TMDb API genre IDs
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
    <div className="space-y-12 overflow-hidden bg-black">
      <style>{`
        .swiper-pagination-bullet {
          background-color: rgba(255,255,255,0.5) !important;
        }
        .swiper-pagination-bullet-active {
          background-color: #dc2626 !important;
        }

        .custom-prev.swiper-button-disabled, 
        .custom-next.swiper-button-disabled {
          opacity: 0.2;
          cursor: not-allowed;
          transform: none !important;
        }

        /* Hide scrollbar for Chrome, Safari and Opera */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        /* Hide scrollbar for IE, Edge and Firefox */
        .scrollbar-hide {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>

      {/*SECTION 1: UPCOMING MOVIES (COVERFLOW)*/}
      <section className="w-full pt-10">
        <div className="px-8 max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-white border-l-4 border-red-600 pl-3 uppercase tracking-wide">
            Upcoming Movies
          </h2>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-16">
          <button className="custom-prev absolute left-0 top-1/2 -translate-y-1/2 z-20 text-white/50 hover:text-white transition-all duration-300 hover:scale-125 hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
            <ChevronLeft size={60} strokeWidth={1} />
          </button>
          
          <button className="custom-next absolute right-0 top-1/2 -translate-y-1/2 z-20 text-white/50 hover:text-white transition-all duration-300 hover:scale-125 hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
            <ChevronRight size={60} strokeWidth={1} />
          </button>

          <Swiper
            effect={'coverflow'}
            grabCursor={true}
            centeredSlides={true}
            slidesPerView={'auto'}
            loop={true}
            autoplay={{
              delay: 2500,
              disableOnInteraction: false,
            }}
            coverflowEffect={{
              rotate: 0,
              stretch: 50,      
              depth: 200,        
              modifier: 1,
              slideShadows: false,
            }}
            navigation={{
              prevEl: '.custom-prev',
              nextEl: '.custom-next',
            }}
            modules={[EffectCoverflow, Pagination, Navigation, Autoplay]}
            className="w-full py-10"
          >
            {upcomingMovies.map((movie) => (
              <SwiperSlide key={`upcoming-${movie.id}`} style={{ width: '650px', maxWidth: '85vw' }}>
                {({ isActive }) => (
                  <div className={`relative w-full aspect-video rounded-2xl overflow-hidden transition-all duration-500 bg-transparent ${isActive ? 'group' : ''}`}>
                    <img 
                      src={movie.backdropPath?.includes('null') ? movie.posterPath : movie.backdropPath} 
                      alt={movie.title} 
                      className="w-full h-full object-cover" 
                      onError={(e) => { e.target.src = movie.posterPath; }}
                    />
                    
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out"></div>
                    
                    <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 transform translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-out z-10 pointer-events-none group-hover:pointer-events-auto">
                      
                      <div className="bg-white/95 backdrop-blur-md rounded-2xl md:rounded-[1.5rem] p-4 flex flex-col items-center justify-center shadow-2xl">
                        
                        <h3 className="text-gray-900 font-black text-xl md:text-2xl mb-3 text-center truncate w-full px-2">
                          {movie.title}
                        </h3>
                        
                        <div className="flex flex-row items-center justify-center gap-3 w-full">
                          <div className="flex items-center text-yellow-600 bg-gray-100 px-3 py-1.5 rounded-full font-bold text-sm">
                            <Star className="w-4 h-4 fill-current mr-1" />
                            {movie.voteAverage?.toFixed(1)}
                          </div>
                          
                          <Link 
                            to={`/watch/${movie.id}`} 
                            className="bg-red-600 hover:bg-red-500 text-white font-bold rounded-full px-6 py-1.5 flex-1 max-w-[140px] inline-flex items-center justify-center transition-all shadow-md hover:scale-105 active:scale-95 text-sm"
                          >
                            <Play className="w-4 h-4 fill-current mr-1" /> 
                            Play
                          </Link>
                        </div>

                      </div>
                    </div>
                  </div>
                )}
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/*SECTION 2: CATEGORY ROWS*/}
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