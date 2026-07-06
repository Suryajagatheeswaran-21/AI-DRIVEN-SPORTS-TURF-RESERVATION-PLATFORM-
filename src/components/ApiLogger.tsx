import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Terminal, ChevronUp, ChevronDown, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { ApiLog } from "../types";

interface ApiLoggerProps {
  logs: ApiLog[];
  onClear: () => void;
}

export default function ApiLogger({ logs, onClear }: ApiLoggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800 shadow-2xl backdrop-blur-md">
      {/* Header Bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-6 py-2.5 cursor-pointer hover:bg-slate-800/40 transition-colors border-b border-slate-800/60"
      >
        <div className="flex items-center gap-2.5 text-xs font-mono">
          <Terminal className="h-4 w-4 text-emerald-400" />
          <span className="font-bold text-slate-200">Spring Boot REST API Network Logs</span>
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold animate-pulse">
            Active Hook
          </span>
          <span className="text-slate-500 hidden sm:inline">| Tracks local network API contract handshakes</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-800 px-2 py-0.5 rounded border border-slate-800 font-mono"
          >
            Clear Log
          </button>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Drawer Logs Stream */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: 240 }}
            exit={{ height: 0 }}
            className="overflow-y-auto px-6 py-3 font-mono text-[11px] space-y-2.5 bg-slate-950"
          >
            {logs.length === 0 ? (
              <div className="text-slate-500 py-10 text-center">
                No outbound REST API requests captured yet. Perform user bookings, log in, or review fields to trigger contract.
              </div>
            ) : (
              logs.map((log) => {
                const isSuccess = log.status < 400;
                return (
                  <div key={log.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 flex flex-col gap-2">
                    {/* Log status line */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-400">[{log.timestamp}]</span>
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          log.method === "POST" 
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" 
                            : log.method === "DELETE"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        }`}>
                          {log.method}
                        </span>
                        <span className="text-slate-200 font-semibold">{log.url}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-bold">
                        {isSuccess ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {log.status} OK
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {log.status} Blocked
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Payloads details grids */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-800/40">
                      {log.requestBody && (
                        <div>
                          <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Request JSON:</div>
                          <pre className="p-2 bg-slate-950 rounded border border-slate-800/40 text-[10px] text-cyan-300 overflow-x-auto whitespace-pre-wrap">
                            {log.requestBody}
                          </pre>
                        </div>
                      )}
                      {log.responseBody && (
                        <div className={log.requestBody ? "" : "col-span-2"}>
                          <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Response JSON Payload:</div>
                          <pre className="p-2 bg-slate-950 rounded border border-slate-800/40 text-[10px] text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                            {log.responseBody}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
