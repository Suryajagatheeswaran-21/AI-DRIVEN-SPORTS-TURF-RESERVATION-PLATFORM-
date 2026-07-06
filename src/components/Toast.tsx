import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { ToastMessage } from "../types";

interface ToastProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export default function Toast({ toasts, onClose }: ToastProps) {
  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isSuccess = toast.type === "success";
          const isError = toast.type === "error";

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
              className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-lg bg-slate-900/90"
              style={{
                borderColor: isSuccess 
                  ? "rgba(16, 185, 129, 0.3)" 
                  : isError 
                    ? "rgba(239, 68, 68, 0.3)" 
                    : "rgba(59, 130, 246, 0.3)",
              }}
            >
              <div className="mt-0.5">
                {isSuccess && <CheckCircle className="h-5 w-5 text-emerald-400" />}
                {isError && <AlertCircle className="h-5 w-5 text-red-400" />}
                {!isSuccess && !isError && <Info className="h-5 w-5 text-blue-400" />}
              </div>

              <div className="flex-1 text-sm text-slate-100 font-medium">
                {toast.message}
              </div>

              <button
                onClick={() => onClose(toast.id)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
