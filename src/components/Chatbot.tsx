import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, 
  Sparkles, 
  MessageSquare, 
  Bot, 
  Calendar, 
  HelpCircle, 
  CornerDownLeft, 
  ShieldCheck, 
  ChevronRight,
  MapPin,
  Star
} from "lucide-react";
import { ChatMessage, Turf, ApiLog } from "../types";
import { RAG_DOCUMENTS, calculateVectorSimilarity } from "../data";
import districtsData from "../data/districts.json";
import placesData from "../data/places.json";
import turfsData from "../data/turfs.json";
import { GoogleGenAI } from "@google/genai";

interface ChatbotProps {
  turfs: Turf[];
  currentUser: { fullName: string; id: number } | null;
  onAddApiLog: (method: "GET" | "POST" | "PUT" | "DELETE", url: string, reqBody?: string, respBody?: string, status?: number) => void;
  onNavigateToTurfBooking: (turfId: number) => void;
  onUpdateMapFocus?: (districtId: number, placeId: number | null, sportFilter: string | null, searchFilter: string | null) => void;
  currentDistrictId?: number | null;
  currentPlaceId?: number | null;
  currentSportFilter?: string | null;
}

export default function Chatbot({ 
  turfs: propsTurfs, 
  currentUser, 
  onAddApiLog, 
  onNavigateToTurfBooking,
  onUpdateMapFocus,
  currentDistrictId,
  currentPlaceId,
  currentSportFilter
}: ChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init-1",
      sender: "AI",
      message: "Hi! I am your AI Arena Smart Assistant. I can help search sports fields in Tamil Nadu, look up booking guidelines, or book a play session. Ask me to find football, cricket, or badminton courts in places like Sivagiri, Perundurai, or Erode!",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sessionId = currentUser?.id ? `session-${currentUser.id}` : "guest-session";

  // Persistent Active Conversation Context
  const [activeContext, setActiveContext] = useState<{
    districtId: number | null;
    placeId: number | null;
    sportFilter: string | null;
  }>({
    districtId: currentDistrictId || null,
    placeId: currentPlaceId || null,
    sportFilter: currentSportFilter || null
  });

  // Sync with prop context if they change
  useEffect(() => {
    if (currentDistrictId || currentPlaceId || currentSportFilter) {
      setActiveContext({
        districtId: currentDistrictId || null,
        placeId: currentPlaceId || null,
        sportFilter: currentSportFilter || null
      });
    }
  }, [currentDistrictId, currentPlaceId, currentSportFilter]);

  // Load chat history from localStorage on mount or user change
  useEffect(() => {
    const saved = localStorage.getItem(`chat-history-${sessionId}`);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to load chat history from localStorage:", err);
      }
    } else {
      setMessages([
        {
          id: "init-1",
          sender: "AI",
          message: "Hi! I am your AI Arena Smart Assistant. I can help search sports fields in Tamil Nadu, look up booking guidelines, or book a play session. Ask me to find football, cricket, or badminton courts in places like Sivagiri, Perundurai, or Erode!",
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    }
  }, [currentUser, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const saveHistory = (newMsgs: ChatMessage[]) => {
    localStorage.setItem(`chat-history-${sessionId}`, JSON.stringify(newMsgs));
  };

  const handleClearHistory = () => {
    if (!window.confirm("Are you sure you want to clear your conversation history?")) return;
    localStorage.removeItem(`chat-history-${sessionId}`);
    const clearMsg: ChatMessage = {
      id: `init-${Date.now()}`,
      sender: "AI",
      message: "Conversation history cleared! How else can I assist you with sports and field bookings?",
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages([clearMsg]);
    onAddApiLog("DELETE", `/api/v1/chat/history?session=${sessionId}`, undefined, "History Cleared Successfully from Local Storage", 200);
  };

  // Natural Language Intent Recognition and Parser (Requirement 8, 12)
  const parseQueryIntent = (query: string) => {
    const norm = query.toLowerCase();

    // Check if query is a contextual follow-up (Requirement 12)
    const isFollowUp = 
      norm.includes("show more") || 
      norm.includes("any cheaper") || 
      norm.includes("cheaper ones") || 
      norm.includes("cheaper") || 
      norm.includes("different ones") || 
      norm.includes("available today");

    let districtId = isFollowUp ? activeContext.districtId : null;
    let placeId = isFollowUp ? activeContext.placeId : null;
    let sport = isFollowUp ? activeContext.sportFilter : null;
    let cheapSort = norm.includes("cheap") || norm.includes("cheaper") || norm.includes("low price") || norm.includes("affordable");
    let availableTodayOnly = norm.includes("today") || norm.includes("now") || norm.includes("available today");

    // 1. Identify District
    districtsData.forEach(d => {
      if (norm.includes(d.district.toLowerCase())) {
        districtId = d.id;
      }
    });

    // 2. Identify Place
    placesData.forEach(p => {
      if (norm.includes(p.name.toLowerCase())) {
        placeId = p.id;
        // Automatically link place's district
        districtId = p.district_id;
      }
    });

    // 3. Identify Sport
    const sports = ["football", "cricket", "tennis", "badminton", "basketball", "squash"];
    sports.forEach(s => {
      if (norm.includes(s)) {
        sport = s.toUpperCase();
      }
    });

    // Fallbacks to default Erode context if nothing is specified but follow-up is requested
    if (isFollowUp && !districtId) {
      districtId = 8; // Erode District
      placeId = 106; // Sivagiri Place
    }

    return {
      districtId,
      placeId,
      sport,
      cheapSort,
      availableTodayOnly
    };
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "USER",
      message: input,
      timestamp: new Date().toLocaleTimeString()
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveHistory(updatedMessages);

    const originalInput = input;
    setInput("");
    setIsTyping(true);

    try {
      const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY || "";
      
      // Parse Query Intent using Context Tracker
      const parsed = parseQueryIntent(originalInput);
      
      // Save updated conversational context
      setActiveContext({
        districtId: parsed.districtId,
        placeId: parsed.placeId,
        sportFilter: parsed.sport
      });

      // Fetch and Filter Local Database Results (Requirement 8)
      let matches: Turf[] = [];
      if (parsed.districtId || parsed.placeId || parsed.sport) {
        matches = turfsData.map(t => ({
          id: t.id,
          name: t.name,
          turfName: t.name,
          location: t.address,
          address: t.address,
          latitude: t.latitude,
          longitude: t.longitude,
          sportsType: t.sports,
          sport: t.sports,
          description: `Premium ${t.sports.toLowerCase()} court in ${t.district}.`,
          pricePerHour: t.price,
          price: t.price,
          isActive: true,
          image: t.images?.[0] || "https://images.unsplash.com/photo-1589487391730-58f20eb2c308?w=800",
          rating: t.rating,
          openTime: t.openTime,
          type: t.type,
          availableToday: t.availableToday,
          availability: t.availability,
          districtId: districtsData.find(d => d.district.toLowerCase() === t.district.toLowerCase())?.id,
          placeId: t.place_id
        }));

        if (parsed.districtId) {
          const dName = districtsData.find(d => d.id === parsed.districtId)?.district || "";
          matches = matches.filter(t => (t.location || "").toLowerCase().includes(dName.toLowerCase()));
        }
        if (parsed.placeId) {
          matches = matches.filter(t => t.placeId === parsed.placeId);
        }
        if (parsed.sport) {
          matches = matches.filter(t => (t.sportsType || "").toUpperCase() === parsed.sport || (t.sport || "").toUpperCase() === parsed.sport);
        }
        if (parsed.availableTodayOnly) {
          matches = matches.filter(t => t.availableToday === true || t.availability === "AVAILABLE");
        }
        if (parsed.cheapSort) {
          matches = matches.sort((a, b) => a.pricePerHour - b.pricePerHour);
        }
      }

      let replyMessage = "";
      let actionTurfId: number | undefined;
      let actionTurfName: string | undefined;

      // Automatically trigger interactive map centering & filtering if matching location is active (Requirement 8)
      if (parsed.districtId && onUpdateMapFocus) {
        onUpdateMapFocus(parsed.districtId, parsed.placeId, parsed.sport, null);
      }

      // Check if we have active Gemini API integration
      if (apiKey) {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });

        let systemInstruction = "You are the AI Arena Smart Assistant, helping sports enthusiasts book turfs in Tamil Nadu. Be precise, polite, and helpful. ";
        let promptContent = originalInput;

        if (matches.length > 0) {
          systemInstruction += "We found actual matching sports fields in our local database. List them concisely for the user, mentioning price, ratings, and sub-location. Let them know we have automatically updated the interactive map overlay to show these fields.";
          promptContent = `User query: "${originalInput}"\n\nMatching turf records from database: ${JSON.stringify(matches, null, 2)}`;
          actionTurfId = matches[0].id;
          actionTurfName = matches[0].name;
        } else if (parsed.districtId || parsed.placeId) {
          systemInstruction += "No exact matches were found for that criteria in our database. Inform the user politely, and suggest searching in other priority areas of Tamil Nadu (like Erode, Sivagiri, Perundurai, Salem, etc.).";
          promptContent = `User query: "${originalInput}"\n\nNo records matching Sport: ${parsed.sport || "Any"} in Sub-Region: ${parsed.placeId || "Any"}.`;
        } else {
          // Rule checking
          systemInstruction += "Answer general sports questions or facility inquiries using these rules:\n" + JSON.stringify(RAG_DOCUMENTS, null, 2);
        }

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptContent,
          config: {
            systemInstruction
          }
        });

        replyMessage = response.text || "I was unable to process that request.";
      } else {
        // High quality local context simulation
        if (matches.length > 0) {
          const placeObj = placesData.find(p => p.id === parsed.placeId);
          const distObj = districtsData.find(d => d.id === parsed.districtId);
          
          const matchedList = matches.slice(0, 3).map(t => 
            `⚽ **${t.name}** (${t.sportsType || t.sport}) \n📍 Location: ${t.address} \n💵 Price: $${t.pricePerHour}/hr • ⭐ Rating: ${t.rating} \n🕒 Hours: ${t.openTime || "06:00 AM - 10:00 PM"}`
          ).join("\n\n");

          replyMessage = `I found some excellent sports turfs matching your request in **${placeObj?.name || distObj?.district || "Tamil Nadu"}**:\n\n${matchedList}\n\n🗺️ **Interactive Map Updated:** I have automatically centered the map on these pins! Would you like to proceed with instant checkout for **${matches[0].name}**?`;
          actionTurfId = matches[0].id;
          actionTurfName = matches[0].name;
        } else if (parsed.districtId || parsed.placeId) {
          replyMessage = `I searched our Tamil Nadu database, but didn't find any active sports arenas matching your precise filters currently. \n\nTry checking popular places like **Sivagiri**, **Perundurai**, or **Erode City** for active listings!`;
        } else {
          // Fallback to general RAG
          const similarityCancellation = calculateVectorSimilarity(originalInput, RAG_DOCUMENTS[2].content);
          const similarityRules = calculateVectorSimilarity(originalInput, RAG_DOCUMENTS[0].content);
          
          if (similarityCancellation > 0.6) {
            replyMessage = `📅 **Refund & Cancellation Policy:**\n${RAG_DOCUMENTS[2].content}\n\nNeed help cancelling a specific reservation? Go to your dashboard or let me know!`;
          } else if (similarityRules > 0.6) {
            replyMessage = `👟 **Facility Rules & Shoe Regulations:**\n${RAG_DOCUMENTS[0].content}\n\nPlease ensure your team is aware of these guidelines before arriving!`;
          } else {
            replyMessage = `👋 Hello! I am your AI Assistant. I can help search sports fields in Tamil Nadu's districts (like Erode, Salem, Coimbatore, etc.) or look up rules.\n\nTry asking me: \n- *'Show football turfs in Sivagiri'* \n- *'Show cricket grounds in Erode'* \n- *'Any cheaper ones in Sivagiri?'*`;
          }
        }
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "AI",
        message: replyMessage,
        timestamp: new Date().toLocaleTimeString(),
        actionTurfId,
        actionTurfName
      } as any;

      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);
      saveHistory(finalMessages);

      onAddApiLog(
        "POST",
        `/api/v1/chat/messages?session=${sessionId}`,
        JSON.stringify({ sender: "USER", content: originalInput, context: activeContext }),
        JSON.stringify({ response: replyMessage, actionTurfId }),
        200
      );

    } catch (error: any) {
      console.error("AI Assistant error:", error);
      setIsTyping(false);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col h-[560px] backdrop-blur-md shadow-2xl relative overflow-hidden text-left">
      {/* Bot Header */}
      <div className="bg-slate-950/80 p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Bot className="h-5.5 w-5.5 text-slate-950" />
            </div>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-slate-950"></span>
          </div>
          <div>
            <h3 className="text-xs font-black text-white flex items-center gap-1.5">
              Smart Assistant
              <span className="text-[8px] font-mono bg-emerald-500/10 text-emerald-400 px-1 py-0.2 rounded border border-emerald-500/20 font-black">ACTIVE</span>
            </h3>
            <p className="text-[10px] text-slate-400">Powered by Google Gemini Pro</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearHistory}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[9px] text-slate-400 font-black transition-colors border border-slate-800 cursor-pointer"
            title="Clear entire session history"
          >
            Clear Chat
          </button>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 text-[9px] font-black border border-slate-800/80 text-cyan-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Active Sandbox</span>
          </div>
        </div>
      </div>

      {/* Suggestion Prompts */}
      <div className="bg-slate-950/40 border-b border-slate-800/50 p-2.5 flex items-center gap-2 overflow-x-auto whitespace-nowrap text-xs text-slate-400">
        <span className="font-semibold text-slate-500 text-[9px] uppercase font-mono mr-1">Quick Prompts:</span>
        <button 
          onClick={() => setInput("Show football turfs in Sivagiri")}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 hover:text-slate-200 border border-slate-800 transition-colors text-[10px] font-bold cursor-pointer"
        >
          Football in Sivagiri
        </button>
        <button 
          onClick={() => setInput("Any cheaper ones in Sivagiri?")}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 hover:text-slate-200 border border-slate-800 transition-colors text-[10px] font-bold cursor-pointer"
        >
          Cheaper Ones
        </button>
        <button 
          onClick={() => setInput("What is the refund and cancellation policy?")}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 hover:text-slate-200 border border-slate-800 transition-colors text-[10px] font-bold cursor-pointer"
        >
          Cancellation Policy
        </button>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isAI = msg.sender === "AI";
          return (
            <div key={msg.id} className={`flex ${isAI ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed border ${
                isAI 
                  ? "bg-slate-900/80 text-slate-100 border-slate-800" 
                  : "bg-emerald-600/10 text-emerald-200 border-emerald-500/20"
              }`}>
                <div className="flex items-center gap-1.5 mb-1.5 text-[9px] text-slate-400 font-mono">
                  {isAI ? (
                    <>
                      <Bot className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Assistant • {msg.timestamp}</span>
                    </>
                  ) : (
                    <span>You • {msg.timestamp}</span>
                  )}
                </div>
                <div className="whitespace-pre-wrap">{msg.message}</div>

                {/* Instant Checkout Action trigger inside AI Message */}
                {isAI && (msg as any).actionTurfId && (
                  <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[9px] text-slate-400 font-mono">
                      Target: {(msg as any).actionTurfName}
                    </span>
                    <button
                      onClick={() => onNavigateToTurfBooking((msg as any).actionTurfId)}
                      className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:brightness-110 text-slate-950 font-black text-[9px] rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-lg"
                    >
                      <Calendar className="h-3 w-3" />
                      Instant Checkout
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }}></span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Form Input Control */}
      <form onSubmit={handleSend} className="p-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Find cricket grounds in Erode or ask rules..."
          className="flex-1 bg-slate-900 border border-slate-800/80 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
        />
        <button
          type="submit"
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 p-2.5 rounded-xl transition-all cursor-pointer shadow-lg"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
