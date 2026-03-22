// movie-frontend/src/WatchParty.jsx
import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Send, Search, Users, Copy, Check, ArrowLeft, PlayCircle, Film, User } from 'lucide-react';
import MovieLoader from './MovieLoader';

export default function WatchParty() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  
  // Chat States
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef(null);

  // Sync & Online States
  const [currentMedia, setCurrentMedia] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]); 
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [partyDetails, setPartyDetails] = useState(null); 
  
  // UI States
  const [copied, setCopied] = useState(false);
  const [idCopied, setIdCopied] = useState(false); 
  const [toast, setToast] = useState({ show: false, message: "" });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Use useMemo to prevent infinite re-renders by keeping a stable object reference
  const currentUser = useMemo(() => {
    const storedUser = localStorage.getItem('currentUser');
    return storedUser ? JSON.parse(storedUser) : null;
  }, []);

  // CALCULATE TOTAL MEMBERS (History + Currently Online)
  const totalMembers = useMemo(() => {
    const uniqueIds = new Set(messages.map(m => m.userId).filter(Boolean));
    if (currentUser?.id) uniqueIds.add(currentUser.id);
    onlineUsers.forEach(u => {
      if (u?.id) uniqueIds.add(u.id);
    });
    return uniqueIds.size || 1; 
  }, [messages, currentUser, onlineUsers]);

  const showToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  };

  // INITIALIZE SOCKET CONNECTION & FETCH HISTORY
  useEffect(() => {
    if (!currentUser) {
      navigate('/auth?mode=login');
      return;
    }

    // FETCH EXISTING CHAT HISTORY FROM DATABASE 
    const fetchChatHistory = async () => {
      try {
        const res = await fetch(`${API_URL}/api/party/${roomId}/messages`);
        if (res.ok) {
          const history = await res.json();
          setMessages(history);
        }
      } catch (err) {
        console.error("Failed to fetch chat history", err);
      }
    };
    fetchChatHistory();

    // FETCH PARTY DETAILS
    const fetchPartyDetails = async () => {
      try {
        const res = await fetch(`${API_URL}/api/party/${roomId}`);
        if (res.ok) {
          const data = await res.json();
          setPartyDetails(data);
        }
      } catch (err) {
        console.error("Failed to fetch party details", err);
      }
    };
    fetchPartyDetails();

    const newSocket = io(API_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join_party', { roomId, user: currentUser });
    });

    newSocket.on('receive_message', (data) => {
      setMessages((prev) => {
        const isDuplicate = data.id && prev.some(m => m.id === data.id);
        if (isDuplicate) return prev;
        
        return [...prev, data];
      });
    });

    newSocket.on('party_notification', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    newSocket.on('media_updated', (data) => {
      setCurrentMedia(data);
      showToast(`Host changed media to: ${data.title}`);
    });

    // LISTEN FOR ONLINE USERS UPDATE
    newSocket.on('room_users_update', (usersData) => {
      const uniqueUsers = Array.from(new Map(usersData.map(u => [u.user.id, u.user])).values());
      setOnlineUsers(uniqueUsers);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [API_URL, roomId, navigate, currentUser]);

  // AUTO-SCROLL TO BOTTOM OF CHAT
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // LIVE SEARCH WITH DEBOUNCE
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_URL}/api/movies/search?q=${encodeURIComponent(searchTerm)}`);
        const data = await res.json();
        setSearchResults(data.slice(0, 10)); 
      } catch (err) {
        console.error("Search error", err);
      }
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, API_URL]);

  // HANDLE SENDING MESSAGES
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    const messageData = {
      type: 'chat', 
      roomId,
      userId: currentUser.id, 
      user: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
      avatarUrl: currentUser.avatarUrl || null,
      message: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    socket.emit('send_message', messageData);
    
    setNewMessage("");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
  };

  // HANDLE MEDIA SYNC
  const handleSyncMedia = (movie) => {
    const mediaData = {
      roomId,
      tmdbId: movie.id,
      title: movie.title,
      mediaType: movie.mediaType,
      season: 1,
      episode: 1
    };
    
    socket.emit('sync_media', mediaData);
    setCurrentMedia(mediaData);
    setSearchResults([]);
    setSearchTerm("");
    showToast(`Synced ${movie.title} for everyone!`);
  };

  // COPY FULL LINK
  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // COPY JUST THE ROOM ID
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setIdCopied(true);
    showToast("Room ID copied to clipboard!");
    setTimeout(() => setIdCopied(false), 2000);
  };

  const renderDefaultAvatar = () => (
    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden shrink-0 border border-white/10 shadow-md">
      <User className="w-4 h-4 text-gray-400" />
    </div>
  );

  const getEmbedUrl = () => {
    if (!currentMedia) return "";
    if (currentMedia.mediaType === 'tv') {
      return `https://vidsrc.xyz/embed/tv?tmdb=${currentMedia.tmdbId}&season=${currentMedia.season}&episode=${currentMedia.episode}`;
    }
    return `https://vidsrc.xyz/embed/movie?tmdb=${currentMedia.tmdbId}`;
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 min-h-screen flex flex-col xl:flex-row gap-6 animate-[fadeIn_0.4s_ease-out]">
      
      {/* LEFT PANEL: VIDEO PLAYER & CONTROLS */}
      <div className="flex-1 flex flex-col space-y-4">
        
        <div className="flex flex-col sm:flex-row items-center justify-between bg-gray-900/60 p-4 rounded-2xl border border-gray-800">
          <div className="flex items-center gap-4 w-full sm:w-auto mb-4 sm:mb-0">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white flex items-center">
                <Users className="w-5 h-5 mr-2 text-indigo-500" /> 
                {partyDetails?.roomName || "Watch Party"}
              </h1>
              
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-500 font-mono tracking-widest">ID: {roomId}</p>
                <button 
                  onClick={copyRoomId}
                  className="p-1 rounded-md bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                  title="Copy Room ID"
                >
                  {idCopied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </button>

                <div className="flex items-center gap-2 ml-1">
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-800 text-gray-300 rounded-full text-[10px] font-bold border border-gray-700">
                    <Users className="w-3 h-3 text-gray-400" />
                    {totalMembers} Members
                  </div>
                  
                  <div className="relative group cursor-pointer z-50">
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-full text-[10px] font-bold border border-green-500/20 transition-colors">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      {onlineUsers.length} Online
                    </div>
                    
                    <div className="absolute top-full left-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden">
                      <div className="p-2 border-b border-gray-700 bg-gray-900/50">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold text-center">Online Now</p>
                      </div>
                      <div className="max-h-40 overflow-y-auto custom-scrollbar p-2 space-y-2">
                        {onlineUsers.map(u => (
                          <div key={u.id} className="flex items-center gap-2">
                            {u.avatarUrl && u.avatarUrl !== "null" ? (
                              <img src={u.avatarUrl} alt="avatar" className="w-5 h-5 rounded-full object-cover border border-white/10" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center border border-white/10 shrink-0">
                                <User className="w-3 h-3 text-gray-300" />
                              </div>
                            )}
                            <span className="text-xs text-white truncate">{u.firstName} {u.lastName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>

          <button onClick={copyRoomLink} className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold flex items-center justify-center transition-colors">
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? 'Link Copied!' : 'Invite Friends'}
          </button>
        </div>

        <div className="w-full aspect-video bg-black rounded-2xl border border-gray-800 shadow-2xl relative overflow-hidden ring-4 ring-gray-900/50">
          {!currentMedia ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
              <Film className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-bold">Waiting for host to pick a movie...</p>
            </div>
          ) : (
            <iframe 
              key={getEmbedUrl()} 
              className="w-full h-full outline-none" 
              src={getEmbedUrl()} 
              frameBorder="0" 
              allowFullScreen
            ></iframe>
          )}
        </div>

        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Host Controls: Pick a Movie</h3>
          <form onSubmit={handleSearchSubmit} className="flex gap-2 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Search className="w-4 h-4 text-gray-500" />
            </div>
            <input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="Search title to play for everyone..." 
              className="flex-1 bg-black/60 border border-white/10 text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
            />
          </form>

          {isSearching && (
            <div className="mt-4 flex justify-center p-4">
              <MovieLoader size="sm" text={false} />
            </div>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
              {searchResults.map(movie => (
                <div key={movie.id} className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/5 hover:border-indigo-500/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={movie.posterPath} alt="" className="w-10 h-14 object-cover rounded-lg" />
                    <span className="text-white text-sm font-bold truncate pr-4">{movie.title}</span>
                  </div>
                  <button 
                    onClick={() => handleSyncMedia(movie)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center shrink-0 transition-colors"
                  >
                    <PlayCircle className="w-4 h-4 mr-2" /> Sync Play
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* RIGHT PANEL: LIVE CHAT */}
      <div className="w-full xl:w-80 2xl:w-96 flex flex-col bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden h-[600px] xl:h-auto">
        <div className="p-4 bg-black/40 border-b border-gray-800 shrink-0">
          <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span> Live Chat
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center text-xs text-gray-600 font-medium italic">
              Say hi to start the party!
            </div>
          )}
          
          {messages.map((msg, idx) => {
            const isOwnMessage = String(msg.userId) === String(currentUser?.id);
            
            return (
              <div key={msg.id || idx} className="w-full">
                {msg.type === 'system' ? (
                  <div className="flex justify-center my-2">
                    <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] text-gray-400 font-bold uppercase tracking-wider border border-white/10">
                      {msg.message}
                    </span>
                  </div>
                ) : (
                  <div className={`flex items-end gap-2 mb-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar Container */}
                    <div className="shrink-0 mb-1">
                      {msg.avatarUrl && msg.avatarUrl !== "null" ? (
                        <img 
                          src={msg.avatarUrl} 
                          alt={msg.user} 
                          className="w-8 h-8 rounded-full object-cover border border-white/10 shadow-sm shrink-0"
                          onError={(e) => {
                            e.target.onerror = null; 
                            e.target.src = "https://ui-avatars.com/api/?name=User&background=374151&color=fff";
                          }}
                        />
                      ) : (
                        renderDefaultAvatar()
                      )}
                    </div>

                    {/* Bubble Content */}
                    <div className={`flex flex-col max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                      {!isOwnMessage && (
                        <span className="text-[10px] text-gray-500 font-bold mb-1 ml-1">
                          {msg.user}
                        </span>
                      )}
                      
                      <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-inner break-words w-full ${
                        isOwnMessage 
                          ? 'bg-indigo-600 text-white rounded-br-none' 
                          : 'bg-[#2a2a2a] text-gray-200 rounded-bl-none border border-white/5'
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        <div className="p-3 bg-black/40 border-t border-gray-800 shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input 
              type="text" 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)} 
              placeholder="Type a message..." 
              className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-indigo-500"
            />
            <button type="submit" className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {toast.show && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] bg-white text-black px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold text-sm">
          <div className="bg-indigo-500 p-1 rounded-full"><Check className="text-white w-3 h-3" strokeWidth={3} /></div>
          {toast.message}
        </div>
      )}
      
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; }.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }.custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }`}</style>
    </div>
  );
}