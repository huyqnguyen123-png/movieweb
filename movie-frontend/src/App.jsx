import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react'; // Import thêm useEffect
import Navbar from './Navbar';
import Home from './Home';
import Player from './Player';
import SearchResults from './SearchResults';

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
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;