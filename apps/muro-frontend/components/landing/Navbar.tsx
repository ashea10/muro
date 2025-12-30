"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Pencil } from "lucide-react";

export function Navbar() {
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md border-b border-white/10 bg-black/20"
    >
      <div className="flex items-center gap-2">
        <div className="bg-gradient-to-tr from-purple-500 to-blue-500 p-2 rounded-lg">
          <Pencil className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
          Muro
        </span>
      </div>

      <div className="flex items-center gap-6">
        <Link href="/signin" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
          Sign In
        </Link>
        <Link href="/signup" className="px-4 py-2 bg-white text-black rounded-full text-sm font-bold hover:bg-white/90 transition-all">
          Get Started
        </Link>
      </div>
    </motion.nav>
  );
}
