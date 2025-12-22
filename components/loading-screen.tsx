"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Progress } from "@/components/ui/progress"

export function LoadingScreen() {
    const [progress, setProgress] = useState(0)
    const [statusText, setStatusText] = useState("INITIALIZING SYSTEM...")

    useEffect(() => {
        // Simulate loading progress
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval)
                    return 100
                }
                // Random increment 
                const increment = Math.random() * 15
                return Math.min(prev + increment, 100)
            })
        }, 200)

        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        // Cycle text based on progress
        if (progress < 30) setStatusText("ESTABLISHING SECURE CONNECTION...")
        else if (progress < 60) setStatusText("VERIFYING BIOMETRICS...")
        else if (progress < 90) setStatusText("LOADING MODULES...")
        else setStatusText("WELCOME, SIR.")
    }, [progress])

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0f172a] text-white overflow-hidden">
            {/* Background Grid Effect */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}>
            </div>

            {/* Central Content */}
            <div className="relative z-10 flex flex-col items-center max-w-md w-full px-8">
                {/* Logo / Arc Reactor Circle */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="mb-12 relative"
                >
                    <div className="w-32 h-32 rounded-full border-4 border-blue-500/30 flex items-center justify-center relative">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 rounded-full border-t-4 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                        />
                        <motion.div
                            animate={{ rotate: -180 }}
                            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-2 rounded-full border-b-4 border-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                        />
                        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <img src="/jarvis-favicon.png" alt="JARVIS" className="w-12 h-12 object-contain opacity-80" />
                        </div>
                    </div>
                </motion.div>

                {/* Progress Bar Container */}
                <div className="w-full space-y-2">
                    <div className="flex justify-between text-xs text-blue-300 font-mono tracking-widest mb-1">
                        <span>LOADING...</span>
                        <span>{Math.round(progress)}%</span>
                    </div>

                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative">
                        <motion.div
                            className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600"
                            initial={{ width: "0%" }}
                            animate={{ width: `${progress}%` }}
                            transition={{ type: "spring", stiffness: 50 }}
                        />
                        {/* Glossy overlay */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                    </div>

                    <motion.div
                        key={statusText}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mt-4 h-6"
                    >
                        <p className="text-sm font-mono text-cyan-400 tracking-wider shadow-blue-500/50 drop-shadow-sm">
                            {statusText}
                            <span className="animate-pulse">_</span>
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Decorative footer text */}
            <div className="absolute bottom-8 text-slate-500 text-[10px] font-mono tracking-[0.2em] opacity-50">
                J.A.R.V.I.S SYSTEM INTEGRATION
            </div>
        </div>
    )
}
