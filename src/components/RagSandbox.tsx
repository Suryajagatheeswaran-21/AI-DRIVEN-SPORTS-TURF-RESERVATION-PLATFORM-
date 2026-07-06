import React, { useState } from "react";
import { motion } from "motion/react";
import { Database, Search, Sparkles, RefreshCw, Sliders, CheckCircle, HelpCircle, FileText, MapPin, MessageSquare } from "lucide-react";

interface VectorSearchResult {
  id: number;
  documentId: number;
  title: string;
  content: string;
  category: string;
  similarity: number;
}

interface RagSandboxProps {
  onAddApiLog: (method: string, endpoint: string, request?: string, response?: string) => void;
}

export const RagSandbox: React.FC<RagSandboxProps> = ({ onAddApiLog }) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [topK, setTopK] = useState(5);
  const [results, setResults] = useState<VectorSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const performSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setResults([]);
    const endpoint = `/api/v1/ai/vector-search?query=${encodeURIComponent(query)}&category=${category}&topK=${topK}`;

    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error("Vector database query failed");
      }
      const data = await response.json();
      setResults(data);
      onAddApiLog("GET", endpoint, undefined, JSON.stringify(data));
    } catch (err: any) {
      console.error(err);
      onAddApiLog("GET", endpoint, undefined, JSON.stringify({ error: err.message }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    const endpoint = "/api/v1/ai/vector-search/sync";
    try {
      const response = await fetch(endpoint, { method: "POST" });
      const message = await response.text();
      setNotification(message);
      onAddApiLog("POST", endpoint, undefined, message);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      console.error(err);
      onAddApiLog("POST", endpoint, undefined, JSON.stringify({ error: err.message }));
    } finally {
      setIsSyncing(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat.toUpperCase()) {
      case "FAQ":
        return <HelpCircle className="h-4 w-4 text-cyan-400" />;
      case "POLICY":
        return <FileText className="h-4 w-4 text-amber-400" />;
      case "FACILITY":
        return <MapPin className="h-4 w-4 text-emerald-400" />;
      case "REVIEW":
        return <MessageSquare className="h-4 w-4 text-purple-400" />;
      default:
        return <Database className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-400" />
            PostgreSQL pgvector RAG Sandbox
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Inspect the live vector embeddings database. Queries are converted to real-time embeddings
            using the Gemini model and compared against document chunks via native PostgreSQL cosine similarity (<code className="text-emerald-400 font-mono">&lt;=&gt;</code>).
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
        >
          <RefreshCw className={`h-4 w-4 text-emerald-400 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Synchronizing..." : "Trigger Index Sync"}
        </button>
      </div>

      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center gap-2"
        >
          <CheckCircle className="h-4 w-4 shrink-0" />
          {notification}
        </motion.div>
      )}

      {/* Control Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Search Sidebar */}
        <div className="lg:col-span-1 bg-slate-900/20 p-5 rounded-2xl border border-slate-800/60 space-y-5">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
            <Sliders className="h-3.5 w-3.5 text-slate-500" />
            Retrieval Parameters
          </h3>

          {/* Category Filter */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Document Category</label>
            <div className="grid grid-cols-2 gap-1.5">
              {["ALL", "FAQ", "POLICY", "FACILITY", "REVIEW"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                    category === cat
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-slate-950/40 text-slate-400 border-slate-850 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Top K Limit */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top-K Retrieval</label>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">{topK} Match chunks</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[8px] text-slate-500 font-mono">
              <span>K=1</span>
              <span>K=10</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/40 space-y-2">
            <span className="block text-[9px] uppercase font-bold text-emerald-400 tracking-wider">Cosine Similarity Formula</span>
            <p className="text-[10px] leading-relaxed text-slate-400 font-mono">
              1 - (A &lt;=&gt; B)
            </p>
            <p className="text-[9px] text-slate-500 leading-normal">
              pgvector returns cosine distance (0.0 for identical vectors, 2.0 for opposite vectors). We invert this value to present a standard semantic similarity percentage.
            </p>
          </div>
        </div>

        {/* Right Search Field & Results */}
        <div className="lg:col-span-3 space-y-4">
          <form onSubmit={performSearch} className="flex gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Ask anything (e.g., 'What if it rains on Emerald cricket grounds?', 'Cancellation timing', 'Great pitch')"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Search Vector Store
                </>
              )}
            </button>
          </form>

          {/* Results Area */}
          <div className="space-y-3.5">
            {isLoading && (
              <div className="py-20 text-center space-y-3">
                <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Computing text embedding & querying PostgreSQL pgvector index...</p>
              </div>
            )}

            {!isLoading && results.length === 0 && (
              <div className="py-16 text-center border border-dashed border-slate-800/80 rounded-2xl space-y-2">
                <Database className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-400">No Vector Search Performed Yet</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-normal">
                  Type a sentence above to run a cosine similarity match against FAQ items, policies, review summaries, or arena facilities.
                </p>
              </div>
            )}

            {!isLoading && results.map((result, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={result.id}
                className="bg-slate-900/30 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all space-y-3 text-left"
              >
                {/* Header info */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                      {getCategoryIcon(result.category)}
                    </span>
                    <div>
                      <h4 className="text-xs font-extrabold text-white">{result.title}</h4>
                      <span className="text-[8px] font-mono text-slate-500 uppercase font-bold tracking-wider">
                        Document ID: {result.documentId} | Chunk ID: {result.id}
                      </span>
                    </div>
                  </div>

                  {/* Similarity Badge */}
                  <div className="text-right">
                    <div className="text-[10px] font-mono font-black text-emerald-400">
                      Similarity: {(result.similarity * 100).toFixed(1)}%
                    </div>
                    <div className="w-24 bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden border border-slate-700/50">
                      <div
                        className="bg-emerald-400 h-full rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, result.similarity * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Content chunk */}
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3.5 rounded-xl border border-slate-900 font-sans">
                  {result.content}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
