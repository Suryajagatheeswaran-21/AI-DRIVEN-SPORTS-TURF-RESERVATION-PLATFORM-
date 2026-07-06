import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  MapPin, 
  Clock, 
  Coins, 
  Search, 
  User, 
  ThumbsUp, 
  Calendar, 
  ArrowRight, 
  Star, 
  Flame, 
  Layers, 
  HelpCircle,
  TrendingUp,
  Cpu,
  History
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Turf } from "../types";
import turfsData from "../data/turfs.json";

// Helper to parse bold text (**text**) and bold italic
function parseBoldAndItalic(text: string): React.ReactNode[] | string {
  const parts = text.split(/(\*\*.*?\*\*)/);
  if (parts.length === 1) return text;
  
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-extrabold text-white">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// Custom Markdown formatter to render headers, bullet points, numbered lists and paragraphs beautifully
function renderFormattedText(text: string) {
  if (!text) return null;
  
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    let cleanLine = line.trim();
    if (!cleanLine) return <div key={idx} className="h-2"></div>;
    
    // Check headers
    if (cleanLine.startsWith("### ")) {
      return (
        <h4 key={idx} className="text-sm font-black text-white mt-4 mb-2">
          {parseBoldAndItalic(cleanLine.substring(4))}
        </h4>
      );
    }
    if (cleanLine.startsWith("## ")) {
      return (
        <h3 key={idx} className="text-base font-black text-white mt-4 mb-2">
          {parseBoldAndItalic(cleanLine.substring(3))}
        </h3>
      );
    }
    if (cleanLine.startsWith("# ")) {
      return (
        <h2 key={idx} className="text-lg font-black text-white mt-4 mb-2">
          {parseBoldAndItalic(cleanLine.substring(2))}
        </h2>
      );
    }
    
    // Check list items
    if (cleanLine.startsWith("- ") || cleanLine.startsWith("* ")) {
      return (
        <li key={idx} className="ml-4 list-disc text-slate-300 mt-1 pl-1">
          {parseBoldAndItalic(cleanLine.substring(2))}
        </li>
      );
    }
    
    // Check numbered list items
    const numMatch = cleanLine.match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      return (
        <li key={idx} className="ml-4 list-decimal text-slate-300 mt-1 pl-1">
          {parseBoldAndItalic(numMatch[2])}
        </li>
      );
    }
    
    // Default paragraph
    return (
      <p key={idx} className="mt-2 text-slate-300 leading-relaxed">
        {parseBoldAndItalic(cleanLine)}
      </p>
    );
  });
}

// Helper to get corresponding image for recommended turfs
export function getTurfImage(sport: string, id: number): string {
  const images: Record<string, string> = {
    FOOTBALL: "https://images.unsplash.com/photo-1589487391730-58f20eb2c308?w=800",
    CRICKET: "https://images.unsplash.com/photo-1589801258579-18e0ae1f7aa8?w=800",
    TENNIS: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800",
    BASKETBALL: "https://images.unsplash.com/photo-1519766304817-4f37bda74a27?w=800",
    SQUASH: "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=800"
  };
  
  if (id === 4) return "https://images.unsplash.com/photo-1517747614396-d21a78b850e8?w=800"; // futsal
  return images[sport.toUpperCase()] || "https://images.unsplash.com/photo-1517747614396-d21a78b850e8?w=800";
}

interface AiSportsHubProps {
  onSelectTurf: (id: number) => void;
  onNavigateToTab: (tab: string) => void;
  onAddApiLog: (
    method: "GET" | "POST" | "DELETE" | "PUT",
    url: string,
    reqBody?: string,
    respBody?: string,
    status?: number
  ) => void;
  currentUser: any;
}

export default function AiSportsHub({ onSelectTurf, onNavigateToTab, onAddApiLog, currentUser }: AiSportsHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<"natural-search" | "nearby" | "best-time" | "budget" | "alternative" | "personalized">("natural-search");
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string>("");
  const [recommendedTurfs, setRecommendedTurfs] = useState<Turf[]>([]);
  const [suggestedTimes, setSuggestedTimes] = useState<string[]>([]);
  
  // Natural Language Search state
  const [nlQuery, setNlQuery] = useState("I need a football turf tomorrow evening.");
  
  // Nearby Turf state
  const [locationQuery, setLocationQuery] = useState("Downtown Seattle");
  
  // Best Time state
  const [selectedTurfId, setSelectedTurfId] = useState<string>("1");
  const [targetDate, setTargetDate] = useState("2026-07-05");
  const [allTurfsList, setAllTurfsList] = useState<Turf[]>([]);
  
  // Budget state
  const [budgetLimit, setBudgetLimit] = useState<number>(90);
  
  // Alternatives state
  const [compareTurfId, setCompareTurfId] = useState<string>("1");
  
  // Personalized state (onboarding questionnaire for guests or history viewer for users)
  const [guestSportPref, setGuestSportPref] = useState<string>("FOOTBALL");
  const [guestBudgetPref, setGuestBudgetPref] = useState<number>(100);
  const [guestTimePref, setGuestTimePref] = useState<string>("Evening under the lights");

  // Load all turfs initially for selectors
  useEffect(() => {
    fetch("/api/v1/turfs")
      .then(async res => {
        if (!res.ok) throw new Error("Backend offline");
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Response is not JSON");
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          const mapped = data.map((t: any) => ({
            ...t,
            image: getTurfImage(t.sportsType, t.id),
            rating: t.rating || 5.0
          }));
          setAllTurfsList(mapped);
        } else {
          throw new Error("Invalid data format");
        }
      })
      .catch(err => {
        console.warn("Using local fallback turfs dataset in AI Studio Preview:", err);
        const mappedFallback = turfsData.map((t: any) => ({
          id: t.id,
          name: t.turfName,
          sportsType: t.sport,
          location: t.district,
          pricePerHour: t.price,
          rating: t.rating || 5.0,
          availability: t.availability,
          image: getTurfImage(t.sport, t.id)
        }));
        setAllTurfsList(mappedFallback);
      });
  }, []);

  const triggerApiCall = async (endpoint: string, method: string = "GET") => {
    setLoading(true);
    setExplanation("");
    setRecommendedTurfs([]);
    setSuggestedTimes([]);

    const timestamp = new Date().toLocaleTimeString();
    try {
      const res = await fetch(endpoint, { method });
      const status = res.status;
      const data = await res.json();
      
      onAddApiLog(
        method as any,
        endpoint,
        undefined,
        JSON.stringify(data, null, 2),
        status
      );

      if (data) {
        setExplanation(data.explanation || "");
        if (Array.isArray(data.recommendedTurfs)) {
          const mapped = data.recommendedTurfs.map((t: any) => ({
            ...t,
            image: getTurfImage(t.sportsType, t.id),
            rating: t.rating || 5.0
          }));
          setRecommendedTurfs(mapped);
        }
        if (Array.isArray(data.suggestedTimes)) {
          setSuggestedTimes(data.suggestedTimes);
        }
      }
    } catch (error: any) {
      console.error("AI Sports Hub API error:", error);
      setExplanation("### ❌ Transaction Failure\nUnable to reach the AI engine or load the vector matches. Please ensure the dev server is active.");
      onAddApiLog(
        method as any,
        endpoint,
        undefined,
        error.message,
        500
      );
    } finally {
      setLoading(false);
    }
  };

  const runNaturalSearch = () => {
    triggerApiCall(`/api/v1/ai/recommendations/natural-search?query=${encodeURIComponent(nlQuery)}`);
  };

  const runNearbyMatch = () => {
    triggerApiCall(`/api/v1/ai/recommendations/nearby?location=${encodeURIComponent(locationQuery)}`);
  };

  const runBestTime = () => {
    triggerApiCall(`/api/v1/ai/recommendations/best-time?turfId=${selectedTurfId}&date=${encodeURIComponent(targetDate)}`);
  };

  const runBudgetMatch = () => {
    triggerApiCall(`/api/v1/ai/recommendations/budget?maxPrice=${budgetLimit}`);
  };

  const runAlternativeMatch = () => {
    triggerApiCall(`/api/v1/ai/recommendations/alternative?turfId=${compareTurfId}`);
  };

  const runPersonalizedMatch = () => {
    if (currentUser) {
      triggerApiCall(`/api/v1/ai/recommendations/personalized?userId=${currentUser.id}`);
    } else {
      // Build a local customized profile prompt to pass into NL search to simulate high accuracy
      const simulatedNLQuery = `I am looking for a ${guestSportPref} turf. My preferred budget is around $${guestBudgetPref}/hr, and I usually like playing in the ${guestTimePref}. Recommend the best fields for me.`;
      triggerApiCall(`/api/v1/ai/recommendations/natural-search?query=${encodeURIComponent(simulatedNLQuery)}`);
    }
  };

  // Run initial search
  useEffect(() => {
    runNaturalSearch();
  }, []);

  return (
    <div className="space-y-6 text-left">
      {/* HEADER BAR */}
      <div className="bg-slate-900/40 rounded-3xl p-6 md:p-8 border border-slate-800 relative overflow-hidden shadow-xl">
        <div className="absolute -top-12 -right-12 h-44 w-44 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 h-44 w-44 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold uppercase tracking-wider font-mono">
              <Cpu className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '3s' }} />
              Intelligent Analytics Engine
            </span>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Smart Recommendations
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl">
              Leverage pgvector similarity queries and Gemini-3.5-Flash to fetch coordinates, perform value rankings, audit slot occupancies, and schedule sports games.
            </p>
          </div>

          <button
            onClick={() => onNavigateToTab("chatbot")}
            className="px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-300 font-bold flex items-center gap-2 transition-all cursor-pointer self-start md:self-center"
          >
            Launch Interactive Bot
            <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* TABS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-900 shadow-inner">
        {[
          { id: "natural-search", label: "NL Search", icon: Search, color: "text-emerald-400 bg-emerald-500/5 border-emerald-500/10" },
          { id: "nearby", label: "Nearby Match", icon: MapPin, color: "text-cyan-400 bg-cyan-500/5 border-cyan-500/10" },
          { id: "best-time", label: "Best Slot", icon: Clock, color: "text-amber-400 bg-amber-500/5 border-amber-500/10" },
          { id: "budget", label: "Value Budget", icon: Coins, color: "text-indigo-400 bg-indigo-500/5 border-indigo-500/10" },
          { id: "alternative", label: "Alternatives", icon: Sparkles, color: "text-purple-400 bg-purple-500/5 border-purple-500/10" },
          { id: "personalized", label: "My Persona", icon: User, color: "text-pink-400 bg-pink-500/5 border-pink-500/10" },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id as any);
                // Trigger appropriate API on tab click
                if (tab.id === "natural-search") runNaturalSearch();
                else if (tab.id === "nearby") runNearbyMatch();
                else if (tab.id === "best-time") runBestTime();
                else if (tab.id === "budget") runBudgetMatch();
                else if (tab.id === "alternative") runAlternativeMatch();
                else if (tab.id === "personalized") runPersonalizedMatch();
              }}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all cursor-pointer ${
                isActive 
                  ? "bg-slate-900 text-white border-slate-700 shadow-md scale-[1.02]" 
                  : "bg-slate-900/20 text-slate-400 border-transparent hover:bg-slate-900/40 hover:text-slate-200"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? tab.color.split(" ")[0] : "text-slate-500"}`} />
              <span className="text-[10px] font-black tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* CONTROLS & DOCK LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* INPUT COLUMN */}
        <div className="bg-slate-900/35 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-lg self-start">
          <h3 className="text-xs font-black text-white font-mono uppercase tracking-widest border-b border-slate-800 pb-2.5 flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-400" />
            Query Variables
          </h3>

          <AnimatePresence mode="wait">
            {/* NATURAL LANGUAGE SEARCH CONTROLS */}
            {activeSubTab === "natural-search" && (
              <motion.div
                key="ns"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-400 font-bold">Natural Language Query</label>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Query matches similar fields using pgvector and merges RAG slot-cancellations policies into the prompt context.
                  </p>
                  <textarea
                    value={nlQuery}
                    onChange={(e) => setNlQuery(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 resize-none font-mono mt-1"
                  />
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="block text-[9px] font-bold text-slate-500 uppercase font-mono">Query Examples</span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      "I need a football turf tomorrow evening.",
                      "Best value tennis court under $50 with great reviews",
                      "Full size cricket pitch for weekend match"
                    ].map(ex => (
                      <button
                        key={ex}
                        onClick={() => setNlQuery(ex)}
                        className="text-[9px] text-left px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 cursor-pointer"
                      >
                        "{ex}"
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={runNaturalSearch}
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loading ? <Clock className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Ask AI Search Engine
                </button>
              </motion.div>
            )}

            {/* NEARBY MATCH CONTROLS */}
            {activeSubTab === "nearby" && (
              <motion.div
                key="nb"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-400 font-bold">Preferred Vicinity / Commute</label>
                  <p className="text-[10px] text-slate-500">
                    Locates fields closest to your commute preferences by assessing coordinates semantically.
                  </p>
                  <input
                    type="text"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono mt-1"
                  />
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="block text-[9px] font-bold text-slate-500 uppercase font-mono">Location Quick Presets</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {["Tukwila", "Seattle", "Redmond", "Capitol Hill"].map(loc => (
                      <button
                        key={loc}
                        onClick={() => setLocationQuery(loc)}
                        className="text-[10px] px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 cursor-pointer"
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={runNearbyMatch}
                  disabled={loading}
                  className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loading ? <Clock className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  Find Nearby Arenas
                </button>
              </motion.div>
            )}

            {/* BEST TIME CONTROLS */}
            {activeSubTab === "best-time" && (
              <motion.div
                key="bt"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-400 font-bold">Select Sports Field</label>
                  <select
                    value={selectedTurfId}
                    onChange={(e) => setSelectedTurfId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 mt-1"
                  >
                    {allTurfsList.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.sportsType})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="block text-slate-400 font-bold">Target Match Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 font-mono mt-1"
                  />
                </div>

                <button
                  onClick={runBestTime}
                  disabled={loading}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loading ? <Clock className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                  Recommend Best Slots
                </button>
              </motion.div>
            )}

            {/* VALUE BUDGET CONTROLS */}
            {activeSubTab === "budget" && (
              <motion.div
                key="bg"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <label className="text-slate-400 font-bold">Maximum Hourly Rate</label>
                    <span className="font-mono font-bold text-indigo-400">${budgetLimit}/hr</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="160"
                    step="10"
                    value={budgetLimit}
                    onChange={(e) => setGuestBudgetPref(parseInt(e.target.value)) || setBudgetLimit(parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-1 bg-slate-950 rounded-lg cursor-pointer mt-2"
                  />
                  <p className="text-[10px] text-slate-500 mt-2">
                    AI engine performs an economic value analysis, indexing the fields with the highest ratings relative to hourly fees.
                  </p>
                </div>

                <button
                  onClick={runBudgetMatch}
                  disabled={loading}
                  className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loading ? <Clock className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
                  Assess Best Value
                </button>
              </motion.div>
            )}

            {/* ALTERNATIVE CORRECTION CONTROLS */}
            {activeSubTab === "alternative" && (
              <motion.div
                key="alt"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-400 font-bold">Base Arena to Compare</label>
                  <p className="text-[10px] text-slate-500">
                    Find comparable fields with matching sports types or descriptions, evaluating budget-friendly substitutes.
                  </p>
                  <select
                    value={compareTurfId}
                    onChange={(e) => setCompareTurfId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 mt-1"
                  >
                    {allTurfsList.map(t => (
                      <option key={t.id} value={t.id}>{t.name} (${t.pricePerHour}/hr)</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={runAlternativeMatch}
                  disabled={loading}
                  className="w-full py-2.5 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loading ? <Clock className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Compare Alternatives
                </button>
              </motion.div>
            )}

            {/* PERSONALIZED FEED CONTROLS */}
            {activeSubTab === "personalized" && (
              <motion.div
                key="pers"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4 text-xs"
              >
                {currentUser ? (
                  <div className="space-y-2.5">
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 flex items-start gap-3">
                      <History className="h-4.5 w-4.5 text-emerald-400 mt-0.5" />
                      <div>
                        <span className="block text-white font-extrabold text-[11px]">Active Profile Hooked</span>
                        <p className="text-[10px] text-slate-400 leading-normal mt-0.5">
                          Personalizing using previous booking frequencies and written reviews for <strong>{currentUser.fullName}</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="bg-pink-500/5 border border-pink-500/10 rounded-xl p-3 flex items-start gap-3">
                      <HelpCircle className="h-4.5 w-4.5 text-pink-400 mt-0.5" />
                      <div>
                        <span className="block text-white font-extrabold text-[11px]">Guest Onboarding Profile</span>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                          Create a local sports profile to instantly generate customized recommendations tailored to your playstyle.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-slate-400 font-semibold">Favorite Sport</label>
                      <select
                        value={guestSportPref}
                        onChange={(e) => setGuestSportPref(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="FOOTBALL">Football / Soccer</option>
                        <option value="CRICKET">Cricket Grounds</option>
                        <option value="TENNIS">Tennis Courts</option>
                        <option value="BASKETBALL">Basketball Court</option>
                        <option value="SQUASH">Squash Glass Box</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-slate-400 font-semibold">Best Play Environment</label>
                      <select
                        value={guestTimePref}
                        onChange={(e) => setGuestTimePref(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="Evening under the lights">Evening under the lights</option>
                        <option value="Quiet morning freshness">Quiet morning freshness</option>
                        <option value="Indoor AC comfort">Indoor AC comfort</option>
                        <option value="Weekend prime peak match">Weekend prime peak match</option>
                      </select>
                    </div>
                  </div>
                )}

                <button
                  onClick={runPersonalizedMatch}
                  disabled={loading}
                  className="w-full py-2.5 bg-pink-500 hover:bg-pink-600 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loading ? <Clock className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                  Generate My Custom Feed
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RESULTS SPLIT VIEW */}
        <div className="lg:col-span-2 space-y-6">
          {/* LOAD CONTAINER */}
          {loading ? (
            <div className="bg-slate-900/10 border border-slate-900/60 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="h-14 w-14 rounded-full border-4 border-slate-800 border-t-emerald-500 animate-spin"></div>
                <Cpu className="h-6 w-6 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-mono font-black tracking-widest text-slate-400 uppercase">
                  AI Arena Recommendation Engine
                </p>
                <p className="text-[10px] text-slate-500">
                  Executing pgvector checks & requesting Gemini-3.5-Flash context...
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {/* EXPLANATION PANEL */}
              {explanation && (
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden shadow-xl text-left">
                  <div className="absolute top-3 right-4 flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono font-bold">
                    <Sparkles className="h-3 w-3" />
                    AI Reasoning
                  </div>
                  
                  <h4 className="text-xs font-black text-slate-500 font-mono uppercase tracking-widest mb-3 flex items-center gap-1">
                    Analysis Report
                  </h4>

                  <div className="markdown-body text-xs leading-relaxed text-slate-300 space-y-1 font-sans">
                    {renderFormattedText(explanation)}
                  </div>

                  {suggestedTimes.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-800/60">
                      <span className="block text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider mb-2">
                        Suggested Time Slots:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {suggestedTimes.map((time, idx) => (
                          <span 
                            key={idx} 
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/5 text-amber-400 border border-amber-500/10 rounded-lg text-xs font-semibold font-mono"
                          >
                            <Calendar className="h-3.5 w-3.5 text-amber-400" />
                            {time}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* RECOMMENDED CARD GRID */}
              {recommendedTurfs.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 font-mono uppercase tracking-widest flex items-center gap-1.5 pl-1">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    Matched Fields ({recommendedTurfs.length})
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {recommendedTurfs.map((turf) => (
                      <div 
                        key={turf.id} 
                        className="bg-slate-900/30 rounded-xl border border-slate-800/80 hover:border-slate-700/60 transition-all flex flex-col justify-between overflow-hidden shadow"
                      >
                        <div className="h-28 overflow-hidden relative">
                          <img 
                            src={turf.image} 
                            alt={turf.name} 
                            className="w-full h-full object-cover" 
                          />
                          <div className="absolute top-2.5 right-2.5 bg-slate-950/80 backdrop-blur-md border border-slate-800 px-2 py-0.5 rounded-md text-[9px] font-extrabold text-amber-400 flex items-center gap-1">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {turf.rating}
                          </div>
                          <div className="absolute bottom-2.5 left-2.5 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-extrabold text-slate-300 tracking-wider font-mono uppercase">
                            {turf.sportsType}
                          </div>
                        </div>

                        <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                          <div>
                            <h5 className="text-xs font-extrabold text-white line-clamp-1">{turf.name}</h5>
                            <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed mt-0.5">{turf.description}</p>
                            
                            <div className="flex items-center gap-1 mt-1.5 text-[9px] text-slate-500">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{turf.location}</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-800/40 flex items-center justify-between">
                            <span className="text-[11px] font-extrabold text-emerald-400 font-mono">
                              ${turf.pricePerHour}<span className="text-[9px] text-slate-500">/hr</span>
                            </span>
                            <button
                              onClick={() => {
                                onSelectTurf(turf.id);
                                onNavigateToTab("booking");
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[9px] font-extrabold tracking-tight transition-all cursor-pointer flex items-center gap-1 shadow"
                            >
                              Reserve Slot
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
