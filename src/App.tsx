import React, { useState, useEffect } from "react";
import { 
  Home as HomeIcon,
  Search,
  Calendar,
  Clock,
  History,
  User as UserIcon,
  MessageSquare,
  ShieldAlert,
  Menu,
  X,
  LogOut,
  UserCheck,
  UserPlus,
  Play,
  Database,
  Cpu,
  Star,
  DollarSign,
  ChevronRight,
  Sparkles,
  Layers,
  MapPin,
  Lock,
  ArrowRight,
  CheckCircle,
  FileText,
  Bookmark
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Modular Imports
import { User, Turf, Booking, Payment, Review, ChatMessage, ApiLog, ToastMessage } from "./types";
import { 
  DEFAULT_USERS, 
  DEFAULT_TURFS, 
  DEFAULT_BOOKINGS, 
  DEFAULT_PAYMENTS, 
  DEFAULT_REVIEWS,
  calculateVectorSimilarity
} from "./data";

import Toast from "./components/Toast";
import ApiLogger from "./components/ApiLogger";
import Chatbot from "./components/Chatbot";
import AdminPanel from "./components/AdminPanel";
import { RagSandbox } from "./components/RagSandbox";
import AiSportsHub from "./components/AiSportsHub";
import TamilNaduMap from "./components/TamilNaduMap";

// CSS Class Presets for Glassmorphism & Gradient themes
const GLASS_CARD = "bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl";
const GRADIENT_BTN = "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/10 active:scale-95 cursor-pointer";

export default function App() {
  // Navigation Routing States
  const [activeTab, setActiveTab] = useState<"home" | "map" | "turfs" | "booking" | "booking-history" | "profile" | "chatbot" | "dashboard" | "database-docs" | "rag-sandbox" | "ai-sports-hub">("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Loading indicator states
  const [isLoading, setIsLoading] = useState(false);

  // Shared state for Chatbot -> Map navigation
  const [mapFocusedDistrictId, setMapFocusedDistrictId] = useState<number | null>(null);
  const [mapFocusedPlaceId, setMapFocusedPlaceId] = useState<number | null>(null);
  const [mapActiveSportFilter, setMapActiveSportFilter] = useState<string | null>(null);
  const [mapSearchQuery, setMapSearchQuery] = useState<string | null>(null);

  // Shared Global States (loaded from LocalStorage or initialized from defaults)
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem("sports_users");
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });
  const [turfs, setTurfs] = useState<Turf[]>(() => {
    const saved = localStorage.getItem("sports_turfs");
    return saved ? JSON.parse(saved) : DEFAULT_TURFS;
  });
  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem("sports_bookings");
    return saved ? JSON.parse(saved) : DEFAULT_BOOKINGS;
  });
  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem("sports_payments");
    return saved ? JSON.parse(saved) : DEFAULT_PAYMENTS;
  });
  const [reviews, setReviews] = useState<Review[]>(() => {
    const saved = localStorage.getItem("sports_reviews");
    return saved ? JSON.parse(saved) : DEFAULT_REVIEWS;
  });

  // Authentication states
  const [userToken, setUserToken] = useState<string | null>(() => localStorage.getItem("auth_token"));
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("auth_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Interactive Form Inputs
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<"ROLE_USER" | "ROLE_ADMIN">("ROLE_USER");

  // Selection states
  const [selectedTurfId, setSelectedTurfId] = useState<number>(1);
  const [bookingDate, setBookingDate] = useState("2026-07-05");
  const [bookingHour, setBookingHour] = useState("18");
  const [paymentMethod, setPaymentMethod] = useState<"STRIPE" | "UPI" | "CREDIT_CARD">("STRIPE");

  // Filter Catalog States
  const [searchQuery, setSearchQuery] = useState("");
  const [sportFilter, setSportFilter] = useState<string>("ALL");
  const [maxPrice, setMaxPrice] = useState<number>(180);
  const [semanticSearchActive, setSemanticSearchActive] = useState(false);

  // Logging & Toast system states
  const [apiLogs, setApiLogs] = useState<ApiLog[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Local Storage synchronizer
  useEffect(() => {
    localStorage.setItem("sports_users", JSON.stringify(users));
  }, [users]);
  useEffect(() => {
    localStorage.setItem("sports_turfs", JSON.stringify(turfs));
  }, [turfs]);
  useEffect(() => {
    localStorage.setItem("sports_bookings", JSON.stringify(bookings));
  }, [bookings]);
  useEffect(() => {
    localStorage.setItem("sports_payments", JSON.stringify(payments));
  }, [payments]);
  useEffect(() => {
    localStorage.setItem("sports_reviews", JSON.stringify(reviews));
  }, [reviews]);

  // Toast helper
  const addToast = (type: "success" | "error" | "info", message: string) => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}`,
      type,
      message
    };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => {
      removeToast(newToast.id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // REST API Logger Simulator helper
  const addApiLog = (
    method: "GET" | "POST" | "DELETE" | "PUT",
    url: string,
    reqBody?: string,
    respBody?: string,
    status: number = 200
  ) => {
    const newLog: ApiLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      method,
      url,
      requestBody: reqBody,
      responseBody: respBody,
      status
    };
    setApiLogs(prev => [newLog, ...prev]);
  };

  // Simulate Page Transitions with a loading screen
  const handleTabChange = (tab: typeof activeTab) => {
    setIsLoading(true);
    setMobileMenuOpen(false);
    setTimeout(() => {
      setActiveTab(tab);
      setIsLoading(false);
    }, 400);
  };

  // Handle Authentication Logins
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      addToast("error", "Please provide email and password credentials");
      return;
    }

    addApiLog("POST", "/api/v1/auth/login", JSON.stringify({ email: loginEmail }));

    // Find user in local state
    const matched = users.find(u => u.email.toLowerCase() === loginEmail.toLowerCase());
    if (matched) {
      setTimeout(() => {
        const simulatedToken = "eyJhbGciOiJIUzI1NiJ9.eyNzdWIiOiJ" + btoa(matched.email) + "InX0.signature";
        setUserToken(simulatedToken);
        setCurrentUser(matched);
        localStorage.setItem("auth_token", simulatedToken);
        localStorage.setItem("auth_user", JSON.stringify(matched));

        addToast("success", `Welcome back, ${matched.fullName}!`);
        addApiLog(
          "POST", 
          "/api/v1/auth/login", 
          undefined, 
          JSON.stringify({ status: "200 OK", token: `Bearer ${simulatedToken.substring(0,15)}...`, role: matched.role })
        );
        handleTabChange("dashboard");
      }, 500);
    } else {
      setTimeout(() => {
        addToast("error", "No user matches these credentials. Register a new user below!");
        addApiLog("POST", "/api/v1/auth/login", undefined, JSON.stringify({ error: "Unauthorized", status: 401 }), 401);
      }, 500);
    }
  };

  // Pre-fill log shortcuts for quick testing
  const loginAsShortcut = (email: string) => {
    setLoginEmail(email);
    setLoginPassword("password123");
    addToast("info", `Shortcut selected: ${email}`);
  };

  // Handle Logouts
  const handleLogout = () => {
    addApiLog("POST", "/api/v1/auth/logout", undefined, JSON.stringify({ status: "SecurityContext cleared" }));
    setUserToken(null);
    setCurrentUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    addToast("info", "Logged out successfully.");
    handleTabChange("home");
  };

  // Handle Registrations
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName || !regEmail || !regPassword) {
      addToast("error", "All fields are required for registration");
      return;
    }

    // Check if user exists
    if (users.some(u => u.email.toLowerCase() === regEmail.toLowerCase())) {
      addToast("error", "Email is already registered. Please login!");
      return;
    }

    const newUser: User = {
      id: users.length + 1,
      fullName: regFullName,
      email: regEmail,
      role: regRole,
      avatar: `https://images.unsplash.com/photo-${regFullName.includes("Sarah") ? "1494790108377-be9c29b29330" : "1534528741775-53994a69daeb"}?w=150`,
      loyaltyPoints: 100, // starting gift
      joinedAt: new Date().toISOString().split('T')[0]
    };

    setUsers(prev => [...prev, newUser]);
    setIsRegisterMode(false);
    setLoginEmail(regEmail);
    addToast("success", "Registration successful! You can now log in.");
    addApiLog(
      "POST", 
      "/api/v1/auth/register", 
      JSON.stringify({ fullName: regFullName, email: regEmail, role: regRole }),
      JSON.stringify({ success: true, userId: newUser.id })
    );
  };

  // Handle Bookings Submission
  const handleConfirmBooking = () => {
    if (!currentUser) {
      addToast("error", "Full authentication required. Please login first!");
      handleTabChange("profile");
      return;
    }

    const matchedTurf = turfs.find(t => t.id === selectedTurfId);
    if (!matchedTurf) return;

    // Check collision in local state
    const targetStartTime = `${bookingDate}T${bookingHour.padStart(2, "0")}:00:00`;
    const collision = bookings.some(b => 
      b.turfId === selectedTurfId && 
      b.startTime === targetStartTime && 
      b.status === "CONFIRMED"
    );

    if (collision) {
      addToast("error", "This slot is already booked. Please choose a different hour!");
      addApiLog("POST", "/api/v1/bookings/reserve", JSON.stringify({ turfId: selectedTurfId, time: targetStartTime }), "Collision detected", 409);
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const totalPrice = matchedTurf.pricePerHour;
      const newBookingId = bookings.length + 1;

      // 1. Create Booking state
      const newBooking: Booking = {
        id: newBookingId,
        turfId: selectedTurfId,
        userId: currentUser.id,
        startTime: targetStartTime,
        endTime: `${bookingDate}T${(parseInt(bookingHour) + 1).toString().padStart(2, "0")}:00:00`,
        totalPrice,
        status: "CONFIRMED",
        createdAt: new Date().toISOString()
      };

      // 2. Create Payment state
      const newPayment: Payment = {
        id: payments.length + 1,
        bookingId: newBookingId,
        userId: currentUser.id,
        amount: totalPrice,
        paymentMethod,
        transactionId: paymentMethod === "STRIPE" ? `ch_stripe_${Math.random().toString(36).substring(2, 12)}` : `upi_pay_${Math.random().toString().substring(2, 14)}`,
        status: "COMPLETED",
        createdAt: new Date().toISOString()
      };

      // Update local storage arrays
      setBookings(prev => [newBooking, ...prev]);
      setPayments(prev => [newPayment, ...prev]);

      // Give loyalty points
      setUsers(prev => prev.map(u => {
        if (u.id === currentUser.id) {
          return { ...u, loyaltyPoints: u.loyaltyPoints + 50 };
        }
        return u;
      }));

      // Update logged-in context too
      setCurrentUser(prev => prev ? { ...prev, loyaltyPoints: prev.loyaltyPoints + 50 } : null);

      addToast("success", `Booking confirmed for ${matchedTurf.name}! +50 Loyalty points earned.`);
      addApiLog(
        "POST", 
        "/api/v1/bookings/reserve", 
        JSON.stringify({ turfId: selectedTurfId, startTime: targetStartTime, payment: paymentMethod }),
        JSON.stringify({ bookingId: newBookingId, paymentStatus: "COMPLETED", transaction: newPayment.transactionId })
      );

      setIsLoading(false);
      handleTabChange("booking-history");
    }, 1200);
  };

  // Handle Booking Cancellation (User requesting Refund)
  const handleCancelBooking = (bookingId: number) => {
    addApiLog("DELETE", `/api/v1/bookings/cancel/${bookingId}`);

    // Update status in state
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: "CANCELLED" } : b));
    setPayments(prev => prev.map(p => p.bookingId === bookingId ? { ...p, status: "REFUNDED" } : p));
    
    addToast("info", "Reservation cancelled. Refund has been initiated back to your gateway.");
  };

  // Admins CRUD triggers
  const handleAddTurfByAdmin = (newTurfData: Omit<Turf, "id" | "rating">) => {
    const newId = turfs.length + 1;
    const item: Turf = {
      ...newTurfData,
      id: newId,
      rating: 5.0
    };
    setTurfs(prev => [...prev, item]);
    addToast("success", `Admin added new arena: ${newTurfData.name}`);
    addApiLog(
      "POST", 
      "/api/v1/admin/turfs/create", 
      JSON.stringify(newTurfData), 
      JSON.stringify({ status: "PERSISTED", indexId: newId })
    );
  };

  const handleDeleteTurfByAdmin = (id: number) => {
    setTurfs(prev => prev.filter(t => t.id !== id));
    addToast("info", "Arena deleted from active listings.");
    addApiLog("DELETE", `/api/v1/admin/turfs/delete/${id}`, undefined, JSON.stringify({ success: true }));
  };

  const handleUpdateBookingStatusByAdmin = (id: number, status: "CONFIRMED" | "CANCELLED") => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    if (status === "CANCELLED") {
      setPayments(prev => prev.map(p => p.bookingId === id ? { ...p, status: "REFUNDED" } : p));
    }
    addToast("success", `Booking status updated to ${status}`);
    addApiLog("PUT", `/api/v1/admin/bookings/status/${id}?status=${status}`);
  };

  // Filter & Similarity Search computations
  const getFilteredTurfs = () => {
    let list = [...turfs];

    // Category filter
    if (sportFilter !== "ALL") {
      list = list.filter(t => t.sportsType === sportFilter);
    }

    // Price range slider
    list = list.filter(t => t.pricePerHour <= maxPrice);

    // Search query & Semantic matching
    if (searchQuery.trim() !== "") {
      if (semanticSearchActive) {
        // Sort and map dynamically by simulated Cosine Distance Similarity
        return list
          .map(t => ({
            ...t,
            similarity: calculateVectorSimilarity(searchQuery, t.name + " " + t.description + " " + t.sportsType)
          }))
          .sort((a, b) => b.similarity - a.similarity);
      } else {
        // Normal substring filter
        list = list.filter(t => 
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
    }

    return list.map(t => ({ ...t, similarity: undefined }));
  };

  const activeCatalog = getFilteredTurfs();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-white pb-12">
      {/* Dynamic Header Frame */}
      <header className="border-b border-slate-800 bg-slate-900/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div 
            onClick={() => handleTabChange("home")}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="bg-gradient-to-tr from-emerald-500 to-cyan-400 p-2 rounded-xl border border-emerald-500/20 group-hover:scale-105 transition-transform">
              <Layers className="h-5.5 w-5.5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-md font-extrabold tracking-tight text-white flex items-center gap-1.5">
                ArenaAI
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-bold">
                  v1.1
                </span>
              </h1>
              <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Spring AI Sports Platform</p>
            </div>
          </div>

          {/* Desktop Navigation Link Toggles */}
          <nav className="hidden lg:flex items-center gap-1">
            <button 
              onClick={() => handleTabChange("home")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "home" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-slate-400 hover:text-white"
              }`}
            >
              Home
            </button>
            <button 
              onClick={() => handleTabChange("map")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "map" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-slate-400 hover:text-white"
              }`}
            >
              State Map
            </button>
            <button 
              onClick={() => handleTabChange("turfs")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "turfs" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-slate-400 hover:text-white"
              }`}
            >
              Find Arenas
            </button>
            <button 
              onClick={() => handleTabChange("ai-sports-hub")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "ai-sports-hub" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-slate-400 hover:text-white"
              }`}
            >
              AI Recommendations
            </button>
            <button 
              onClick={() => handleTabChange("chatbot")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "chatbot" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-slate-400 hover:text-white"
              }`}
            >
              AI Assistant
            </button>
            <button 
              onClick={() => handleTabChange("rag-sandbox")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "rag-sandbox" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-slate-400 hover:text-white"
              }`}
            >
              RAG Vector Sandbox
            </button>
            {currentUser && (
              <>
                <button 
                  onClick={() => handleTabChange("dashboard")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "dashboard" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Dashboard
                </button>
                <button 
                  onClick={() => handleTabChange("booking-history")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "booking-history" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-slate-400 hover:text-white"
                  }`}
                >
                  My Bookings
                </button>
              </>
            )}
            <button 
              onClick={() => handleTabChange("profile")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "profile" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-slate-400 hover:text-white"
              }`}
            >
              {currentUser ? "My Profile" : "Login/Register"}
            </button>
          </nav>

          {/* User Auth Context Indicators */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="hidden sm:flex items-center gap-2 bg-slate-950 p-1.5 pr-3 rounded-xl border border-slate-800">
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.fullName}
                  className="h-7 w-7 rounded-lg object-cover border border-slate-700" 
                />
                <div className="text-left">
                  <span className="block text-[10px] font-bold text-white line-clamp-1">{currentUser.fullName}</span>
                  <span className="block text-[8px] font-mono text-emerald-400">Pts: {currentUser.loyaltyPoints}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-1 text-slate-400 hover:text-rose-400 transition-colors ml-1 cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => handleTabChange("profile")}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold border border-slate-800 text-white cursor-pointer"
              >
                <UserIcon className="h-4 w-4 text-emerald-400" />
                Sign In
              </button>
            )}

            {/* Mobile Hamburger menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white lg:hidden cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Responsive Navigation Drawers */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden border-b border-slate-800 bg-slate-900/90 overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-2 text-sm font-semibold">
              <button onClick={() => handleTabChange("home")} className="text-left py-2 border-b border-slate-800 text-slate-300">Home</button>
              <button onClick={() => handleTabChange("map")} className="text-left py-2 border-b border-slate-800 text-slate-300">State Map</button>
              <button onClick={() => handleTabChange("turfs")} className="text-left py-2 border-b border-slate-800 text-slate-300">Find Arenas</button>
              <button onClick={() => { handleTabChange("ai-sports-hub"); setMobileMenuOpen(false); }} className="text-left py-2 border-b border-slate-800 text-slate-300">AI Recommendations</button>
              <button onClick={() => handleTabChange("chatbot")} className="text-left py-2 border-b border-slate-800 text-slate-300">AI Assistant</button>
              <button onClick={() => handleTabChange("rag-sandbox")} className="text-left py-2 border-b border-slate-800 text-slate-300">RAG Vector Sandbox</button>
              {currentUser && (
                <>
                  <button onClick={() => handleTabChange("dashboard")} className="text-left py-2 border-b border-slate-800 text-slate-300">Dashboard</button>
                  <button onClick={() => handleTabChange("booking-history")} className="text-left py-2 border-b border-slate-800 text-slate-300">My Bookings</button>
                </>
              )}
              <button onClick={() => handleTabChange("profile")} className="text-left py-2 text-emerald-400">{currentUser ? "My Profile" : "Login/Register"}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Layout Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8">
        
        {/* Animated Loading Screen Overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-4"
            >
              <div className="relative">
                <div className="h-14 w-14 rounded-full border-4 border-slate-800 border-t-emerald-500 animate-spin"></div>
                <Layers className="h-6 w-6 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <p className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">
                Fulfilling REST transaction...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Route Switch Panel */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            
            {/* 1. HOME VIEW */}
            {activeTab === "home" && (
              <motion.div
                key="home-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-12"
              >
                {/* Hero Section */}
                <div className="relative rounded-3xl overflow-hidden border border-slate-800/80 bg-slate-900/25 p-8 md:p-14 text-left flex flex-col md:flex-row items-center gap-8 shadow-2xl">
                  {/* Glowing background shapes */}
                  <div className="absolute top-1/4 left-1/4 h-72 w-72 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                  <div className="absolute bottom-1/4 right-1/4 h-72 w-72 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

                  <div className="flex-1 space-y-5 z-10">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold uppercase tracking-wider font-mono">
                      <Sparkles className="h-3.5 w-3.5" />
                      Revolutionary Sports Scheduler
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight text-white">
                      The AI-Driven <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300">
                        Sports Turf Booking
                      </span> Platform
                    </h2>
                    <p className="text-xs md:text-sm text-slate-400 max-w-lg leading-relaxed">
                      Experience intelligent, vector-indexed arena booking. Query policies in natural language, chat with our Gemini RAG chatbot, and secure lightning fast slots with zero overlap.
                    </p>

                    <div className="pt-2 flex flex-wrap gap-3">
                      <button 
                        onClick={() => handleTabChange("turfs")}
                        className={GRADIENT_BTN}
                      >
                        Browse Active Arenas
                      </button>
                      <button 
                        onClick={() => handleTabChange("chatbot")}
                        className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                      >
                        Ask rules chatbot
                        <ArrowRight className="h-4 w-4 text-emerald-400" />
                      </button>
                    </div>
                  </div>

                  {/* High tech interactive stat card display */}
                  <div className="w-full md:w-80 space-y-3 z-10">
                    <div className={`${GLASS_CARD} p-4 flex items-center gap-4`}>
                      <div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-lg border border-emerald-500/20">
                        <Database className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Database Extension</span>
                        <span className="block text-sm font-black text-white">pgvector Active</span>
                      </div>
                    </div>

                    <div className={`${GLASS_CARD} p-4 flex items-center gap-4`}>
                      <div className="bg-cyan-500/10 text-cyan-400 p-2.5 rounded-lg border border-cyan-500/20">
                        <Cpu className="h-5 w-5 animate-pulse" />
                      </div>
                      <div className="text-left">
                        <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">AI Scheduler Engine</span>
                        <span className="block text-sm font-black text-white">Gemini-3.5-Flash</span>
                      </div>
                    </div>

                    <div className={`${GLASS_CARD} p-4 flex items-center gap-4`}>
                      <div className="bg-purple-500/10 text-purple-400 p-2.5 rounded-lg border border-purple-500/20">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Collision Resolution</span>
                        <span className="block text-sm font-black text-white">Stateless (Pre-Auth)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid stats overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className={`${GLASS_CARD} border-l-4 border-l-emerald-500 text-left space-y-2`}>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Bookmark className="h-4 w-4 text-emerald-400" />
                      High Contrast Glassmorphism
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Eye-safe aesthetic designed with deep charcoal blues, ambient vector overlays, and clean typographic pairing.
                    </p>
                  </div>

                  <div className={`${GLASS_CARD} border-l-4 border-l-cyan-500 text-left space-y-2`}>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Search className="h-4 w-4 text-cyan-400" />
                      Simulated Vector Search
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Utilizes preloaded 1536-dimensional mock embeddings mapping descriptions to query similarities instantly in the catalog.
                    </p>
                  </div>

                  <div className={`${GLASS_CARD} border-l-4 border-l-purple-500 text-left space-y-2`}>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Lock className="h-4 w-4 text-purple-400" />
                      Spring Security Pre-auth
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Complete stateless JWT user / administrator privilege protection to prevent unauthorized slot bookings.
                    </p>
                  </div>
                </div>

                {/* Popular Turfs Preview */}
                <div className="space-y-5 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-white">Trending Sports Arenas</h3>
                      <p className="text-xs text-slate-400 mt-1">Ready for high-speed reservations</p>
                    </div>
                    <button 
                      onClick={() => handleTabChange("turfs")}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      View All
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {turfs.slice(0, 3).map((turf) => (
                      <div 
                        key={turf.id} 
                        className="group bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden hover:border-slate-700/60 transition-all flex flex-col"
                      >
                        <div className="h-44 overflow-hidden relative">
                          <img 
                            src={turf.image} 
                            alt={turf.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md border border-slate-800 px-2 py-1 rounded-lg text-[10px] font-extrabold text-amber-400 flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {turf.rating}
                          </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                              {turf.sportsType}
                            </span>
                            <h4 className="text-sm font-bold text-white mt-1.5 line-clamp-1">{turf.name}</h4>
                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{turf.description}</p>
                          </div>

                          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                            <span className="text-xs font-black text-emerald-400">
                              ₹{turf.pricePerHour}<span className="text-[10px] font-medium text-slate-500">/hr</span>
                            </span>
                            <button
                              onClick={() => {
                                setSelectedTurfId(turf.id);
                                handleTabChange("booking");
                              }}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-extrabold text-white transition-all cursor-pointer"
                            >
                              Reserve Slot
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 1.5 INTERACTIVE TAMIL NADU STATE MAP VIEW */}
            {activeTab === "map" && (
              <motion.div
                key="map-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 text-left"
              >
                <TamilNaduMap
                  onBookNow={(turfId) => {
                    setSelectedTurfId(turfId);
                    handleTabChange("booking");
                  }}
                  onAddApiLog={addApiLog}
                  initialDistrictId={mapFocusedDistrictId}
                  initialPlaceId={mapFocusedPlaceId}
                  initialSportFilter={mapActiveSportFilter}
                  initialSearchQuery={mapSearchQuery}
                  onClearInitialFocus={() => {
                    setMapFocusedDistrictId(null);
                    setMapFocusedPlaceId(null);
                    setMapActiveSportFilter(null);
                    setMapSearchQuery(null);
                  }}
                />
              </motion.div>
            )}

            {/* 2. TURFS CATALOG VIEW */}
            {activeTab === "turfs" && (
              <motion.div
                key="turfs-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 text-left"
              >
                {/* Search Header Container */}
                <div className={`${GLASS_CARD} space-y-4`}>
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-white">Sports Fields Catalog</h2>
                      <p className="text-xs text-slate-400 mt-1">Search via standard string query or turn on pgvector AI Semantic mode.</p>
                    </div>

                    {/* Category quick selectors */}
                    <div className="flex flex-wrap gap-1.5">
                      {["ALL", "FOOTBALL", "CRICKET", "TENNIS", "SQUASH", "BASKETBALL"].map((sport) => (
                        <button
                          key={sport}
                          onClick={() => setSportFilter(sport)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                            sportFilter === sport 
                              ? "bg-emerald-500 text-slate-950" 
                              : "bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800"
                          }`}
                        >
                          {sport}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Input Search Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="md:col-span-2 relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={semanticSearchActive ? "Enter natural language requirements (e.g. FIFA-approved football with evening floodlights)..." : "Search by name or keyword..."}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs placeholder-slate-500 text-slate-200 focus:outline-none focus:border-emerald-500/50"
                      />
                      <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-3.5" />
                    </div>

                    <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-4 py-2">
                      <div className="text-left">
                        <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider">AI Similarity Engine</span>
                        <span className="block text-xs font-bold text-slate-300">pgvector Embedding</span>
                      </div>
                      <button
                        onClick={() => {
                          setSemanticSearchActive(!semanticSearchActive);
                          addToast("info", `AI Semantic Search ${!semanticSearchActive ? "ENABLED" : "DISABLED"}`);
                        }}
                        className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                          semanticSearchActive 
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" 
                            : "bg-slate-900 text-slate-400"
                        }`}
                      >
                        {semanticSearchActive ? "Active" : "Disabled"}
                      </button>
                    </div>
                  </div>

                  {/* Price rate slider */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 font-mono">
                    <div className="flex items-center gap-2">
                      <span>Max Hourly Price:</span>
                      <span className="font-bold text-emerald-400">${maxPrice}/hr</span>
                    </div>
                    <input 
                      type="range" 
                      min="40" 
                      max="200" 
                      step="10"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                      className="w-full sm:max-w-xs accent-emerald-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Catalog Listing */}
                {activeCatalog.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    No sports arenas fit these filters in this sandbox zone.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeCatalog.map((turf) => (
                      <div 
                        key={turf.id} 
                        className="group bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden hover:border-slate-700/60 transition-all flex flex-col shadow-lg"
                      >
                        <div className="h-44 overflow-hidden relative">
                          <img 
                            src={turf.image} 
                            alt={turf.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md border border-slate-800 px-2 py-1 rounded-lg text-[10px] font-extrabold text-amber-400 flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {turf.rating}
                          </div>

                          {/* Render similarity rate if semantic search is active */}
                          {turf.similarity !== undefined && (
                            <div className="absolute bottom-3 left-3 bg-cyan-950/90 backdrop-blur-md border border-cyan-500/35 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-cyan-300">
                              Cosine Similarity: {(turf.similarity * 100).toFixed(1)}%
                            </div>
                          )}
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                          <div className="space-y-1.5">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                              {turf.sportsType}
                            </span>
                            <h4 className="text-sm font-bold text-white mt-1 line-clamp-1">{turf.name}</h4>
                            <p className="text-[10px] text-slate-400 line-clamp-3 leading-relaxed">{turf.description}</p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-slate-500" />
                              {turf.location}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                            <span className="text-xs font-black text-emerald-400">
                              ${turf.pricePerHour}<span className="text-[10px] font-medium text-slate-500">/hr</span>
                            </span>
                            <button
                              onClick={() => {
                                setSelectedTurfId(turf.id);
                                handleTabChange("booking");
                              }}
                              className="px-3.5 py-2 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-600 text-[10px] font-black transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                            >
                              Book Now
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* 3. BOOKING CHECKOUT VIEW */}
            {activeTab === "booking" && (
              <motion.div
                key="booking-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left"
              >
                {/* Active turf description display */}
                {(() => {
                  const activeTurf = turfs.find(t => t.id === selectedTurfId) || turfs[0];
                  return (
                    <>
                      <div className="lg:col-span-2 space-y-6">
                        <div className={`${GLASS_CARD} space-y-4`}>
                          <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Calendar className="h-5.5 w-5.5 text-emerald-400" />
                            Schedule Reservation Slot
                          </h2>
                          <div className="h-48 rounded-xl overflow-hidden">
                            <img 
                              src={activeTurf.image} 
                              alt={activeTurf.name}
                              className="w-full h-full object-cover" 
                            />
                          </div>
                          <div>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                              {activeTurf.sportsType}
                            </span>
                            <h3 className="text-base font-bold text-white mt-2">{activeTurf.name}</h3>
                            <p className="text-xs text-slate-400 mt-1">{activeTurf.description}</p>
                          </div>
                        </div>

                        {/* Booking Schedule select */}
                        <div className={`${GLASS_CARD} space-y-4`}>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Select Date & Time Hour</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase font-mono">Desired Date:</label>
                              <input 
                                type="date" 
                                value={bookingDate}
                                onChange={(e) => setBookingDate(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-emerald-500/50 text-slate-200"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase font-mono">1-Hour Slot Intervals:</label>
                              <select 
                                value={bookingHour}
                                onChange={(e) => setBookingHour(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-emerald-500/50 text-slate-200"
                              >
                                <option value="09">09:00 AM - 10:00 AM</option>
                                <option value="10">10:00 AM - 11:00 AM</option>
                                <option value="11">11:00 AM - 12:00 PM</option>
                                <option value="15">03:00 PM - 04:00 PM</option>
                                <option value="16">04:00 PM - 05:00 PM</option>
                                <option value="18">06:00 PM - 07:00 PM</option>
                                <option value="19">07:00 PM - 08:00 PM</option>
                                <option value="20">08:00 PM - 09:00 PM</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* RAG Rules notification widget */}
                        <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800 flex items-start gap-3">
                          <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs font-bold text-slate-200">Facility Policy Reminder (RAG system check):</h4>
                            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                              {activeTurf.sportsType === "FOOTBALL" 
                                ? "This field uses astroturf. Players must wear turf shoes or non-marking cleats. Full refund is eligible if cancelled 24 hours in advance."
                                : "Players must wear clean, white-soled non-marking tennis/indoor court shoes. Outdoor tracking is prohibited."}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Billing Summary sidebar widget */}
                      <div className="space-y-6">
                        <div className={`${GLASS_CARD} space-y-4`}>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Reservation Handshake</h3>
                          <div className="space-y-2.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Duration rate:</span>
                              <span className="text-slate-200 font-bold">${activeTurf.pricePerHour}/hour</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Grace booking hold:</span>
                              <span className="text-emerald-400 font-semibold font-mono">10 Mins Hold</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Spring Security Context:</span>
                              <span className="text-slate-400 font-mono text-[10px]">
                                {currentUser ? "Authenticated" : "ANONYMOUS (BLOCK)"}
                              </span>
                            </div>
                            <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm">
                              <span className="text-slate-200">Total Invoice:</span>
                              <span className="text-emerald-400">${activeTurf.pricePerHour}.00</span>
                            </div>
                          </div>

                          {/* Gateway Selectors */}
                          <div className="space-y-2 pt-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Outbound Payment Gateway</label>
                            <div className="grid grid-cols-3 gap-2">
                              {["STRIPE", "UPI", "CREDIT_CARD"].map((gateway) => (
                                <button
                                  key={gateway}
                                  type="button"
                                  onClick={() => setPaymentMethod(gateway as any)}
                                  className={`px-2 py-1.5 rounded-lg text-[9px] font-extrabold border text-center cursor-pointer transition-all ${
                                    paymentMethod === gateway 
                                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" 
                                      : "bg-slate-950 text-slate-400 border-slate-800"
                                  }`}
                                >
                                  {gateway}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="pt-2">
                            <button
                              onClick={handleConfirmBooking}
                              className="w-full text-center bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 font-black px-4 py-3 rounded-xl transition-all shadow-lg text-xs cursor-pointer"
                            >
                              Proceed to Checkout
                            </button>
                            <p className="text-[10px] text-slate-500 text-center mt-2 font-mono">
                              Submits to /api/v1/bookings/reserve
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            )}

            {/* 4. BOOKING HISTORY VIEW */}
            {activeTab === "booking-history" && (
              <motion.div
                key="history-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 text-left"
              >
                <div>
                  <h2 className="text-lg font-bold text-white">Your Platform Reservations</h2>
                  <p className="text-xs text-slate-400 mt-1">Real-time status synchronizations linked to spring-ai database entries.</p>
                </div>

                {bookings.filter(b => b.userId === currentUser?.id).length === 0 ? (
                  <div className={`${GLASS_CARD} text-center py-12 text-slate-500`}>
                    You do not have any bookings in this profile yet. Start by browsing the arenas!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings
                      .filter(b => b.userId === currentUser?.id)
                      .map((booking) => {
                        const associatedTurf = turfs.find(t => t.id === booking.turfId) || turfs[0];
                        const associatedPayment = payments.find(p => p.bookingId === booking.id);
                        return (
                          <div 
                            key={booking.id} 
                            className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                            <div className="flex items-start gap-4">
                              <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0 hidden sm:block">
                                <img 
                                  src={associatedTurf.image} 
                                  alt={associatedTurf.name}
                                  className="w-full h-full object-cover" 
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                                  ID: #RES-00{booking.id}
                                </span>
                                <h4 className="text-sm font-bold text-white">{associatedTurf.name}</h4>
                                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                                  <Clock className="h-4 w-4 text-emerald-400" />
                                  {new Date(booking.startTime).toLocaleDateString()} at {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  Method: {associatedPayment?.paymentMethod} | Transaction: {associatedPayment?.transactionId || "N/A"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t border-slate-800 md:border-t-0">
                              <div className="text-left md:text-right">
                                <span className="block text-[10px] text-slate-500">Receipt Invoice</span>
                                <span className="block text-xs font-black text-emerald-400">${booking.totalPrice}</span>
                                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  booking.status === "CONFIRMED" 
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                    : booking.status === "CANCELLED"
                                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                      : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                }`}>
                                  {booking.status}
                                </span>
                              </div>

                              {booking.status === "CONFIRMED" && (
                                <button
                                  onClick={() => handleCancelBooking(booking.id)}
                                  className="px-3.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-black border border-rose-500/15 transition-all cursor-pointer"
                                >
                                  Cancel Booking
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </motion.div>
            )}

            {/* 5. USER / ADMIN DASHBOARD VIEW */}
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 text-left"
              >
                {/* Admin context switch */}
                {currentUser?.role === "ROLE_ADMIN" ? (
                  <div>
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <div>
                        <h2 className="text-lg font-black text-white flex items-center gap-2">
                          <Layers className="h-5.5 w-5.5 text-emerald-400" />
                          Administrator Control Tower
                        </h2>
                        <p className="text-xs text-slate-400">Manage arena indexes, review user slot reservations, and inspect security rules.</p>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold uppercase tracking-wider">
                        ROLE_ADMIN ACTIVE
                      </span>
                    </div>

                    <AdminPanel 
                      turfs={turfs}
                      setTurfs={setTurfs}
                      bookings={bookings}
                      setBookings={setBookings}
                      payments={payments}
                      setPayments={setPayments}
                      users={users}
                      setUsers={setUsers}
                      onAddTurf={handleAddTurfByAdmin}
                      onDeleteTurf={handleDeleteTurfByAdmin}
                      onUpdateBookingStatus={handleUpdateBookingStatusByAdmin}
                      onAddApiLog={addApiLog}
                    />
                  </div>
                ) : (
                  // Normal user dashboard
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-black text-white">Welcome back, {currentUser?.fullName}!</h2>
                        <p className="text-xs text-slate-400 mt-1">Here is a quick overview of your sports allocations.</p>
                      </div>
                    </div>

                    {/* Stats widgets */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                        <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Loyalty Level Badge</span>
                        <h4 className="text-lg font-black text-emerald-400 mt-1">Elite Striker</h4>
                        <p className="text-[10px] text-slate-400 mt-1">{currentUser?.loyaltyPoints} points gathered</p>
                      </div>
                      <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                        <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Total Active Reservations</span>
                        <h4 className="text-lg font-black text-cyan-400 mt-1">
                          {bookings.filter(b => b.userId === currentUser?.id && b.status === "CONFIRMED").length} Games
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1">No overlap conflicts</p>
                      </div>
                      <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                        <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Gross Spendings</span>
                        <h4 className="text-lg font-black text-white mt-1">
                          ${payments.filter(p => p.userId === currentUser?.id && p.status === "COMPLETED").reduce((sum, p) => sum + p.amount, 0)}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1">Receipts securely archived</p>
                      </div>
                    </div>

                    {/* Upcoming schedule alert */}
                    <div className={`${GLASS_CARD} space-y-4`}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Next Upcoming Match</h4>
                      {(() => {
                        const nextBooking = bookings.find(b => b.userId === currentUser?.id && b.status === "CONFIRMED");
                        if (!nextBooking) {
                          return (
                            <div className="text-slate-500 text-xs py-4">No slots booked for this week. Start a semantic search to find open hours!</div>
                          );
                        }
                        const associatedTurf = turfs.find(t => t.id === nextBooking.turfId) || turfs[0];
                        return (
                          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
                            <div className="space-y-1 text-xs">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-[9px] text-slate-400 font-bold uppercase">
                                {associatedTurf.sportsType}
                              </span>
                              <h5 className="font-bold text-white text-sm mt-1">{associatedTurf.name}</h5>
                              <p className="text-slate-400 flex items-center gap-1 font-mono text-[11px]">
                                <Clock className="h-4 w-4 text-emerald-400" />
                                {new Date(nextBooking.startTime).toLocaleDateString()} at {new Date(nextBooking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <button
                              onClick={() => handleTabChange("booking-history")}
                              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-extrabold text-white cursor-pointer"
                            >
                              Details
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 6. AI CHATBOT VIEW */}
            {activeTab === "chatbot" && (
              <motion.div
                key="chatbot-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 text-left"
              >
                <div>
                  <h2 className="text-lg font-bold text-white">Gemini Interactive Chat Scheduler</h2>
                  <p className="text-xs text-slate-400 mt-1">Converse in natural language to retrieve facility rules, filter turfs, or trigger bookings instantly.</p>
                </div>

                <Chatbot 
                  turfs={turfs}
                  currentUser={currentUser}
                  onAddApiLog={addApiLog}
                  onNavigateToTurfBooking={(turfId) => {
                    setSelectedTurfId(turfId);
                    handleTabChange("booking");
                  }}
                  onUpdateMapFocus={(distId, plId, sport, search) => {
                    setMapFocusedDistrictId(distId);
                    setMapFocusedPlaceId(plId);
                    setMapActiveSportFilter(sport);
                    setMapSearchQuery(search);
                    handleTabChange("map");
                  }}
                  currentDistrictId={mapFocusedDistrictId}
                  currentPlaceId={mapFocusedPlaceId}
                  currentSportFilter={mapActiveSportFilter}
                />
              </motion.div>
            )}

            {/* RAG VECTOR SANDBOX VIEW */}
            {activeTab === "rag-sandbox" && (
              <motion.div
                key="rag-sandbox-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
              >
                <RagSandbox onAddApiLog={addApiLog} />
              </motion.div>
            )}

            {/* AI SPORTS RECOMMENDATIONS HUB VIEW */}
            {activeTab === "ai-sports-hub" && (
              <motion.div
                key="ai-sports-hub-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
              >
                <AiSportsHub 
                  onSelectTurf={(id) => setSelectedTurfId(id)}
                  onNavigateToTab={(tab) => handleTabChange(tab as any)}
                  onAddApiLog={addApiLog}
                  currentUser={currentUser}
                />
              </motion.div>
            )}

            {/* 7. PROFILE & AUTH VIEW */}
            {activeTab === "profile" && (
              <motion.div
                key="profile-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-md mx-auto text-left"
              >
                {currentUser ? (
                  // Logged in profile details
                  <div className={`${GLASS_CARD} space-y-6`}>
                    <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
                      <img 
                        src={currentUser.avatar} 
                        alt={currentUser.fullName}
                        className="h-14 w-14 rounded-2xl object-cover border border-slate-700" 
                      />
                      <div>
                        <h3 className="text-base font-extrabold text-white">{currentUser.fullName}</h3>
                        <p className="text-xs text-slate-400 font-mono">{currentUser.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold font-mono uppercase">
                          {currentUser.role}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3.5 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Joined Platform:</span>
                        <span className="font-bold">{currentUser.joinedAt}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Loyalty Status points:</span>
                        <span className="font-bold text-emerald-400">{currentUser.loyaltyPoints} Points</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Platform Scope:</span>
                        <span className="font-bold text-slate-400">PostgreSQL Vector indexed</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleLogout}
                        className="w-full text-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-extrabold px-4 py-2.5 rounded-xl border border-rose-500/15 transition-all text-xs cursor-pointer"
                      >
                        Sign Out of Session
                      </button>
                    </div>
                  </div>
                ) : (
                  // Login/Register Form
                  <div className={`${GLASS_CARD} space-y-6`}>
                    <div className="text-center border-b border-slate-800 pb-5">
                      <h3 className="text-base font-extrabold text-white">
                        {isRegisterMode ? "Register Sports Arena Profile" : "Sign In to Platform"}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {isRegisterMode ? "Create profile mapped to Spring Security role scopes" : "Pre-filled credentials below are ready for rapid test"}
                      </p>
                    </div>

                    {isRegisterMode ? (
                      // Register form
                      <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">Full Name</label>
                          <input 
                            type="text" 
                            required
                            value={regFullName}
                            onChange={(e) => setRegFullName(e.target.value)}
                            placeholder="e.g. David Alaba"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">Email address</label>
                          <input 
                            type="email" 
                            required
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="david@example.com"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">Password</label>
                          <input 
                            type="password" 
                            required
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">Authorization Privilege Group</label>
                          <select 
                            value={regRole}
                            onChange={(e) => setRegRole(e.target.value as any)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                          >
                            <option value="ROLE_USER">ROLE_USER (Customer Bookings)</option>
                            <option value="ROLE_ADMIN">ROLE_ADMIN (Platform Administrator CRUD)</option>
                          </select>
                        </div>

                        <button 
                          type="submit" 
                          className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-black py-2.5 rounded-xl transition-all text-xs cursor-pointer"
                        >
                          Register Profile
                        </button>

                        <div className="text-center pt-2">
                          <button 
                            type="button" 
                            onClick={() => setIsRegisterMode(false)}
                            className="text-[11px] text-slate-400 hover:text-white"
                          >
                            Already have an account? Sign In
                          </button>
                        </div>
                      </form>
                    ) : (
                      // Login form
                      <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">Email address</label>
                          <input 
                            type="email" 
                            required
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            placeholder="alex@example.com"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">Password</label>
                          <input 
                            type="password" 
                            required
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <button 
                          type="submit" 
                          className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-black py-2.5 rounded-xl transition-all text-xs cursor-pointer"
                        >
                          Sign In
                        </button>

                        {/* Quick Sandbox user pre-fills */}
                        <div className="pt-4 border-t border-slate-800/80 text-left space-y-2">
                          <span className="block text-[10px] text-slate-500 uppercase font-mono font-bold">Quick Prefill Shortcuts:</span>
                          <div className="flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={() => loginAsShortcut("alex@example.com")}
                              className="px-3 py-2 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800/80 text-left text-[11px] flex items-center justify-between text-slate-300"
                            >
                              <span>1. alex@example.com (Alex Morgan)</span>
                              <span className="text-[9px] px-1 bg-emerald-500/10 text-emerald-400 rounded">USER</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => loginAsShortcut("marcus@example.com")}
                              className="px-3 py-2 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800/80 text-left text-[11px] flex items-center justify-between text-slate-300"
                            >
                              <span>2. marcus@example.com (Marcus Rashford)</span>
                              <span className="text-[9px] px-1 bg-emerald-500/10 text-emerald-400 rounded">USER</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => loginAsShortcut("david.admin@example.com")}
                              className="px-3 py-2 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800/80 text-left text-[11px] flex items-center justify-between text-slate-300"
                            >
                              <span>3. david.admin@example.com (David Admin)</span>
                              <span className="text-[9px] px-1 bg-rose-500/10 text-rose-400 rounded">ADMIN</span>
                            </button>
                          </div>
                        </div>

                        <div className="text-center pt-2 border-t border-slate-800/40">
                          <button 
                            type="button" 
                            onClick={() => setIsRegisterMode(true)}
                            className="text-[11px] text-slate-400 hover:text-white"
                          >
                            Don't have an account? Register Profile
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* 8. INTERACTIVE DATABASE SHELL & DOCUMENTATION VIEW */}
            {activeTab === "database-docs" && (
              <motion.div
                key="terminal-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4 text-left"
              >
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Database className="h-5.5 w-5.5 text-emerald-400" />
                    Database Schema & Code Specifications
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Review specifications for the PostgreSQL schema, pgvector 1536-dimensional embedding tables, and relational links.
                  </p>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-300 max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed">
{`-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Users Table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ROLE_USER',
    refresh_token VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Turfs Table (With description_embedding pgvector column)
CREATE TABLE turfs (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    location VARCHAR(255) NOT NULL,
    sports_type VARCHAR(50) NOT NULL,
    description TEXT,
    price_per_hour NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description_embedding vector(1536) 
);

-- 3. Bookings Table
CREATE TABLE bookings (
    id BIGSERIAL PRIMARY KEY,
    turf_id BIGINT NOT NULL REFERENCES turfs(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
);

-- 4. Payments Table
CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(150) UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
);

-- 5. Document Embeddings Table (For RAG Terms & Regulations)
CREATE TABLE document_embeddings (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL,
    chunk_content TEXT NOT NULL,
    embedding vector(1536) NOT NULL
);

-- HNSW Vector Index setup
CREATE INDEX idx_turfs_embedding ON turfs USING hnsw (description_embedding vector_cosine_ops);`}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* Floating Database specification Quick Trigger footer tab */}
      <footer className="fixed bottom-12 right-6 z-30">
        <button
          onClick={() => handleTabChange(activeTab === "database-docs" ? "home" : "database-docs")}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-[10px] font-mono border border-slate-800 rounded-xl text-slate-300 hover:text-white transition-all cursor-pointer shadow-xl shadow-slate-950/40"
        >
          <Database className="h-4 w-4 text-emerald-400" />
          {activeTab === "database-docs" ? "Return to App" : "View Database DDL Schema"}
        </button>
      </footer>

      {/* Persistent Animated Toast Notifications component */}
      <Toast toasts={toasts} onClose={removeToast} />

      {/* Persistent Live REST APIhandshake logger component */}
      <ApiLogger logs={apiLogs} onClear={() => setApiLogs([])} />
    </div>
  );
}
