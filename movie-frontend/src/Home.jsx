import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination, Navigation, Autoplay } from 'swiper/modules';
import { Play, Star, ChevronLeft, ChevronRight } from 'lucide-react';

import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

export default function Home() {
  const [movies, setMovies] = useState([]);

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
  
  const regularMovies = movies;

  return (
    <div className="space-y-12 overflow-hidden">
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

      {/*SECTION 2: EXPLORE MORE*/}
      <section className="px-8 pb-10 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-white border-l-4 border-gray-500 pl-3 uppercase tracking-wide">
          Explore More
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {regularMovies.map(movie => (
            <Link to={`/watch/${movie.id}`} key={`regular-${movie.id}`} className="group relative overflow-hidden rounded-xl shadow-xl hover:-translate-y-2 transition-transform duration-300 border border-gray-800">
              <img src={movie.posterPath} alt={movie.title} className="w-full aspect-[2/3] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent flex flex-col justify-end p-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <h3 className="font-bold text-sm md:text-base text-white truncate drop-shadow-md">{movie.title}</h3>
                <div className="flex items-center mt-2 text-yellow-400 text-xs md:text-sm font-bold">
                  <Star className="w-3.5 h-3.5 fill-current mr-1" /> {movie.voteAverage?.toFixed(1)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}