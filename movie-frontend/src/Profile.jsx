// movie-frontend/src/Profile.jsx
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; 
import { 
  Mail, Phone, MapPin, Edit2, Save, 
  Camera, X, ArrowLeft, Loader2, CheckCircle
} from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate(); 
  const fileInputRef = useRef(null);

  // API URL from environment variables
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Initialize with empty data to prevent undefined errors before loading
  const [user, setUser] = useState({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    avatarUrl: null 
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false); 
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });

  // Fetch logged-in user data from localStorage when component mounts
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
    } else {
      navigate('/auth?mode=login');
    }
  }, [navigate]);

  // Handle text input changes
  const handleChange = (e) => {
    setUser({
      ...user,
      [e.target.name]: e.target.value
    });
  };

  // Handle profile picture change 
  const handlePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image is too large! Please choose under 2MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setUser({
          ...user,
          avatarUrl: reader.result 
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle saving user information TO DATABASE
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage({ type: '', text: '' });

    try {
      // Call Backend API to update user in PostgreSQL
      const response = await fetch(`${API_URL}/api/user/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          country: user.country,
          avatarUrl: user.avatarUrl
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update profile in database');
      }

      const updatedUserFromDB = await response.json();

      // Create updated user object for localStorage
      const finalUpdatedUser = { 
        ...user,
        ...updatedUserFromDB,
        lastUpdated: new Date().getTime() 
      };

      // Update local storage so the new data persists
      localStorage.setItem('currentUser', JSON.stringify(finalUpdatedUser));
      setUser(finalUpdatedUser);
      
      // BROADCAST CHANGE: Crucial for Navbar & WatchParty to detect new avatar immediately
      window.dispatchEvent(new Event("userUpdate"));
      
      setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => {
        setIsEditing(false);
        setSaveMessage({ type: '', text: '' });
      }, 1500);

    } catch (error) {
      console.error("Error updating profile:", error);
      setSaveMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing and revert changes back to original localStorage data
  const handleCancel = () => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsEditing(false);
    setSaveMessage({ type: '', text: '' });
  };

  // Trigger the hidden file input when clicking on the image overlay
  const triggerFileInput = () => {
    if (isEditing) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-red-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto relative z-10 space-y-6"
      >
        {/* BACK TO HOME BUTTON */}
        <div className="flex justify-start">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-sm">Back to Home</span>
          </button>
        </div>

        {/* Header - Profile Picture and Main Info */}
        <div className="flex flex-col sm:flex-row items-center gap-8 bg-[#121212]/50 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-visible">
          
          {/* Clickable Profile Picture */}
          <div className="relative group shrink-0" onClick={triggerFileInput}>
            {user.avatarUrl && user.avatarUrl !== "null" ? (
              <img 
                src={user.avatarUrl} 
                alt={`${user.firstName} ${user.lastName}`} 
                className={`w-36 h-36 rounded-full object-cover border-4 shadow-2xl transition-all duration-300 ${
                  isEditing 
                    ? 'border-red-600 cursor-pointer hover:opacity-80' 
                    : 'border-white/10 group-hover:border-white/20'
                }`}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            
            <div 
              className={`w-36 h-36 rounded-full border-4 shadow-2xl transition-all duration-300 overflow-hidden bg-[#e4e6eb] items-end justify-center ${
                (!user.avatarUrl || user.avatarUrl === "null") ? 'flex' : 'hidden'
              } ${
                isEditing 
                  ? 'border-red-600 cursor-pointer hover:opacity-80' 
                  : 'border-white/10 group-hover:border-white/20'
              }`}
            >
              <svg 
                className="w-32 h-32 text-[#bcc0c4] translate-y-3" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            
            {isEditing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full text-white pointer-events-none transition-opacity opacity-0 group-hover:opacity-100">
                <Camera className="w-8 h-8" />
              </div>
            )}
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePictureChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2 truncate">
            <h1 className="text-4xl font-black truncate tracking-tighter text-white">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-gray-400 text-sm flex items-center justify-center sm:justify-start gap-2">
              <Mail className="w-4 h-4" />
              {user.email}
            </p>

            {/* Status Message Display */}
            {saveMessage.text && (
              <div className={`mt-2 flex items-center justify-center sm:justify-start gap-2 text-sm font-bold ${saveMessage.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                {saveMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                {saveMessage.text}
              </div>
            )}
          </div>

          {/* Control Buttons */}
          <div className="absolute top-8 right-8 flex gap-3 z-20">
            {isEditing ? (
              <>
                <button 
                  onClick={handleCancel} 
                  disabled={isSaving}
                  className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="flex items-center gap-3 px-6 py-3.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-600/30 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-3 px-6 py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/30">
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Detailed Information Section */}
        <div className="bg-[#121212]/50 backdrop-blur-xl border border-white/5 p-10 rounded-[2.5rem] shadow-2xl relative overflow-visible">
          <h2 className="text-2xl font-black text-white mb-10 tracking-tight flex items-center gap-3">
            <Edit2 className="w-6 h-6 text-red-600" />
            Edit Profile Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            <InputGroup 
              label="First Name" 
              id="firstName" 
              name="firstName" 
              value={user.firstName} 
              onChange={handleChange} 
              disabled={!isEditing || isSaving}
            />
            
            <InputGroup 
              label="Last Name" 
              id="lastName" 
              name="lastName" 
              value={user.lastName} 
              onChange={handleChange} 
              disabled={!isEditing || isSaving}
            />

            <InputGroup 
              label="Phone Number" 
              id="phone" 
              name="phone" 
              icon={Phone} 
              value={user.phone} 
              onChange={handleChange} 
              disabled={!isEditing || isSaving}
              type="tel"
            />

            <InputGroup 
              label="Country/Region" 
              id="country" 
              name="country" 
              icon={MapPin} 
              value={user.country} 
              onChange={handleChange} 
              disabled={!isEditing || isSaving}
            />

            <div className="md:col-span-2">
              <InputGroup 
                label="Email (ReadOnly)" 
                id="email" 
                name="email" 
                icon={Mail} 
                value={user.email} 
                disabled={true} 
                readOnly
              />
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  );
}

// Reusable Input Group Component with Full Styling
function InputGroup({ label, id, name, value, onChange, disabled, type = "text", icon: Icon, readOnly = false }) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== null && value !== undefined && value.toString().length > 0;

  return (
    <div className="relative overflow-visible">
      <label 
        htmlFor={id} 
        className={`absolute left-3.5 px-1 font-bold transition-all z-10 pointer-events-none rounded ${
          isFocused || hasValue
            ? '-top-3 text-[11px] bg-[#1a1a1a] text-red-500' 
            : 'top-4 text-sm bg-transparent text-gray-500'   
        } ${readOnly ? 'text-gray-600 bg-[#121212]' : ''}`}
      >
        <span className="flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {label}
        </span>
      </label>

      <input
        type={type}
        id={id}
        name={name}
        value={value || ''}
        onChange={onChange}
        disabled={disabled || readOnly}
        onFocus={() => !readOnly && setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        readOnly={readOnly}
        className={`w-full bg-transparent border text-white rounded-xl py-4 px-5 focus:outline-none transition-all text-sm shadow-inner placeholder:text-transparent ${
          readOnly 
            ? 'border-white/5 text-gray-600 bg-gray-900/30' 
            : disabled 
              ? 'border-white/10 text-gray-500 bg-transparent' 
              : 'border-white/20 hover:border-white/40 focus:border-red-600 focus:bg-white/5'
        }`}
        placeholder={label}
      />
    </div>
  );
}