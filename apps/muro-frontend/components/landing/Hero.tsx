"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Hero() {
    return (
        <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20">

            {/* Background Gradients */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-purple-500/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="container px-4 md:px-6 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-purple-200 mb-6 inline-block backdrop-blur-sm">
                        v2.0 is now live
                    </span>
                    <h1 className="text-5xl md:text-8xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">
                        Think better, <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
                            together.
                        </span>
                    </h1>
                    <p className="max-w-[600px] mx-auto text-lg text-white/60 mb-8 leading-relaxed">
                        A collaborative whiteboard where you can draw and brainstorm with your team in real-time.
                    </p>

                    <div className="flex items-center justify-center gap-4">
                        <Link href="/signup" className="group relative px-8 py-4 bg-white text-black rounded-full font-bold text-lg overflow-hidden transition-all hover:scale-105 active:scale-95">
                            <span className="relative z-10 flex items-center gap-2">
                                Start Drawing <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 opacity-0 group-hover:opacity-10 transition-opacity" />
                        </Link>
                        <Link href="/demo" className="px-8 py-4 rounded-full font-bold text-lg text-white border border-white/10 hover:bg-white/5 transition-all">
                            View Demo
                        </Link>
                    </div>
                </motion.div>

                {/* Pseudo-UI / Screenshot area */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 1 }}
                    className="mt-20 mx-auto max-w-5xl rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-2xl overflow-hidden aspect-video relative group"
                >
                    <div className="absolute inset-x-0 top-0 h-12 border-b border-white/10 flex items-center px-4 gap-2 bg-black/20">
                        <div className="w-3 h-3 rounded-full bg-red-500/50" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                        <div className="w-3 h-3 rounded-full bg-green-500/50" />
                    </div>

                    {/* Abstract Shapes illustrating the app */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="w-32 h-32 rounded-xl border-2 border-purple-500/50 bg-purple-500/10 animate-pulse" />
                            <div className="w-32 h-32 rounded-full border-2 border-blue-500/50 bg-blue-500/10" />
                        </div>
                    </div>

                    {/* Cursor Animation */}
                    <motion.div
                        animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
                        transition={{ duration: 5, repeat: Infinity }}
                        className="absolute top-1/3 left-1/3"
                    >
                        <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[20px] border-b-white -rotate-12 drop-shadow-lg" />
                        <div className="ml-2 mt-1 px-2 py-1 bg-purple-500 rounded-lg text-[10px] font-bold">Elon</div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
