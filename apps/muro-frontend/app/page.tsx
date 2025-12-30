import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white selection:bg-purple-500/30">
      <Navbar />
      <Hero />
      <Features />

      {/* Simple Footer */}
      <footer className="py-8 border-t border-white/10 text-center text-white/40 text-sm">
        <p>© 2025 Muro Inc. All rights reserved.</p>
      </footer>
    </main>
  );
}
