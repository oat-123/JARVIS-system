"use client"

import React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Power } from "lucide-react"

interface StartScreenProps {
    onStart: () => void
}

export function StartScreen({ onStart }: StartScreenProps) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0f172a] text-white overflow-hidden">
            {/* Background with subtle grid info */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}>
            </div>

            {/* Central Interactive Element */}
            <div className="relative z-10 flex flex-col items-center gap-12">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1 }}
                    className="relative"
                >
                    <div className="w-48 h-48 rounded-full border border-blue-500/20 flex items-center justify-center relative animate-[spin_10s_linear_infinite]">
                        <div className="absolute inset-0 border-t border-cyan-400/50 rounded-full" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-40 h-40 rounded-full border-4 border-blue-500/10 shadow-[0_0_50px_rgba(59,130,246,0.2)] flex items-center justify-center backdrop-blur-sm">
                            <img src="/jarvis-favicon.png" alt="JARVIS" className="w-20 h-20 object-contain opacity-90 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <Button
                        onClick={onStart}
                        className="group relative px-12 py-8 bg-transparent hover:bg-blue-500/10 border border-blue-500/50 hover:border-cyan-400 text-blue-100 uppercase tracking-[0.2em] transition-all duration-300 overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center gap-4 text-xl font-light">
                            <Power className="w-6 h-6 text-cyan-400 group-hover:text-white transition-colors" />
                            Initialize
                        </span>

                        {/* Button Hover Glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-400/10 to-blue-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    </Button>

                    <p className="mt-6 text-center text-[10px] text-slate-500 font-mono tracking-widest uppercase opacity-60">
                        Touch to Access System
                    </p>
                </motion.div>
            </div>
        </div>
    )
}
