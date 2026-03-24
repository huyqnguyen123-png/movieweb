// movie-frontend/src/Settings.jsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom'; 
import { io } from 'socket.io-client';
import { 
  Mail, Phone, MapPin, Edit2, Save, 
  Camera, X, ArrowLeft, Loader2, CheckCircle,
  User, Mic, Settings as SettingsIcon, Volume2, Shield, Lock, Key,
  ChevronDown, Check, Eye, EyeOff, Users, Search, UserPlus, Trash2,
  UserCheck, Clock, Bell 
} from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate(); 
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('account'); 

  const SETTING_TABS = [
    { id: 'account', label: 'My Account', icon: User },
    { id: 'voice', label: 'Voice & Audio', icon: Mic },
    { id: 'friends', label: 'Friends', icon: Users },
  ];

  const fileInputRef = useRef(null);
  const API_URL = 'https://movixbackend-efpd.onrender.com';
  
  const [user, setUser] = useState({
    id: '', firstName: '', lastName: '', email: '', phone: '', country: '', avatarUrl: null 
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });

  // PASSWORD STATES
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [pwdData, setPwdData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMessage, setPwdMessage] = useState({ type: '', text: '' });

  // VOICE STATES
  const [inputs, setInputs] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('');
  const [micVol, setMicVol] = useState(100);
  const [speakerVol, setSpeakerVol] = useState(100);

  // FRIENDS STATES
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friendMessage, setFriendMessage] = useState({ type: '', text: '' });

  // MODAL DELETE FRIENDS 
  const [unfriendConfirm, setUnfriendConfirm] = useState({ show: false, friendshipId: null, friendId: null });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'friends') {
      setActiveTab('friends');
    }
  }, [location.search]);

  // SYNC VOICE SETTINGS WITH LOCALSTORAGE
  useEffect(() => {
    const savedVoice = JSON.parse(localStorage.getItem('movix_voice_settings'));
    if (savedVoice) {
      if (savedVoice.selectedMic) setSelectedMic(savedVoice.selectedMic);
      if (savedVoice.selectedSpeaker) setSelectedSpeaker(savedVoice.selectedSpeaker);
      if (savedVoice.micVol) setMicVol(savedVoice.micVol);
      if (savedVoice.speakerVol) setSpeakerVol(savedVoice.speakerVol);
    }
  }, []);

  useEffect(() => {
    const settings = { selectedMic, selectedSpeaker, micVol, speakerVol };
    localStorage.setItem('movix_voice_settings', JSON.stringify(settings));
  }, [selectedMic, selectedSpeaker, micVol, speakerVol]);

  const [isTesting, setIsTesting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); 
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const reqFrameRef = useRef(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate('/auth?mode=login');
    }

    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true }); 
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioIns = devices.filter(d => d.kind === 'audioinput');
        const audioOuts = devices.filter(d => d.kind === 'audiooutput');
        
        setInputs(audioIns);
        setOutputs(audioOuts);
        
        const savedVoice = JSON.parse(localStorage.getItem('movix_voice_settings'));
        if (!savedVoice?.selectedMic && audioIns.length > 0) setSelectedMic(audioIns[0].deviceId);
        if (!savedVoice?.selectedSpeaker && audioOuts.length > 0) setSelectedSpeaker(audioOuts[0].deviceId);
      } catch (err) {
        console.error("Device access denied", err);
      }
    };
    getDevices();

    return () => {
      stopMicTest();
    };
  }, [navigate]);

  useEffect(() => {
    if (activeTab === 'friends' && user.id) {
      fetchFriends();
    }
  }, [activeTab, user.id]);

  useEffect(() => {
    if (!user.id || activeTab !== 'friends') return;

    const socket = io(API_URL);
    socket.emit('register_global', user.id);

    socket.on('receive_notification', (notif) => {
      if (notif.type === 'FRIEND_REQUEST' || notif.type === 'FRIEND_ACCEPTED') {
        fetchFriends(); 
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user.id, activeTab, API_URL]);

  useEffect(() => {
    if (searchResult) {
      const isNowFriend = friendsList.some(f => f.id === searchResult.id);
      if (isNowFriend && !searchResult.isFriend) {
        setSearchResult(prev => ({ ...prev, isFriend: true, requestSent: false }));
      }
    }
  }, [friendsList, searchResult]);

  const handleTabSwitch = (tabId) => {
    if (activeTab === 'voice' && tabId !== 'voice') stopMicTest();
    setActiveTab(tabId);
    
    setFriendMessage({ type: '', text: '' });
    setSearchResult(null);
    setSearchEmail('');
  };

  const handleChange = (e) => setUser({ ...user, [e.target.name]: e.target.value });

  const handlePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) return alert("Image is too large! Please choose under 10MB.");
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 250; 
          const MAX_HEIGHT = 250;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          
          setUser({ ...user, avatarUrl: compressedBase64 });
        };
        img.src = event.target.result;
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${API_URL}/api/user/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: user.firstName, lastName: user.lastName,
          phone: user.phone, country: user.country, avatarUrl: user.avatarUrl
        })
      });
      if (!response.ok) throw new Error('Failed to update profile');
      const updatedUserFromDB = await response.json();
      const finalUpdatedUser = { ...user, ...updatedUserFromDB, lastUpdated: new Date().getTime() };
      localStorage.setItem('currentUser', JSON.stringify(finalUpdatedUser));
      setUser(finalUpdatedUser);
      window.dispatchEvent(new Event("userUpdate"));
      setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => { setIsEditing(false); setSaveMessage({ type: '', text: '' }); }, 1500);
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) setUser(JSON.parse(storedUser));
    setIsEditing(false);
    setSaveMessage({ type: '', text: '' });
  };

  // PASSWORD LOGIC
  const handlePwdChange = (e) => setPwdData({ ...pwdData, [e.target.name]: e.target.value });

  const submitPasswordChange = async (e) => {
    e.preventDefault();
    if (pwdData.newPassword !== pwdData.confirmPassword) {
      return setPwdMessage({ type: 'error', text: 'New passwords do not match.' });
    }
    if (pwdData.newPassword.length < 6) {
      return setPwdMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
    }

    setPwdSaving(true);
    setPwdMessage({ type: '', text: '' });

    try {
      const res = await fetch(`${API_URL}/api/user/${user.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentPassword: pwdData.currentPassword, 
          newPassword: pwdData.newPassword 
        })
      });

      const data = await res.json();

      if (res.ok) {
        setPwdMessage({ type: 'success', text: 'Password updated successfully!' });
        setTimeout(() => {
          setIsChangingPwd(false);
          setPwdData({ currentPassword: '', newPassword: '', confirmPassword: '' });
          setPwdMessage({ type: '', text: '' });
        }, 2000);
      } else {
        setPwdMessage({ type: 'error', text: data.error || 'Failed to update password.' });
      }
    } catch (err) {
      setPwdMessage({ type: 'error', text: 'Server connection error.' });
    } finally {
      setPwdSaving(false);
    }
  };

  // VOICE LOGIC
  const stopMicTest = () => {
    setIsTesting(false);
    setAudioLevel(0);
    if (reqFrameRef.current) cancelAnimationFrame(reqFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  const toggleMicTest = async () => {
    if (isTesting) {
      stopMicTest();
    } else {
      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            audio: selectedMic ? { deviceId: { exact: selectedMic } } : true 
          });
        } catch (fallbackErr) {
          console.warn("Specific mic failed, falling back to default mic...", fallbackErr);
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }

        streamRef.current = stream;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }

        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        
        analyser.fftSize = 256;
        source.connect(analyser);
        
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;
        setIsTesting(true);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkAudioLevel = () => {
          if (!analyserRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) { sum += dataArray[i]; }
          let average = sum / dataArray.length;
          
          let finalLevel = Math.min(100, Math.floor((average / 255) * 100 * (micVol / 100) * 2.5)); 
          setAudioLevel(finalLevel);
          reqFrameRef.current = requestAnimationFrame(checkAudioLevel);
        };
        checkAudioLevel();
      } catch (err) {
        console.error("Mic test error:", err);
        alert("Cannot access microphone. Please check your browser permissions.");
      }
    }
  };

  // FRIENDS LOGIC
  const fetchFriends = async () => {
    try {
      const res = await fetch(`${API_URL}/api/social/friends/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setFriendsList(data.friends);
        setPendingRequests(data.pendingRequests);
      }
    } catch (err) {
      console.error("Failed to fetch friends", err);
    }
  };

  const searchUserByEmail = async (e) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;
    
    setIsSearchingUser(true);
    setFriendMessage({ type: '', text: '' });
    
    try {
      const res = await fetch(`${API_URL}/api/social/search?email=${encodeURIComponent(searchEmail)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.id === user.id) {
          setSearchResult(null);
          setFriendMessage({ type: 'error', text: "You cannot add yourself." });
        } else {
          const isAlreadyFriend = friendsList.some(f => f.id === data.id);
          setSearchResult({ ...data, isFriend: isAlreadyFriend });
        }
      } else {
        setSearchResult(null);
        setFriendMessage({ type: 'error', text: "User not found with this email." });
      }
    } catch (err) {
      setFriendMessage({ type: 'error', text: "Search failed." });
    } finally {
      setIsSearchingUser(false);
    }
  };

  const sendFriendRequest = async (receiverId) => {
    try {
      const res = await fetch(`${API_URL}/api/social/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: user.id, receiverId })
      });
      const data = await res.json();
      
      if (res.ok) {
        setFriendMessage({ type: 'success', text: "Friend request sent!" });
        setSearchResult(prev => ({ ...prev, requestSent: true })); 
      } else {
        if (data.error && data.error.includes("already exists or pending")) {
          setFriendMessage({ type: '', text: '' }); 
          setSearchResult(prev => ({ ...prev, requestSent: true })); 
        } else {
          setFriendMessage({ type: 'error', text: data.error || "Failed to send request." });
        }
      }
    } catch (err) {
      setFriendMessage({ type: 'error', text: "Connection error." });
    }
  };

  const respondToRequest = async (friendshipId, status) => {
    try {
      const res = await fetch(`${API_URL}/api/social/friends/respond`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, status })
      });
      if (res.ok) {
        fetchFriends(); 
      }
    } catch (err) {
      console.error("Failed to respond", err);
    }
  };

  const handleUnfriendClick = (friendshipId, friendId) => {
    setUnfriendConfirm({ show: true, friendshipId: friendshipId, friendId: friendId });
  };

  const confirmUnfriend = async () => {
    if (!unfriendConfirm.friendshipId) return;
    
    const targetFriendshipId = unfriendConfirm.friendshipId;
    const targetFriendId = unfriendConfirm.friendId;
    setUnfriendConfirm({ show: false, friendshipId: null, friendId: null });
    setFriendsList(prev => prev.filter(f => f.friendshipId !== targetFriendshipId));

    if (searchResult && searchResult.id === targetFriendId) {
      setSearchResult(prev => ({ ...prev, isFriend: false, requestSent: false }));
    }
    try {
      const res = await fetch(`${API_URL}/api/social/friends/${targetFriendshipId}`, { method: 'DELETE' });
      if (!res.ok) fetchFriends(); 
    } catch (err) {
      console.error("Failed to unfriend", err);
      fetchFriends(); 
    }
  };

  const renderMiniAvatar = (url) => {
    if (url && url !== "null") {
      return <img src={url} alt="avatar" className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0" />;
    }
    return (
      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center border border-white/10 shrink-0">
        <User className="w-5 h-5 text-gray-400" />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 sm:p-6 md:p-12 relative w-full overflow-x-hidden">
      <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-red-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

      <div className="max-w-6xl mx-auto relative z-10 flex flex-col gap-6 w-full">
        
        <div className="flex items-center mb-4">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-sm">Back to Home</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start w-full">
          <div className="w-full md:w-72 shrink-0 bg-[#121212]/50 backdrop-blur-xl border border-white/5 p-5 rounded-3xl shadow-2xl flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible scrollbar-hide">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 px-3 hidden md:block">User Settings</h3>
            {SETTING_TABS.map(tab => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabSwitch(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all shrink-0 md:w-full text-left ${
                    isActive 
                      ? 'bg-red-600/10 text-red-500 border border-red-500/20 shadow-md' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                  
                  {tab.id === 'friends' && pendingRequests.length > 0 && (
                    <span className="ml-auto bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 w-full min-w-0">
            <AnimatePresence mode="wait">
              {activeTab === 'account' ? (
                <motion.div 
                  key="account"
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}
                  className="space-y-6 pb-20 w-full"
                >
                  <div className="flex flex-col sm:flex-row items-center gap-8 bg-[#121212]/50 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-visible">
                    <div className="relative group shrink-0" onClick={() => isEditing && fileInputRef.current.click()}>
                      {user.avatarUrl && user.avatarUrl !== "null" ? (
                        <img 
                          src={user.avatarUrl} alt="Avatar" 
                          className={`w-32 h-32 rounded-full object-cover border-4 shadow-2xl transition-all duration-300 ${
                            isEditing ? 'border-red-600 cursor-pointer hover:opacity-80' : 'border-white/10 group-hover:border-white/20'
                          }`}
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                        />
                      ) : null}
                      
                      <div className={`w-32 h-32 rounded-full border-4 shadow-2xl transition-all duration-300 overflow-hidden bg-[#e4e6eb] items-end justify-center ${
                          (!user.avatarUrl || user.avatarUrl === "null") ? 'flex' : 'hidden'
                        } ${isEditing ? 'border-red-600 cursor-pointer hover:opacity-80' : 'border-white/10 group-hover:border-white/20'}`}
                      >
                        <svg className="w-28 h-28 text-[#bcc0c4] translate-y-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
                      
                      {isEditing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full text-white pointer-events-none transition-opacity opacity-0 group-hover:opacity-100">
                          <Camera className="w-8 h-8" />
                        </div>
                      )}
                      <input type="file" ref={fileInputRef} onChange={handlePictureChange} accept="image/*" className="hidden" />
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-2 min-w-0 w-full">
                      <h1 className="text-3xl font-black truncate tracking-tighter text-white">
                        {user.firstName} {user.lastName}
                      </h1>
                      <p className="text-gray-400 text-sm flex items-center justify-center sm:justify-start gap-2 truncate">
                        <Mail className="w-4 h-4 shrink-0" /> {user.email}
                      </p>

                      {saveMessage.text && (
                        <div className={`mt-2 flex items-center justify-center sm:justify-start gap-2 text-sm font-bold ${saveMessage.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                          {saveMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          {saveMessage.text}
                        </div>
                      )}
                    </div>

                    <div className="sm:absolute sm:top-6 sm:right-6 flex justify-center w-full sm:w-auto gap-3 z-20 mt-4 sm:mt-0">
                      {isEditing ? (
                        <>
                          <button onClick={handleCancel} disabled={isSaving} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-colors disabled:opacity-50">
                            <X className="w-5 h-5" />
                          </button>
                          <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-600/30 disabled:opacity-50">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/30">
                          <Edit2 className="w-4 h-4" /> Edit
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#121212]/50 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-visible w-full">
                    <h2 className="text-xl font-black text-white mb-8 tracking-tight flex items-center gap-3">
                      <User className="w-5 h-5 text-red-600" /> Account Details
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <InputGroup label="First Name" id="firstName" name="firstName" value={user.firstName} onChange={handleChange} disabled={!isEditing || isSaving} />
                      <InputGroup label="Last Name" id="lastName" name="lastName" value={user.lastName} onChange={handleChange} disabled={!isEditing || isSaving} />
                      <InputGroup label="Phone Number" id="phone" name="phone" icon={Phone} value={user.phone} onChange={handleChange} disabled={!isEditing || isSaving} type="tel" />
                      <InputGroup label="Country/Region" id="country" name="country" icon={MapPin} value={user.country} onChange={handleChange} disabled={!isEditing || isSaving} />
                      <div className="md:col-span-2">
                        <InputGroup label="Email (ReadOnly)" id="email" name="email" icon={Mail} value={user.email} disabled={true} readOnly />
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#121212]/50 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden w-full">
                    <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 mb-6">
                      <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                        <Shield className="w-5 h-5 text-red-600" /> Password & Security
                      </h2>
                      {!isChangingPwd && (
                        <button 
                          onClick={() => setIsChangingPwd(true)}
                          className="w-full sm:w-auto px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors border border-white/10 flex items-center justify-center gap-2 text-sm"
                        >
                          <Lock className="w-4 h-4" /> Change Password
                        </button>
                      )}
                    </div>

                    <AnimatePresence>
                      {isChangingPwd && (
                        <motion.form 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-6 pt-4 border-t border-white/5"
                          onSubmit={submitPasswordChange}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputGroup 
                              label="Current Password" id="currentPassword" name="currentPassword" 
                              type="password" icon={Key} value={pwdData.currentPassword} 
                              onChange={handlePwdChange} disabled={pwdSaving} 
                            />
                            <div className="hidden md:block"></div> 
                            <InputGroup 
                              label="New Password" id="newPassword" name="newPassword" 
                              type="password" icon={Lock} value={pwdData.newPassword} 
                              onChange={handlePwdChange} disabled={pwdSaving} 
                            />
                            <InputGroup 
                              label="Confirm New Password" id="confirmPassword" name="confirmPassword" 
                              type="password" icon={Lock} value={pwdData.confirmPassword} 
                              onChange={handlePwdChange} disabled={pwdSaving} 
                            />
                          </div>

                          <div className="flex flex-col sm:flex-row items-center justify-between pt-2 gap-4">
                            <div className="text-sm font-bold w-full text-center sm:text-left">
                              {pwdMessage.text && (
                                <span className={`flex items-center justify-center sm:justify-start gap-2 ${pwdMessage.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                                  {pwdMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                  {pwdMessage.text}
                                </span>
                              )}
                            </div>
                            <div className="flex w-full sm:w-auto gap-3">
                              <button 
                                type="button" onClick={() => setIsChangingPwd(false)} disabled={pwdSaving}
                                className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white transition-colors border border-white/10 sm:border-transparent"
                              >
                                Cancel
                              </button>
                              <button 
                                type="submit" disabled={pwdSaving || !pwdData.currentPassword || !pwdData.newPassword || !pwdData.confirmPassword}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/30 disabled:opacity-50"
                              >
                                {pwdSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {pwdSaving ? 'Updating...' : 'Update Password'}
                              </button>
                            </div>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </div>

                </motion.div>
              ) : activeTab === 'voice' ? (
                <motion.div 
                  key="voice"
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}
                  className="space-y-6 w-full"
                >
                  <div className="bg-[#121212]/50 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden w-full">
                    <h2 className="text-2xl font-black text-white mb-8 tracking-tight flex items-center gap-3">
                      <SettingsIcon className="w-6 h-6 text-red-600" /> Hardware Settings
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                          <Mic className="w-4 h-4 mr-2 text-red-500" /> Input Device
                        </label>
                        <CustomSelect 
                          value={selectedMic} 
                          options={inputs} 
                          onChange={setSelectedMic} 
                          placeholder="Select Microphone..."
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                          <Volume2 className="w-4 h-4 mr-2 text-red-500" /> Output Device
                        </label>
                        <CustomSelect 
                          value={selectedSpeaker} 
                          options={outputs} 
                          onChange={setSelectedSpeaker} 
                          placeholder="Select Speaker..."
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Input Volume</label>
                          <span className="text-xs font-mono text-red-500">{micVol}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="100" value={micVol} onChange={(e) => setMicVol(e.target.value)} 
                          className="w-full accent-red-600 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer outline-none hover:bg-white/20 transition-colors" 
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Output Volume</label>
                          <span className="text-xs font-mono text-red-500">{speakerVol}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="100" value={speakerVol} onChange={(e) => setSpeakerVol(e.target.value)} 
                          className="w-full accent-red-600 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer outline-none hover:bg-white/20 transition-colors" 
                        />
                      </div>
                    </div>

                    <div className="my-10 h-px bg-white/10 w-full"></div>

                    <div>
                      <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                        <Mic className="w-5 h-5 mr-2 text-red-500" /> Mic Test Visualizer
                      </h3>
                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        <button 
                          onClick={toggleMicTest}
                          className={`shrink-0 px-8 py-3.5 text-sm font-black uppercase tracking-widest rounded-xl transition-all shadow-lg w-full sm:w-48 ${
                            isTesting 
                              ? 'bg-transparent border-2 border-red-600 text-red-500 hover:bg-red-600/10 shadow-[0_0_15px_rgba(220,38,38,0.3)]' 
                              : 'bg-red-600 text-white hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)]'
                          }`}
                        >
                          {isTesting ? "Stop Test" : "Test Mic"}
                        </button>

                        <div className="flex-1 w-full flex items-center h-12 gap-[4px] bg-black/40 p-2.5 rounded-xl border border-white/5 shadow-inner">
                          {[...Array(35)].map((_, i) => {
                            const threshold = (i / 35) * 100;
                            const isActive = audioLevel > threshold;
                            const barColor = i > 28 ? 'bg-red-500' : (i > 20 ? 'bg-yellow-500' : 'bg-green-500');
                            return (
                              <div 
                                key={i} 
                                className={`flex-1 h-full transition-colors duration-75 rounded-[2px] ${isActive ? barColor : 'bg-gray-800'}`}
                                style={{ opacity: isActive ? 1 : 0.4 }}
                              />
                            );
                          })}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 font-medium mt-4 text-center sm:text-left">
                        Speak into your microphone to verify that it's picking up sound. Adjust Input Volume if necessary.
                      </p>
                    </div>

                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="friends"
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}
                  className="space-y-6 pb-20 w-full"
                >
                  <div className="bg-[#121212]/50 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden w-full">
                    <h2 className="text-2xl font-black text-white mb-6 tracking-tight flex items-center gap-3">
                      <UserPlus className="w-6 h-6 text-red-600" /> Add Friend
                    </h2>
                    
                    <form onSubmit={searchUserByEmail} className="flex flex-col sm:flex-row gap-4 relative">
                      <div className="flex-1 relative w-full">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                          <Search className="w-5 h-5" />
                        </div>
                        <input 
                          type="email" 
                          value={searchEmail} 
                          onChange={(e) => setSearchEmail(e.target.value)} 
                          placeholder="Enter your friend's exact email..." 
                          required
                          className="w-full bg-black/40 border border-white/10 text-white rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-red-600 focus:bg-white/5 transition-all text-[16px] sm:text-sm shadow-inner"
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={isSearchingUser} 
                        className="w-full sm:w-auto px-8 py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/30 disabled:opacity-50 shrink-0"
                      >
                        {isSearchingUser ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Search"}
                      </button>
                    </form>

                    {friendMessage.text && (
                      <div className={`mt-4 text-sm font-bold flex items-center justify-center sm:justify-start gap-2 ${friendMessage.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                        {friendMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        {friendMessage.text}
                      </div>
                    )}

                    {searchResult && (
                      <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-black/40 border border-white/10 p-4 rounded-2xl gap-4 w-full">
                        <div className="flex items-center gap-4 w-full min-w-0">
                          {renderMiniAvatar(searchResult.avatarUrl)}
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-white text-[15px] sm:text-sm truncate w-full">{searchResult.firstName} {searchResult.lastName}</p>
                            <p className="text-xs text-gray-500 truncate w-full">{searchResult.email}</p>
                          </div>
                        </div>
                        
                        <div className="w-full sm:w-auto shrink-0 flex">
                          {searchResult.isFriend ? (
                            <button disabled className="w-full sm:w-auto px-5 py-2.5 bg-green-500/10 text-green-500 border border-green-500/20 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                              <UserCheck className="w-4 h-4" /> Friends
                            </button>
                          ) : searchResult.requestSent ? (
                            <button disabled className="w-full sm:w-auto px-5 py-2.5 bg-white/5 text-gray-400 border border-white/10 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                              <Clock className="w-4 h-4" /> Pending
                            </button>
                          ) : (
                            <button 
                              onClick={() => sendFriendRequest(searchResult.id)} 
                              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-600/30"
                            >
                              <UserPlus className="w-4 h-4" /> Send Request
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {pendingRequests.length > 0 && (
                    <div className="bg-[#121212]/50 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden w-full">
                      <h2 className="text-xl font-black text-white mb-6 tracking-tight flex items-center gap-3">
                        <Bell className="w-5 h-5 text-yellow-500" /> Pending Requests
                      </h2>
                      <div className="space-y-3">
                        {pendingRequests.map(req => (
                          <div key={req.friendshipId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-black/40 border border-white/5 p-4 rounded-2xl hover:bg-white/5 transition-colors gap-4">
                            <div className="flex items-center gap-4 w-full min-w-0">
                              {renderMiniAvatar(req.avatarUrl)}
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-white text-sm truncate w-full">{req.firstName} {req.lastName}</p>
                                <p className="text-xs text-gray-500 truncate w-full">wants to be your friend</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                              <button 
                                onClick={() => respondToRequest(req.friendshipId, 'ACCEPTED')} 
                                className="flex-1 sm:flex-none h-10 px-4 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white flex items-center justify-center transition-colors shadow-lg font-bold text-sm" 
                                title="Accept"
                              >
                                Accept
                              </button>
                              <button 
                                onClick={() => respondToRequest(req.friendshipId, 'DECLINED')} 
                                className="flex-1 sm:flex-none h-10 px-4 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors shadow-lg font-bold text-sm" 
                                title="Decline"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-[#121212]/50 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden w-full">
                    <h2 className="text-xl font-black text-white mb-6 tracking-tight flex items-center gap-3">
                      <Users className="w-5 h-5 text-indigo-500" /> My Friends
                    </h2>
                    
                    {friendsList.length === 0 ? (
                      <div className="p-8 text-center bg-black/20 border border-dashed border-white/10 rounded-2xl">
                        <Users className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">You don't have any friends yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {friendsList.map(friend => (
                          <div key={friend.friendshipId} className="flex items-center justify-between bg-black/40 border border-white/5 p-3 pr-4 rounded-2xl group hover:border-white/10 transition-colors w-full">
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                              {renderMiniAvatar(friend.avatarUrl)}
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-white text-[15px] sm:text-sm truncate w-full">{friend.firstName} {friend.lastName}</p>
                                <p className="text-[11px] sm:text-[10px] text-gray-500 truncate w-full">{friend.email}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleUnfriendClick(friend.friendshipId, friend.id)} 
                              className="md:opacity-0 group-hover:opacity-100 p-2.5 sm:p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all shrink-0" 
                              title="Unfriend"
                            >
                              <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* CUSTOM MODAL CONFIRM */}
      <AnimatePresence>
        {unfriendConfirm.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <div className="absolute inset-0" onClick={() => setUnfriendConfirm({ show: false, friendshipId: null, friendId: null })}></div>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-4 relative z-10"
            >
              <div className="flex items-center gap-3 text-red-500">
                <div className="p-3 bg-red-500/10 rounded-2xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-white">Remove Friend</h3>
              </div>
              
              <p className="text-sm text-gray-400 leading-relaxed px-1">
                Are you sure you want to remove this user from your friends list? This action cannot be undone.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                <button
                  onClick={() => setUnfriendConfirm({ show: false, friendshipId: null, friendId: null })}
                  className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUnfriend}
                  className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition-colors shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
        
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

// Reusable Input Group Component
function InputGroup({ label, id, name, value, onChange, disabled, type = "text", icon: Icon, readOnly = false }) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const hasValue = value !== null && value !== undefined && value.toString().length > 0;
  const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="relative overflow-visible w-full">
      <label 
        htmlFor={id} 
        className={`absolute left-3.5 px-1 font-bold transition-all z-10 pointer-events-none rounded ${
          isFocused || hasValue
            ? '-top-3 text-[11px] bg-[#1a1a1a] text-red-500' 
            : 'top-4 text-[16px] sm:text-sm bg-transparent text-gray-500'   
        } ${readOnly ? 'text-gray-600 bg-[#121212]' : ''}`}
      >
        <span className="flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {label}
        </span>
      </label>

      <input
        type={inputType}
        id={id}
        name={name}
        value={value || ''}
        onChange={onChange}
        disabled={disabled || readOnly}
        onFocus={() => !readOnly && setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        readOnly={readOnly}
        className={`w-full bg-transparent border text-white rounded-xl py-3.5 pl-4 ${type === 'password' ? 'pr-12' : 'pr-4'} focus:outline-none transition-all text-[16px] sm:text-sm shadow-inner placeholder:text-transparent ${
          readOnly 
            ? 'border-white/5 text-gray-600 bg-gray-900/30' 
            : disabled 
              ? 'border-white/10 text-gray-500 bg-transparent' 
              : 'border-white/20 hover:border-white/40 focus:border-red-600 focus:bg-white/5'
        }`}
        placeholder={label}
      />
      
      {type === 'password' && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white focus:outline-none transition-colors"
          tabIndex="-1" 
        >
          {showPassword ? <EyeOff className="w-5 h-5 sm:w-4 sm:h-4" /> : <Eye className="w-5 h-5 sm:w-4 sm:h-4" />}
        </button>
      )}
    </div>
  );
}

// CUSTOM DROPDOWN COMPONENT 
function CustomSelect({ value, options, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.deviceId === value);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-black/40 border text-white rounded-xl py-3.5 px-4 flex items-center justify-between cursor-pointer transition-all text-[16px] sm:text-sm shadow-inner ${
          isOpen ? 'border-red-600 bg-white/5' : 'border-white/10 hover:border-white/30'
        }`}
      >
        <span className="truncate pr-4 select-none">
          {selectedOption ? (selectedOption.label || `Device ${selectedOption.deviceId.slice(0,5)}`) : placeholder}
        </span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </motion.div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] max-h-60 overflow-y-auto custom-scrollbar py-1"
          >
            {options.length === 0 ? (
              <li className="px-4 py-3 text-[16px] sm:text-sm text-gray-500 italic">No devices found</li>
            ) : (
              options.map((opt) => (
                <li
                  key={opt.deviceId}
                  onClick={() => {
                    onChange(opt.deviceId);
                    setIsOpen(false);
                  }}
                  className={`px-4 py-3 text-[16px] sm:text-sm cursor-pointer transition-colors flex items-center justify-between group ${
                    value === opt.deviceId
                      ? 'bg-red-600/10 text-red-500 font-bold'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="truncate pr-2 group-hover:translate-x-1 transition-transform">{opt.label || `Device ${opt.deviceId.slice(0,5)}`}</span>
                  {value === opt.deviceId && <Check className="w-4 h-4 shrink-0 text-red-500" />}
                </li>
              ))
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}