import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Player from './Player';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#111827] text-white">
        <nav className="p-6 bg-[#1f2937]/50 backdrop-blur-md sticky top-0 z-50">
          <h1 className="text-3xl font-black tracking-tighter text-red-600">MOVIX</h1>
        </nav>
        <main className="p-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/watch/:id" element={<Player />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;