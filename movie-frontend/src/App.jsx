import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Player from './Player';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen font-sans">
        <header className="p-4 bg-gray-800 shadow-md">
          <h1 className="text-2xl font-bold text-red-500">NetClone</h1>
        </header>
        <main className="p-6">
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