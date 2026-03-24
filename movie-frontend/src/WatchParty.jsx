// movie-frontend/src/WatchParty.jsx
import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Peer } from 'peerjs'; 
import { motion, AnimatePresence } from 'framer-motion'; 
import { Send, Search, Users, Copy, Check, ArrowLeft, PlayCircle, Film, User, Shield, Mic, MicOff, Phone, PhoneOff, UserPlus, Link2, X, Loader2 } from 'lucide-react';
import MovieLoader from './MovieLoader';

// Component to render invisible audio streams with Volume & Speaker settings
const AudioPlayer = ({ stream, volume = 100, speakerId }) => {
  const audioRef = useRef(null);
  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
      audioRef.current.volume = volume / 100;
      
      if (speakerId && typeof audioRef.current.setSinkId === 'function') {
        audioRef.current.setSinkId(speakerId).catch(err => {
          console.warn("The browser does not support automatic speaker switching:", err);
        });
      }
    }
  }, [stream, volume, speakerId]);
  return <audio ref={audioRef} autoPlay playsInline className="hidden" />;
};

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

  // WEBRTC VOICE CHAT STATES
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [remoteAudioStreams, setRemoteAudioStreams] = useState({}); 
  
  // INVITE FRIENDS STATES
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [myFriends, setMyFriends] = useState([]);
  const [isFetchingFriends, setIsFetchingFriends] = useState(false);
  
  const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const API_URL = RAW_API_URL.endsWith('/') ? RAW_API_URL.slice(0, -1) : RAW_API_URL;

  // Initialize invitedFriends from localStorage
  const [invitedFriends, setInvitedFriends] = useState(() => {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      const saved = localStorage.getItem(`invited_${roomId}_${user.id}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const peerInstance = useRef(null);
  const userAudioStream = useRef(null);
  const callsRef = useRef({});

  const currentUser = useMemo(() => {
    const storedUser = localStorage.getItem('currentUser');
    return storedUser ? JSON.parse(storedUser) : null;
  }, []);

  // Sync invitedFriends to localStorage whenever it changes
  useEffect(() => {
    if (currentUser?.id && roomId) {
      localStorage.setItem(`invited_${roomId}_${currentUser.id}`, JSON.stringify(invitedFriends));
    }
  }, [invitedFriends, roomId, currentUser]);

  // CALCULATE ALL MEMBERS 
  const allMembers = useMemo(() => {
    const membersMap = new Map();

    if (currentUser?.id) {
      membersMap.set(String(currentUser.id), {
        id: currentUser.id,
        name: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
        avatarUrl: currentUser.avatarUrl
      });
    }

    onlineUsers.forEach(u => {
      if (u?.id) {
        membersMap.set(String(u.id), {
          id: u.id,
          name: `${u.firstName} ${u.lastName}`.trim(),
          avatarUrl: u.avatarUrl
        });
      }
    });

    messages.forEach(m => {
      if (m.userId && m.type !== 'system' && !membersMap.has(String(m.userId))) {
        membersMap.set(String(m.userId), {
          id: m.userId,
          name: m.user,
          avatarUrl: m.avatarUrl
        });
      }
    });

    return Array.from(membersMap.values());
  }, [messages, currentUser, onlineUsers]);

  const isHost = partyDetails?.hostId === currentUser?.id;

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

    const newSocket = io(API_URL, {
      transports: ['websocket', 'polling'],
    });
    
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
      showToast(`Movie changed to: ${data.title}`);
    });

    // LISTEN FOR ONLINE USERS UPDATE
    newSocket.on('room_users_update', (usersData) => {
      const uniqueUsers = Array.from(new Map(usersData.map(u => [u.user.id, u.user])).values());
      setOnlineUsers(uniqueUsers);
    });

    newSocket.on('invite_reset_for_user', (userId) => {
      setInvitedFriends(prev => prev.filter(id => id !== userId));
    });

    // WEBRTC SIGNALING HANDLERS
    newSocket.on('user_joined_voice', (peerId) => {
      if (peerInstance.current && userAudioStream.current) {
        const call = peerInstance.current.call(peerId, userAudioStream.current);
        call.on('stream', (remoteStream) => {
          setRemoteAudioStreams(prev => ({ ...prev, [peerId]: remoteStream }));
        });
        callsRef.current[peerId] = call;
      }
    });

    newSocket.on('user_left_voice', (peerId) => {
      if (callsRef.current[peerId]) {
        callsRef.current[peerId].close();
        delete callsRef.current[peerId];
      }
      setRemoteAudioStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[peerId];
        return newStreams;
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [API_URL, roomId, navigate, currentUser]);

  // Clean up Voice Chat on unmount
  useEffect(() => {
    return () => {
      userAudioStream.current?.getTracks().forEach(track => track.stop());
      peerInstance.current?.destroy();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // LIVE SEARCH
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
      mediaType: movie.mediaType || (movie.title ? 'movie' : 'tv'), 
      season: 1, 
      episode: 1 
    };
    
    socket.emit('sync_media', mediaData);
    setCurrentMedia(mediaData);
    setSearchResults([]);
    setSearchTerm("");
    showToast(`You changed the movie to: ${movie.title}`);
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

  // OPEN INVITE MODAL & FETCH FRIENDS
  const handleOpenInviteModal = () => {
    setIsInviteModalOpen(true);
    setIsFetchingFriends(true);
    fetch(`${API_URL}/api/social/friends/${currentUser.id}`)
      .then(res => res.json())
      .then(data => {
        setMyFriends(data.friends || []);
        setIsFetchingFriends(false);
      })
      .catch(err => {
        console.error("Failed to fetch friends for invite", err);
        setIsFetchingFriends(false);
      });
  };

  // SEND INVITE NOTIFICATION TO FRIEND
  const sendInviteToFriend = async (friend) => {
    try {
      const res = await fetch(`${API_URL}/api/social/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: friend.id,
          senderId: currentUser.id,
          type: 'ROOM_INVITE',
          message: `${currentUser.firstName} invited you to join ${partyDetails?.roomName || 'a Watch Party'}!`,
          link: `/party/${roomId}` 
        })
      });
      
      if (res.ok) {
        setInvitedFriends(prev => [...prev, friend.id]);
        showToast(`Invited ${friend.firstName}!`);
        
        if (socket) {
           socket.emit('send_global_notification', { receiverId: friend.id });
        }
      } else if (res.status === 404) {
        console.warn("Backend API route not found. Using Socket fallback.");
        setInvitedFriends(prev => [...prev, friend.id]);
        showToast(`Invited ${friend.firstName}! (Live only)`);
        
        if (socket) {
           socket.emit('send_global_notification', { 
             receiverId: friend.id,
             type: 'ROOM_INVITE',
             link: `/party/${roomId}`
           });
        }
      } else {
        showToast("Failed to send invite.");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to send invite.");
    }
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

  // VOICE CHAT CONTROLS
  const toggleVoiceChat = async () => {
    if (isVoiceActive) {
      // LEAVE VOICE
      userAudioStream.current?.getTracks().forEach(track => track.stop());
      peerInstance.current?.destroy();
      setRemoteAudioStreams({});
      setIsVoiceActive(false);
      setIsMuted(false);
      if (socket) {
         socket.emit('leave_voice', { roomId, peerId: peerInstance.current?.id });
      }
      showToast("Left Voice Chat");
    } else {
      // JOIN VOICE
      try {
        const voiceSettings = JSON.parse(localStorage.getItem('movix_voice_settings')) || {};
        const audioConstraints = {
          echoCancellation: true,      
          noiseSuppression: true,      
          autoGainControl: true,       
          channelCount: 1,             
          googEchoCancellation: true,
          googAutoGainControl: true,
          googNoiseSuppression: true,
          googHighpassFilter: true,         
          googTypingNoiseDetection: true,   
          googNoiseReduction: true,
          ...(voiceSettings.selectedMic ? { deviceId: { exact: voiceSettings.selectedMic } } : {})
        };

        const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
        userAudioStream.current = stream;

        // Initialize PeerJS using free public Google STUN servers
        const peer = new Peer({
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          }
        });

        peer.on('open', (id) => {
          socket.emit('join_voice', { roomId, peerId: id });
        });

        // Answer incoming calls
        peer.on('call', (call) => {
          call.answer(stream);
          call.on('stream', (remoteStream) => {
            setRemoteAudioStreams(prev => ({ ...prev, [call.peer]: remoteStream }));
          });
          callsRef.current[call.peer] = call;
        });

        peerInstance.current = peer;
        setIsVoiceActive(true);
        showToast("Joined Voice Chat");
      } catch (err) {
        console.error("Microphone access error:", err);
        showToast("Microphone access denied or not found. Please check your settings.");
      }
    }
  };

  const toggleMute = () => {
    if (userAudioStream.current) {
      const audioTrack = userAudioStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 min-h-screen flex flex-col xl:flex-row gap-6 animate-[fadeIn_0.4s_ease-out]">
      
      {/* INVISIBLE AUDIO PLAYERS FOR WEBRTC */}
      {Object.entries(remoteAudioStreams).map(([peerId, stream]) => {
        const voiceSettings = JSON.parse(localStorage.getItem('movix_voice_settings')) || {};
        return (
          <AudioPlayer 
            key={peerId} 
            stream={stream} 
            volume={voiceSettings.speakerVol !== undefined ? voiceSettings.speakerVol : 100}
            speakerId={voiceSettings.selectedSpeaker}
          />
        );
      })}

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
                  
                  <div className="relative group cursor-pointer z-50">
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-full text-[10px] font-bold border border-gray-700 transition-colors">
                      <Users className="w-3 h-3 text-gray-400 group-hover:text-white transition-colors" />
                      {allMembers.length} Members
                    </div>
                    
                    <div className="absolute top-full left-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden">
                      <div className="p-2 border-b border-gray-700 bg-gray-900/50">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold text-center">Room Members</p>
                      </div>
                      
                      <div className="max-h-40 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-2">
                        {allMembers.map(member => (
                          <div key={member.id} className="flex items-center gap-2">
                            {member.avatarUrl && member.avatarUrl !== "null" ? (
                              <img 
                                src={member.avatarUrl} 
                                alt="avatar" 
                                className="w-5 h-5 rounded-full object-cover border border-white/10 shrink-0" 
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center border border-white/10 shrink-0">
                                <User className="w-3 h-3 text-gray-300" />
                              </div>
                            )}
                            <span className="text-xs text-white truncate">
                              {member.name} {member.id === partyDetails?.hostId && <span className="text-[10px] text-indigo-400 ml-1">(Host)</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
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
                      
                      <div className="max-h-40 overflow-y-auto custom-scrollbar p-2 flex flex-wrap gap-2">
                        {onlineUsers.map(u => (
                          <div key={u.id} className="relative group/tooltip cursor-pointer">
                            {u.avatarUrl && u.avatarUrl !== "null" ? (
                              <img 
                                src={u.avatarUrl} 
                                alt="avatar" 
                                className="w-8 h-8 rounded-full object-cover border-2 border-transparent group-hover/tooltip:border-indigo-500 transition-all shadow-md" 
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center border-2 border-transparent group-hover/tooltip:border-indigo-500 transition-all shadow-md shrink-0">
                                <User className="w-4 h-4 text-gray-300" />
                              </div>
                            )}
                            
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#1a1a1a] border border-white/10 text-white text-xs font-bold rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-xl z-[60] transform scale-95 group-hover/tooltip:scale-100 translate-y-1 group-hover/tooltip:translate-y-0">
                              {u.firstName} {u.lastName} {u.id === partyDetails?.hostId && <span className="text-indigo-400 ml-1">(Host)</span>}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1a1a1a]"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={copyRoomLink} className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-xl text-sm font-bold flex items-center justify-center transition-colors">
              {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Link2 className="w-4 h-4 mr-2" />}
              {copied ? 'Link Copied!' : 'Copy Link'}
            </button>
            <button onClick={handleOpenInviteModal} className="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold flex items-center justify-center transition-colors shadow-lg shadow-indigo-600/30">
              <UserPlus className="w-4 h-4 mr-2" /> Invite Friends
            </button>
          </div>
        </div>

        <div className="w-full aspect-video bg-black rounded-2xl border border-gray-800 shadow-2xl relative overflow-hidden ring-4 ring-gray-900/50">
          {!currentMedia ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
              <Film className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-bold">Waiting for someone to pick a movie...</p>
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

        {/* ROOM CONTROLS */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
            <Film className="w-4 h-4 mr-2 text-indigo-500" /> Room Controls: Pick a Movie
          </h3>
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

      {/* RIGHT PANEL: LIVE CHAT & VOICE */}
      <div className="w-full xl:w-80 2xl:w-96 flex flex-col bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden h-[600px] xl:h-auto">
        <div className="p-4 bg-black/40 border-b border-gray-800 shrink-0 flex items-center justify-between">
          <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span> Live Chat
          </h2>

          {/* VOICE CHAT UI */}
          <div className="flex items-center gap-2">
            {isVoiceActive && (
              <button
                onClick={toggleMute}
                className={`p-2 rounded-lg transition-colors ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={toggleVoiceChat}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                isVoiceActive
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                  : 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)]'
              }`}
            >
              {isVoiceActive ? (
                <><PhoneOff className="w-3 h-3" /> Leave Voice</>
              ) : (
                <><Phone className="w-3 h-3" /> Join Voice</>
              )}
            </button>
          </div>
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

      {/* INVITE FRIENDS MODAL */}
      <AnimatePresence>
        {isInviteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <div className="absolute inset-0" onClick={() => setIsInviteModalOpen(false)}></div>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#121212] border border-white/5 rounded-[24px] p-6 w-full max-w-md shadow-2xl relative z-10 flex flex-col gap-4"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h3 className="text-xl font-black text-white flex items-center gap-3">
                  <UserPlus className="w-5 h-5 text-indigo-500" /> Invite Friends
                </h3>
                <button onClick={() => setIsInviteModalOpen(false)} className="text-gray-400 hover:text-white bg-[#1c1c1e] hover:bg-[#2a2a2c] rounded-full p-2 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Copy Options */}
              <div className="flex gap-3 pb-2 border-b border-white/5">
                <button onClick={copyRoomLink} className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1c1c1e] hover:bg-[#2a2a2c] text-gray-300 hover:text-white text-sm font-bold rounded-xl transition-colors">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />} Copy Link
                </button>
                <button onClick={copyRoomId} className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1c1c1e] hover:bg-[#2a2a2c] text-gray-300 hover:text-white text-sm font-bold rounded-xl transition-colors">
                  {idCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />} Copy Room ID
                </button>
              </div>

              {/* Friends List */}
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {isFetchingFriends ? (
                  <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>
                ) : myFriends.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">You don't have any friends yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myFriends.map(friend => {
                      const isOnlineInRoom = onlineUsers.some(u => u.id === friend.id);
                      const isInvited = invitedFriends.includes(friend.id);

                      return (
                        <div key={friend.id} className="flex items-center justify-between bg-[#1c1c1e] p-3 rounded-2xl border border-transparent hover:border-white/5 transition-colors">
                          <div className="flex items-center gap-3">
                            {friend.avatarUrl && friend.avatarUrl !== "null" ? (
                              <img src={friend.avatarUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover border border-white/10" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center border border-white/10">
                                <User className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="text-white text-sm font-bold">{friend.firstName} {friend.lastName}</p>
                              <p className="text-[10px] text-gray-500">{friend.email}</p>
                            </div>
                          </div>
                          
                          {isOnlineInRoom ? (
                              <button disabled className="px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-1.5 bg-[#2a2a2c] text-gray-300 cursor-not-allowed">
                                <Users className="w-3.5 h-3.5" /> In Room
                              </button>
                          ) : isInvited ? (
                              <button disabled className="px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-1.5 bg-[#162f1f] text-[#4ade80] cursor-not-allowed border border-[#4ade80]/10">
                                <Check className="w-3.5 h-3.5" /> Sent
                              </button>
                          ) : (
                              <button onClick={() => sendInviteToFriend(friend)} className="px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-1.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all">
                                Invite
                              </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; }.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }.custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }`}</style>
    </div>
  );
}

// ep vercel build lai de nhan link backend