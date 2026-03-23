// movie-frontend/src/Auth.jsx
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, ChevronDown, Search, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COUNTRIES = [
  { n: "Afghanistan", f: "AF", code: "+93" }, { n: "Albania", f: "AL", code: "+355" }, { n: "Algeria", f: "DZ", code: "+213" },
  { n: "American Samoa", f: "AS", code: "+1-684" }, { n: "Andorra", f: "AD", code: "+376" }, { n: "Angola", f: "AO", code: "+244" },
  { n: "Anguilla", f: "AI", code: "+1-264" }, { n: "Antarctica", f: "AQ", code: "+672" }, { n: "Antigua and Barbuda", f: "AG", code: "+1-268" },
  { n: "Argentina", f: "AR", code: "+54" }, { n: "Armenia", f: "AM", code: "+374" }, { n: "Aruba", f: "AW", code: "+297" },
  { n: "Australia", f: "AU", code: "+61" }, { n: "Austria", f: "AT", code: "+43" }, { n: "Azerbaijan", f: "AZ", code: "+994" },
  { n: "Bahamas", f: "BS", code: "+1-242" }, { n: "Bahrain", f: "BH", code: "+973" }, { n: "Bangladesh", f: "BD", code: "+880" },
  { n: "Barbados", f: "BB", code: "+1-246" }, { n: "Belarus", f: "BY", code: "+375" }, { n: "Belgium", f: "BE", code: "+32" },
  { n: "Belize", f: "BZ", code: "+501" }, { n: "Benin", f: "BJ", code: "+229" }, { n: "Bermuda", f: "BM", code: "+1-441" },
  { n: "Bhutan", f: "BT", code: "+975" }, { n: "Bolivia", f: "BO", code: "+591" }, { n: "Bosnia and Herzegovina", f: "BA", code: "+387" },
  { n: "Botswana", f: "BW", code: "+267" }, { n: "Brazil", f: "BR", code: "+55" }, { n: "British Indian Ocean Territory", f: "IO", code: "+246" },
  { n: "British Virgin Islands", f: "VG", code: "+1-284" }, { n: "Brunei", f: "BN", code: "+673" }, { n: "Bulgaria", f: "BG", code: "+359" },
  { n: "Burkina Faso", f: "BF", code: "+226" }, { n: "Burundi", f: "BI", code: "+257" }, { n: "Cambodia", f: "KH", code: "+855" },
  { n: "Cameroon", f: "CM", code: "+237" }, { n: "Canada", f: "CA", code: "+1" }, { n: "Cape Verde", f: "CV", code: "+238" },
  { n: "Cayman Islands", f: "KY", code: "+1-345" }, { n: "Central African Republic", f: "CF", code: "+236" }, { n: "Chad", f: "TD", code: "+235" },
  { n: "Chile", f: "CL", code: "+56" }, { n: "China", f: "CN", code: "+86" }, { n: "Christmas Island", f: "CX", code: "+61" },
  { n: "Cocos Islands", f: "CC", code: "+61" }, { n: "Colombia", f: "CO", code: "+57" }, { n: "Comoros", f: "KM", code: "+269" },
  { n: "Cook Islands", f: "CK", code: "+682" }, { n: "Costa Rica", f: "CR", code: "+506" }, { n: "Croatia", f: "HR", code: "+385" },
  { n: "Cuba", f: "CU", code: "+53" }, { n: "Curacao", f: "CW", code: "+599" }, { n: "Cyprus", f: "CY", code: "+357" },
  { n: "Czech Republic", f: "CZ", code: "+420" }, { n: "Democratic Republic of the Congo", f: "CD", code: "+243" }, { n: "Denmark", f: "DK", code: "+45" },
  { n: "Djibouti", f: "DJ", code: "+253" }, { n: "Dominica", f: "DM", code: "+1-767" }, { n: "Dominican Republic", f: "DO", code: "+1-809" },
  { n: "East Timor", f: "TL", code: "+670" }, { n: "Ecuador", f: "EC", code: "+593" }, { n: "Egypt", f: "EG", code: "+20" },
  { n: "El Salvador", f: "SV", code: "+503" }, { n: "Equatorial Guinea", f: "GQ", code: "+240" }, { n: "Eritrea", f: "ER", code: "+291" },
  { n: "Estonia", f: "EE", code: "+372" }, { n: "Ethiopia", f: "ET", code: "+251" }, { n: "Falkland Islands", f: "FK", code: "+500" },
  { n: "Faroe Islands", f: "FO", code: "+298" }, { n: "Fiji", f: "FJ", code: "+679" }, { n: "Finland", f: "FI", code: "+358" },
  { n: "France", f: "FR", code: "+33" }, { n: "French Polynesia", f: "PF", code: "+689" }, { n: "Gabon", f: "GA", code: "+241" },
  { n: "Gambia", f: "GM", code: "+220" }, { n: "Georgia", f: "GE", code: "+995" }, { n: "Germany", f: "DE", code: "+49" },
  { n: "Ghana", f: "GH", code: "+233" }, { n: "Gibraltar", f: "GI", code: "+350" }, { n: "Greece", f: "GR", code: "+30" },
  { n: "Greenland", f: "GL", code: "+299" }, { n: "Grenada", f: "GD", code: "+1-473" }, { n: "Guam", f: "GU", code: "+1-671" },
  { n: "Guatemala", f: "GT", code: "+502" }, { n: "Guernsey", f: "GG", code: "+44-1481" }, { n: "Guinea", f: "GN", code: "+224" },
  { n: "Guinea-Bissau", f: "GW", code: "+245" }, { n: "Guyana", f: "GY", code: "+592" }, { n: "Haiti", f: "HT", code: "+509" },
  { n: "Honduras", f: "HN", code: "+504" }, { n: "Hong Kong", f: "HK", code: "+852" }, { n: "Hungary", f: "HU", code: "+36" },
  { n: "Iceland", f: "IS", code: "+354" }, { n: "India", f: "IN", code: "+91" }, { n: "Indonesia", f: "ID", code: "+62" },
  { n: "Iran", f: "IR", code: "+98" }, { n: "Iraq", f: "IQ", code: "+964" }, { n: "Ireland", f: "IE", code: "+353" },
  { n: "Isle of Man", f: "IM", code: "+44-1624" }, { n: "Israel", f: "IL", code: "+972" }, { n: "Italy", f: "IT", code: "+39" },
  { n: "Ivory Coast", f: "CI", code: "+225" }, { n: "Jamaica", f: "JM", code: "+1-876" }, { n: "Japan", f: "JP", code: "+81" },
  { n: "Jersey", f: "JE", code: "+44-1534" }, { n: "Jordan", f: "JO", code: "+962" }, { n: "Kazakhstan", f: "KZ", code: "+7" },
  { n: "Kenya", f: "KE", code: "+254" }, { n: "Kiribati", f: "KI", code: "+686" }, { n: "Kosovo", f: "XK", code: "+383" },
  { n: "Kuwait", f: "KW", code: "+965" }, { n: "Kyrgyzstan", f: "KG", code: "+996" }, { n: "Laos", f: "LA", code: "+856" },
  { n: "Latvia", f: "LV", code: "+371" }, { n: "Lebanon", f: "LB", code: "+961" }, { n: "Lesotho", f: "LS", code: "+266" },
  { n: "Liberia", f: "LR", code: "+231" }, { n: "Libya", f: "LY", code: "+218" }, { n: "Liechtenstein", f: "LI", code: "+423" },
  { n: "Lithuania", f: "LT", code: "+370" }, { n: "Luxembourg", f: "LU", code: "+352" }, { n: "Macau", f: "MO", code: "+853" },
  { n: "Macedonia", f: "MK", code: "+389" }, { n: "Madagascar", f: "MG", code: "+261" }, { n: "Malawi", f: "MW", code: "+265" },
  { n: "Malaysia", f: "MY", code: "+60" }, { n: "Maldives", f: "MV", code: "+960" }, { n: "Mali", f: "ML", code: "+223" },
  { n: "Malta", f: "MT", code: "+356" }, { n: "Marshall Islands", f: "MH", code: "+692" }, { n: "Mauritania", f: "MR", code: "+222" },
  { n: "Mauritius", f: "MU", code: "+230" }, { n: "Mayotte", f: "YT", code: "+262" }, { n: "Mexico", f: "MX", code: "+52" },
  { n: "Micronesia", f: "FM", code: "+691" }, { n: "Moldova", f: "MD", code: "+373" }, { n: "Monaco", f: "MC", code: "+377" },
  { n: "Mongolia", f: "MN", code: "+976" }, { n: "Montenegro", f: "ME", code: "+382" }, { n: "Montserrat", f: "MS", code: "+1-664" },
  { n: "Morocco", f: "MA", code: "+212" }, { n: "Mozambique", f: "MZ", code: "+258" }, { n: "Myanmar", f: "MM", code: "+95" },
  { n: "Namibia", f: "NA", code: "+264" }, { n: "Nauru", f: "NR", code: "+674" }, { n: "Nepal", f: "NP", code: "+977" },
  { n: "Netherlands", f: "NL", code: "+31" }, { n: "Netherlands Antilles", f: "AN", code: "+599" }, { n: "New Caledonia", f: "NC", code: "+687" },
  { n: "New Zealand", f: "NZ", code: "+64" }, { n: "Nicaragua", f: "NI", code: "+505" }, { n: "Niger", f: "NE", code: "+227" },
  { n: "Nigeria", f: "NG", code: "+234" }, { n: "Niue", f: "NU", code: "+683" }, { n: "North Korea", f: "KP", code: "+850" },
  { n: "Northern Mariana Islands", f: "MP", code: "+1-670" }, { n: "Norway", f: "NO", code: "+47" }, { n: "Oman", f: "OM", code: "+968" },
  { n: "Pakistan", f: "PK", code: "+92" }, { n: "Palau", f: "PW", code: "+680" }, { n: "Palestine", f: "PS", code: "+970" },
  { n: "Panama", f: "PA", code: "+507" }, { n: "Papua New Guinea", f: "PG", code: "+675" }, { n: "Paraguay", f: "PY", code: "+595" },
  { n: "Peru", f: "PE", code: "+51" }, { n: "Philippines", f: "PH", code: "+63" }, { n: "Pitcairn", f: "PN", code: "+64" },
  { n: "Poland", f: "PL", code: "+48" }, { n: "Portugal", f: "PT", code: "+351" }, { n: "Puerto Rico", f: "PR", code: "+1-787" },
  { n: "Qatar", f: "QA", code: "+974" }, { n: "Republic of the Congo", f: "CG", code: "+242" }, { n: "Reunion", f: "RE", code: "+262" },
  { n: "Romania", f: "RO", code: "+40" }, { n: "Russia", f: "RU", code: "+7" }, { n: "Rwanda", f: "RW", code: "+250" },
  { n: "Saint Barthelemy", f: "BL", code: "+590" }, { n: "Saint Helena", f: "SH", code: "+290" }, { n: "Saint Kitts and Nevis", f: "KN", code: "+1-869" },
  { n: "Saint Lucia", f: "LC", code: "+1-758" }, { n: "Saint Martin", f: "MF", code: "+590" }, { n: "Saint Pierre and Miquelon", f: "PM", code: "+508" },
  { n: "Saint Vincent and the Grenadines", f: "VC", code: "+1-784" }, { n: "Samoa", f: "WS", code: "+685" }, { n: "San Marino", f: "SM", code: "+378" },
  { n: "Sao Tome and Principe", f: "ST", code: "+239" }, { n: "Saudi Arabia", f: "SA", code: "+966" }, { n: "Senegal", f: "SN", code: "+221" },
  { n: "Serbia", f: "RS", code: "+381" }, { n: "Seychelles", f: "SC", code: "+248" }, { n: "Sierra Leone", f: "SL", code: "+232" },
  { n: "Singapore", f: "SG", code: "+65" }, { n: "Sint Maarten", f: "SX", code: "+1-721" }, { n: "Slovakia", f: "SK", code: "+421" },
  { n: "Slovenia", f: "SI", code: "+386" }, { n: "Solomon Islands", f: "SB", code: "+677" }, { n: "Somalia", f: "SO", code: "+252" },
  { n: "South Africa", f: "ZA", code: "+27" }, { n: "South Korea", f: "KR", code: "+82" }, { n: "South Sudan", f: "SS", code: "+211" },
  { n: "Spain", f: "ES", code: "+34" }, { n: "Sri Lanka", f: "LK", code: "+94" }, { n: "Sudan", f: "SD", code: "+249" },
  { n: "Suriname", f: "SR", code: "+597" }, { n: "Svalbard and Jan Mayen", f: "SJ", code: "+47" }, { n: "Swaziland", f: "SZ", code: "+268" },
  { n: "Sweden", f: "SE", code: "+46" }, { n: "Switzerland", f: "CH", code: "+41" }, { n: "Syria", f: "SY", code: "+963" },
  { n: "Taiwan", f: "TW", code: "+886" }, { n: "Tajikistan", f: "TJ", code: "+992" }, { n: "Tanzania", f: "TZ", code: "+255" },
  { n: "Thailand", f: "TH", code: "+66" }, { n: "Togo", f: "TG", code: "+228" }, { n: "Tokelau", f: "TK", code: "+690" },
  { n: "Tonga", f: "TO", code: "+676" }, { n: "Trinidad and Tobago", f: "TT", code: "+1-868" }, { n: "Tunisia", f: "TN", code: "+216" },
  { n: "Turkey", f: "TR", code: "+90" }, { n: "Turkmenistan", f: "TM", code: "+993" }, { n: "Turks and Caicos Islands", f: "TC", code: "+1-649" },
  { n: "Tuvalu", f: "TV", code: "+688" }, { n: "U.S. Virgin Islands", f: "VI", code: "+1-340" }, { n: "Uganda", f: "UG", code: "+256" },
  { n: "Ukraine", f: "UA", code: "+380" }, { n: "United Arab Emirates", f: "AE", code: "+971" }, { n: "United Kingdom", f: "GB", code: "+44" },
  { n: "United States", f: "US", code: "+1" }, { n: "Uruguay", f: "UY", code: "+598" }, { n: "Uzbekistan", f: "UZ", code: "+998" },
  { n: "Vanuatu", f: "VU", code: "+678" }, { n: "Vatican", f: "VA", code: "+379" }, { n: "Venezuela", f: "VE", code: "+58" },
  { n: "Vietnam", f: "VN", code: "+84" }, { n: "Wallis and Futuna", f: "WF", code: "+681" }, { n: "Western Sahara", f: "EH", code: "+212" },
  { n: "Yemen", f: "YE", code: "+967" }, { n: "Zambia", f: "ZM", code: "+260" }, { n: "Zimbabwe", f: "ZW", code: "+263" }
];

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Determine initial mode from URL
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const [mode, setMode] = useState(initialMode);
  
  // Visibility toggles for passwords
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Custom Country Dropdown states
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const countryDropdownRef = useRef(null);
  
  // Ref for the phone input field to trigger focus
  const phoneInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  // Custom Popup State 
  const [popup, setPopup] = useState({
    isOpen: false,
    title: '',
    message: '',
    isSuccess: false
  });

  // Consolidated form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    country: '', 
    countryCode: '', 
    phone: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode === 'signup' || urlMode === 'login') {
      setMode(urlMode);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target)) {
        setIsCountryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCountrySelect = (countryName, countryIso, dialCode) => {
    setFormData({
      ...formData,
      country: countryName,
      countryCode: countryIso,
      phone: `${dialCode} ` 
    });
    setIsCountryOpen(false);
    setCountrySearch('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mode === 'signup') {
      if (formData.password !== formData.confirmPassword) {
        setPopup({ isOpen: true, title: "Password Mismatch", message: "Passwords do not match!", isSuccess: false });
        return;
      }
      if (!formData.country) {
        setPopup({ isOpen: true, title: "Missing Info", message: "Please select a country/region", isSuccess: false });
        return;
      }
    }

    setIsLoading(true);

    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      // Dynamically use API_URL
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json', 
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setPopup({ isOpen: true, title: "Error", message: data.message || "An error occurred", isSuccess: false });
        return; 
      }

      // SUCCESS HANDLING 
      if (mode === 'signup') {
        setPopup({ isOpen: true, title: "Welcome!", message: "Signup successful! You can now log in.", isSuccess: true });
        setMode('login');
        setFormData(prev => ({
          ...prev,
          password: '',
          confirmPassword: ''
        }));
      } else {
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        navigate('/'); 
      }

    } catch (error) {
      console.error("Authentication Error:", error);
      setPopup({ isOpen: true, title: "Connection Failed", message: "Failed to connect to the server. Please ensure the backend is running.", isSuccess: false });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter countries based on search input
  const filteredCountries = COUNTRIES.filter(c => 
    c.n.toLowerCase().includes(countrySearch.toLowerCase()) || 
    c.code.includes(countrySearch)
  );

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      
      {/* POPUP MODAL */}
      <AnimatePresence>
        {popup.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
            onClick={() => setPopup({ ...popup, isOpen: false })}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
              className="w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-center relative"
            >
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5 ${popup.isSuccess ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                 {popup.isSuccess ? <CheckCircle className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white mb-2">{popup.title}</h3>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">{popup.message}</p>
              <button
                onClick={() => setPopup({ ...popup, isOpen: false })}
                className={`w-full py-3.5 rounded-xl font-bold text-white transition-all active:scale-95 ${popup.isSuccess ? 'bg-green-600 hover:bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)]'}`}
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[520px] bg-[#121212] border border-white/10 rounded-[2rem] px-6 sm:px-12 py-10 shadow-2xl relative overflow-visible"
      >
        {/* Background glow effect */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-600/10 rounded-full blur-[80px] pointer-events-none"></div>

        <button 
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 text-gray-500 hover:text-white transition-colors z-20"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Animated Toggle Switch */}
        <div className="mt-8 mb-10 flex bg-black/50 p-1 rounded-full border border-white/5 relative z-10">
          <motion.div
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gray-800 rounded-full shadow-md z-0"
            animate={{ left: mode === 'login' ? '4px' : 'calc(50%)' }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-3 text-sm font-bold rounded-full relative z-10 transition-colors duration-300 ${
              mode === 'login' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-3 text-sm font-bold rounded-full relative z-10 transition-colors duration-300 ${
              mode === 'signup' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Sign up
          </button>
        </div>

        {/* Header Texts */}
        <div className="text-center mb-10 relative z-10">
          <AnimatePresence mode="wait">
            <motion.h2 
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="text-2xl sm:text-3xl font-black text-white mb-2"
            >
              {mode === 'login' ? 'Welcome back!' : 'Create new account'}
            </motion.h2>
          </AnimatePresence>
          <p className="text-gray-400 text-sm">
            {mode === 'login' 
              ? 'Sign in to sync your playlists and favorite movies' 
              : 'Enter the information below to get started'}
          </p>
        </div>

        {/* Form with Floating Labels */}
        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          
          <AnimatePresence>
            {mode === 'signup' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6 overflow-visible" 
              >
                {/* Name Grid */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="relative">
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder=" "
                      required={mode === 'signup'}
                      className="peer w-full bg-transparent border border-white/20 text-white rounded-xl py-4 px-5 focus:outline-none focus:border-red-500 transition-all text-sm placeholder-transparent"
                    />
                    <label 
                      htmlFor="lastName"
                      className="absolute left-4 -top-2.5 bg-[#121212] px-1 text-[11px] font-bold text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:bg-transparent peer-focus:-top-2.5 peer-focus:text-[11px] peer-focus:bg-[#121212] peer-focus:text-red-500 cursor-text pointer-events-none z-10 autofill-label"
                    >
                      Lastname
                    </label>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder=" "
                      required={mode === 'signup'}
                      className="peer w-full bg-transparent border border-white/20 text-white rounded-xl py-4 px-5 focus:outline-none focus:border-red-500 transition-all text-sm placeholder-transparent"
                    />
                    <label 
                      htmlFor="firstName"
                      className="absolute left-4 -top-2.5 bg-[#121212] px-1 text-[11px] font-bold text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:bg-transparent peer-focus:-top-2.5 peer-focus:text-[11px] peer-focus:bg-[#121212] peer-focus:text-red-500 cursor-text pointer-events-none z-10 autofill-label"
                    >
                      Firstname
                    </label>
                  </div>
                </div>

                {/* CUSTOM COUNTRY DROPDOWN WITH FLOATING LABEL */}
                <div className="relative" ref={countryDropdownRef}>
                  <label className={`absolute left-4 px-1 font-bold transition-all z-10 pointer-events-none ${
                    formData.country || isCountryOpen 
                      ? '-top-2.5 text-[11px] bg-[#121212] text-gray-500' 
                      : 'top-4 text-sm bg-transparent text-gray-500'
                  } ${isCountryOpen ? 'text-red-500' : ''}`}>
                    Country/Region
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => setIsCountryOpen(!isCountryOpen)}
                    className={`w-full flex items-center justify-between border rounded-xl py-4 px-5 transition-all text-sm focus:outline-none focus:border-red-500 ${
                      isCountryOpen ? 'bg-transparent border-red-500' : 'bg-transparent border-white/20 hover:border-white/40'
                    }`}
                  >
                    {formData.country ? (
                      <span className="text-white flex items-center gap-3">
                        <img 
                          src={`https://flagcdn.com/w40/${formData.countryCode.toLowerCase()}.png`} 
                          alt={formData.country} 
                          className="w-6 h-4 object-cover rounded-sm shadow-sm"
                        />
                        {formData.country}
                      </span>
                    ) : (
                      <span className="text-transparent">Placeholder</span> 
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isCountryOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isCountryOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                      >
                        <div className="p-2 border-b border-white/5 relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input 
                            type="text" 
                            placeholder="Search country or code..."
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.preventDefault(); 
                            }}
                            className="w-full bg-transparent text-white text-sm py-2 pl-8 pr-2 focus:outline-none placeholder:text-gray-600"
                          />
                        </div>
                        <div className="max-h-52 overflow-y-auto custom-scrollbar p-1">
                          {filteredCountries.length > 0 ? (
                            filteredCountries.map((c) => (
                              <button
                                anchor={c.f}
                                key={c.f}
                                type="button"
                                onClick={() => handleCountrySelect(c.n, c.f, c.code)}
                                className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                              >
                                <div className="flex items-center gap-3 truncate">
                                  <img 
                                    src={`https://flagcdn.com/w40/${c.f.toLowerCase()}.png`} 
                                    alt={c.n} 
                                    className="w-6 h-4 object-cover rounded-sm shadow-[0_0_2px_rgba(255,255,255,0.2)] shrink-0"
                                  />
                                  <span className="truncate">{c.n}</span>
                                </div>
                                <span className="text-gray-600 text-[10px] font-mono group-hover:text-gray-400 shrink-0 ml-2">
                                  {c.code}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-4 text-sm text-center text-gray-500">No countries found</div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Phone Number with Floating Label */}
                <div className="relative">
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder=" "
                    required={mode === 'signup'}
                    className="peer w-full bg-transparent border border-white/20 text-white rounded-xl py-4 px-5 focus:outline-none focus:border-red-500 transition-all text-sm placeholder-transparent"
                  />
                  <label 
                    htmlFor="phone"
                    className="absolute left-4 -top-2.5 bg-[#121212] px-1 text-[11px] font-bold text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:bg-transparent peer-focus:-top-2.5 peer-focus:text-[11px] peer-focus:bg-[#121212] peer-focus:text-red-500 cursor-text pointer-events-none z-10 autofill-label"
                  >
                    Phone number
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* EMAIL WITH FLOATING LABEL */}
          <div className="relative">
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder=" "
              required
              className="peer w-full bg-transparent border border-white/20 text-white rounded-xl py-4 px-5 focus:outline-none focus:border-red-500 transition-all text-sm placeholder-transparent"
            />
            <label 
              htmlFor="email"
              className="absolute left-4 -top-2.5 bg-[#121212] px-1 text-[11px] font-bold text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:bg-transparent peer-focus:-top-2.5 peer-focus:text-[11px] peer-focus:bg-[#121212] peer-focus:text-red-500 cursor-text pointer-events-none z-10 autofill-label"
            >
              Email
            </label>
          </div>

          {/* PASSWORD WITH FLOATING LABEL */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder=" "
              required
              className="peer w-full bg-transparent border border-white/20 text-white rounded-xl py-4 pl-5 pr-12 focus:outline-none focus:border-red-500 transition-all text-sm placeholder-transparent"
            />
            <label 
              htmlFor="password"
              className="absolute left-4 -top-2.5 bg-[#121212] px-1 text-[11px] font-bold text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:bg-transparent peer-focus:-top-2.5 peer-focus:text-[11px] peer-focus:bg-[#121212] peer-focus:text-red-500 cursor-text pointer-events-none z-10 autofill-label"
            >
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors z-20"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* CONFIRM PASSWORD WITH FLOATING LABEL */}
          <AnimatePresence>
            {mode === 'signup' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative overflow-visible"
              >
                <div className="relative mt-2">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder=" "
                    required={mode === 'signup'}
                    className="peer w-full bg-transparent border border-white/20 text-white rounded-xl py-4 pl-5 pr-12 focus:outline-none focus:border-red-500 transition-all text-sm placeholder-transparent"
                  />
                  <label 
                    htmlFor="confirmPassword"
                    className="absolute left-4 -top-2.5 bg-[#121212] px-1 text-[11px] font-bold text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:bg-transparent peer-focus:-top-2.5 peer-focus:text-[11px] peer-focus:bg-[#121212] peer-focus:text-red-500 cursor-text pointer-events-none z-10 autofill-label"
                  >
                    Confirm password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors z-20"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit"
            disabled={isLoading}
            className={`w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl transition-all mt-8 flex justify-center items-center gap-2 ${
              isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(220,38,38,0.3)]'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              mode === 'login' ? 'Login' : 'Sign up'
            )}
          </button>
        </form>
      </motion.div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 10px; }
        
        /* FIX BROWSER AUTOFILL FOR DARK MODE */
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 40px #121212 inset !important;
            -webkit-text-fill-color: white !important;
            caret-color: white !important;
            border-radius: 0.75rem; 
        }

        /* FIX FLOATING LABEL OVERLAP ON AUTOFILL */
        input:-webkit-autofill ~ .autofill-label {
            top: -0.625rem !important; 
            font-size: 11px !important; 
            background-color: #121212 !important; 
        }
      `}</style>
    </div>
  );
}