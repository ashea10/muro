"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface User {
    token: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(() => {
        // Initialize from localStorage on first render (client-side only)
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("token");
            return token ? { token } : null;
        }
        return null;
    });
    const [isLoading] = useState(false);
    const router = useRouter();

    const login = (token: string) => {
        localStorage.setItem("token", token);
        setUser({ token });
    };

    const logout = () => {
        localStorage.removeItem("token");
        setUser(null);
        router.push("/signin");
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
