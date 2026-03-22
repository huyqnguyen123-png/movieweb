// movie-frontend/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './Navbar';
import Home from './Home';
import Player from './Player';
import SearchResults from './SearchResults';
import PlaylistDetail from './PlaylistDetail'; 
import AuthPage from './Auth'; 
import Profile from './Profile'; 
import WatchParty from './WatchParty';

function App() {
  useEffect(() => {
    const handleClearSelection = (e) => {
      if (!e.target.closest('.select-text')) {
        window.getSelection()?.removeAllRanges();
      }
    };

    document.addEventListener('mousedown', handleClearSelection);
    return () => document.removeEventListener('mousedown', handleClearSelection);
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-black text-white select-none">
        <Navbar />

        <main className="pt-4"> 
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/watch/:id" element={<Player />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/party/:roomId" element={<WatchParty />} />
            <Route path="/library/:type" element={<PlaylistDetail />} />
            <Route path="/library/playlist/:id" element={<PlaylistDetail />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/profile" element={<Profile />} /> 
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;