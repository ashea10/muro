"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { Plus, LogOut, Loader2, Users, Clock, ChevronRight, Trash2, LayoutGrid, Shapes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BACKEND_URL } from "@/config";

interface Room {
    id: number;
    slug: string;
    createdAt: string;
    shapeCount?: number;
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
}

function DashboardContent() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRoomName, setNewRoomName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    const { user, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        fetchRooms();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    async function fetchRooms() {
        if (!user?.token) {
            setIsLoading(false);
            return;
        }

        try {
            const res = await axios.get(`${BACKEND_URL}/api/room/my-rooms`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setRooms(res.data.rooms || []);
        } catch {
            console.error("Failed to fetch rooms");
            // Fallback: rooms list stays empty
        } finally {
            setIsLoading(false);
        }
    }

    async function createRoom() {
        if (!newRoomName.trim()) {
            setError("Room name is required");
            return;
        }

        if (newRoomName.length < 3) {
            setError("Room name must be at least 3 characters");
            return;
        }

        setIsCreating(true);
        setError(null);

        try {
            const res = await axios.post(
                `${BACKEND_URL}/api/room`,
                { name: newRoomName },
                { headers: { Authorization: `Bearer ${user?.token}` } }
            );

            router.push(`/room/${res.data.roomId}`);
        } catch (e: unknown) {
            if (axios.isAxiosError(e) && e.response?.status === 409) {
                setError("A room with this name already exists");
            } else {
                setError("Failed to create room. Please try again.");
            }
        } finally {
            setIsCreating(false);
        }
    }

    async function deleteRoom(roomId: number) {
        try {
            await axios.delete(`${BACKEND_URL}/api/room/${roomId}`, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            setRooms(prev => prev.filter(r => r.id !== roomId));
            setDeleteConfirm(null);
        } catch {
            console.error("Failed to delete room");
        }
    }

    async function joinRoom(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const input = formData.get("roomSlug") as string;
        const trimmedInput = input.trim();

        if (!trimmedInput) return;

        try {
            let res;
            // Check if input is a valid number (Room ID)
            if (!isNaN(Number(trimmedInput))) {
                res = await axios.get(`${BACKEND_URL}/api/room/${trimmedInput}`);
            } else {
                // Assume it's a slug
                res = await axios.get(`${BACKEND_URL}/api/room/slug/${trimmedInput}`);
            }

            if (res.data.room) {
                router.push(`/room/${res.data.room.id}`);
            } else {
                setError("Room not found");
            }
        } catch {
            setError("Room not found");
        }
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Background Gradients */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]" />
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-white/10 bg-black/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
                            Muro
                        </Link>
                        <Button
                            variant="ghost"
                            onClick={logout}
                            className="text-white/70 hover:text-white hover:bg-white/10"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Your Workspace</h1>
                    <p className="text-white/50">Create or join collaborative whiteboards</p>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Create New Room Card */}
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="group p-6 rounded-2xl border border-dashed border-white/20 hover:border-purple-500/50 bg-white/5 hover:bg-purple-500/5 transition-all flex flex-col items-center justify-center min-h-[200px] cursor-pointer"
                        >
                            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Plus className="w-6 h-6 text-purple-400" />
                            </div>
                            <span className="text-lg font-medium mb-1">Create New Board</span>
                            <span className="text-sm text-white/50">Start a fresh canvas</span>
                        </button>

                        {/* Join Room Card */}
                        <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm min-h-[200px]">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-medium">Join a Board</h3>
                                    <p className="text-sm text-white/50">Enter room slug or ID to join</p>
                                </div>
                            </div>
                            <form onSubmit={joinRoom} className="space-y-3">
                                <input
                                    name="roomSlug"
                                    type="text"
                                    placeholder="Room slug (e.g. project-x-123) or ID..."
                                    className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors text-white text-sm"
                                />
                                <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white h-9">
                                    <ChevronRight className="w-4 h-4 mr-1" />
                                    Join Room
                                </Button>
                            </form>
                        </div>

                        {/* User's Existing Rooms */}
                        {rooms.map((room) => (
                            <div
                                key={room.id}
                                className="group p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm min-h-[200px] hover:border-purple-500/30 transition-all relative"
                            >
                                {/* Delete confirmation overlay */}
                                {deleteConfirm === room.id && (
                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-10 p-4">
                                        <p className="text-white mb-4 text-center">Delete &quot;{room.slug}&quot;?</p>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setDeleteConfirm(null)}
                                                className="text-white/70"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => deleteRoom(room.id)}
                                                className="bg-red-500 hover:bg-red-600"
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                                            <LayoutGrid className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium">{room.slug}</h3>
                                            <p className="text-xs text-white/50 flex items-center gap-1">
                                                ID: {room.id} • <Clock className="w-3 h-3" />
                                                {formatDate(room.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setDeleteConfirm(room.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                {room.shapeCount !== undefined && (
                                    <div className="flex items-center gap-2 text-sm text-white/50 mb-4">
                                        <Shapes className="w-4 h-4" />
                                        {room.shapeCount} {room.shapeCount === 1 ? "shape" : "shapes"}
                                    </div>
                                )}

                                <Link
                                    href={`/room/${room.id}`}
                                    className="mt-auto flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-white/5 hover:bg-purple-500/20 text-white/70 hover:text-white transition-all text-sm font-medium"
                                >
                                    Open Board
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                        ))}

                        {/* Empty state when no rooms */}
                        {rooms.length === 0 && (
                            <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm min-h-[200px]">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium">Recent Activity</h3>
                                        <p className="text-sm text-white/50">Your recent boards</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center justify-center py-6 text-white/30 text-sm">
                                    <p>No boards yet.</p>
                                    <p>Create one to get started!</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Create Room Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => { setShowCreateModal(false); setError(null); }}
                    />
                    <div className="relative bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Create New Board</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-white/70 block mb-2">Board Name</label>
                                <input
                                    type="text"
                                    value={newRoomName}
                                    onChange={(e) => setNewRoomName(e.target.value)}
                                    placeholder="e.g., Project Brainstorm"
                                    className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 focus:border-purple-500 focus:outline-none transition-colors text-white"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            createRoom();
                                        }
                                    }}
                                />
                            </div>

                            {error && (
                                <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <Button
                                    variant="ghost"
                                    onClick={() => { setShowCreateModal(false); setError(null); setNewRoomName(""); }}
                                    className="flex-1 text-white/70 hover:text-white"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={createRoom}
                                    disabled={isCreating}
                                    className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90"
                                >
                                    {isCreating ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <Plus className="w-4 h-4 mr-2" />
                                    )}
                                    Create
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Dashboard() {
    return (
        <ProtectedRoute>
            <DashboardContent />
        </ProtectedRoute>
    );
}
