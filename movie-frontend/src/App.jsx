import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './Navbar';
import Home from './Home';
import Player from './Player';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-black text-white">
        <Navbar />

        <main className="pt-4"> 
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