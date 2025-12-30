"use client";
import { motion } from "framer-motion";
import { Zap, Shield, Globe, MousePointer2 } from "lucide-react";

const features = [
    {
        icon: <Zap className="w-6 h-6 text-yellow-400" />,
        title: "Lightning Fast",
        description: "Smooth rendering using Canvas API and efficient WebSocket updates."
    },
    {
        icon: <MousePointer2 className="w-6 h-6 text-purple-400" />,
        title: "Real-time Collaboration",
        description: "See your teammates' cursors and drawings appear instantly."
    },
    {
        icon: <Shield className="w-6 h-6 text-green-400" />,
        title: "Secure",
        description: "JWT authentication and proper session handling."
    },
    {
        icon: <Globe className="w-6 h-6 text-blue-400" />,
        title: "Works Everywhere",
        description: "Deploy with Docker or Kubernetes, run it anywhere."
    }
]

export function Features() {
    return (
        <section className="py-24 bg-black/50">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4">Built for speed</h2>
                    <p className="text-white/60">
                        Engineered for teams that move fast. We&apos;ve optimized every millisecond.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((f, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            viewport={{ once: true }}
                            className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group cursor-default"
                        >
                            <div className="mb-4 p-3 bg-white/5 w-fit rounded-xl group-hover:scale-110 transition-transform">
                                {f.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                            <p className="text-sm text-white/50 leading-relaxed">
                                {f.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
