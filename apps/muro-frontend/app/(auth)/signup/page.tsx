"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRef, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { BACKEND_URL } from "@/config";
import { useAuth } from "@/contexts/AuthContext";

export default function Signup() {
    const nameRef = useRef<HTMLInputElement>(null);
    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { login } = useAuth();

    async function signup() {
        const name = nameRef.current?.value;
        const email = emailRef.current?.value;
        const password = passwordRef.current?.value;

        if (!name || !email || !password) {
            setError("Please fill in all fields");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await axios.post(`${BACKEND_URL}/api/auth/signup`, {
                username: email,
                password,
                name
            });

            // Auto-login after signup
            const res = await axios.post(`${BACKEND_URL}/api/auth/signin`, {
                username: email,
                password
            });
            login(res.data.token);
            router.push("/dashboard");
        } catch {
            setError("Account creation failed. Email may already be in use.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]" />
            </div>

            <Link href="/" className="absolute top-8 left-8 text-white/50 hover:text-white flex items-center gap-2 transition-colors z-20">
                <ArrowLeft className="w-4 h-4" /> Back
            </Link>

            <div className="w-full max-w-md p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl relative z-10 shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Create an account</h1>
                    <p className="text-white/50">Get started with Muro today</p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/70">Full Name</label>
                        <input ref={nameRef} className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 focus:border-purple-500 focus:outline-none transition-colors text-white" placeholder="Elon Musk" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/70">Email</label>
                        <input ref={emailRef} className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 focus:border-purple-500 focus:outline-none transition-colors text-white" placeholder="name@company.com" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/70">Password</label>
                        <input ref={passwordRef} type="password" className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 focus:border-purple-500 focus:outline-none transition-colors text-white" placeholder="••••••••" />
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2">
                            {error}
                        </div>
                    )}

                    <Button onClick={signup} disabled={isLoading} className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold h-10 mt-2 border-0 hover:opacity-90 transition-opacity disabled:opacity-50">
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                Creating account...
                            </div>
                        ) : (
                            "Create Account"
                        )}
                    </Button>
                </div>

                <div className="mt-6 text-center text-sm text-white/40">
                    Already have an account? <Link href="/signin" className="text-purple-400 hover:text-purple-300">Sign In</Link>
                </div>
            </div>
        </div>
    );
}
