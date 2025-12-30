"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Game } from "@repo/common/draw";
import { Tool, Shape, Viewport } from "@repo/common/types";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { WS_URL, BACKEND_URL } from "@/config";
import {
    ArrowLeft,
    Square,
    Circle,
    Pencil,
    Minus,
    ArrowUpRight,
    Type,
    StickyNote,
    Eraser,
    MousePointer,
    Move,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Download,
    Trash2,
    Undo,
    Redo
} from "lucide-react";
import Link from "next/link";
import axios from "axios";

interface GameWithResize extends Game {
    _resizeListener?: () => void;
}

interface RoomCanvasProps {
    roomId: string;
}

interface Cursor {
    userId: string;
    name: string;
    x: number;
    y: number;
    lastUpdated: number;
}

const CURSOR_COLORS = [
    "#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#06B6D4",
];

const STROKE_COLORS = [
    "#FFFFFF", "#EF4444", "#F59E0B", "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899", "#06B6D4"
];

const TOOLS: { tool: Tool; icon: React.ReactNode; label: string }[] = [
    { tool: "select", icon: <MousePointer className="w-4 h-4" />, label: "Select" },
    { tool: "rect", icon: <Square className="w-4 h-4" />, label: "Rectangle" },
    { tool: "circle", icon: <Circle className="w-4 h-4" />, label: "Circle" },
    { tool: "line", icon: <Minus className="w-4 h-4" />, label: "Line" },
    { tool: "arrow", icon: <ArrowUpRight className="w-4 h-4" />, label: "Arrow" },
    { tool: "pencil", icon: <Pencil className="w-4 h-4" />, label: "Pencil" },
    { tool: "text", icon: <Type className="w-4 h-4" />, label: "Text" },
    { tool: "sticky", icon: <StickyNote className="w-4 h-4" />, label: "Sticky Note" },
    { tool: "eraser", icon: <Eraser className="w-4 h-4" />, label: "Eraser" },
    { tool: "pan", icon: <Move className="w-4 h-4" />, label: "Pan" },
];

function getCursorColor(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export function RoomCanvas({ roomId }: RoomCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const [game, setGame] = useState<Game | null>(null);
    const [connecting, setConnecting] = useState(true);
    const [selectedTool, setSelectedTool] = useState<Tool>("rect");
    const [selectedColor, setSelectedColor] = useState("#FFFFFF");
    const [cursors, setCursors] = useState<Map<string, Cursor>>(new Map());
    const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
    const [selectedCount, setSelectedCount] = useState(0);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const router = useRouter();
    const { user } = useAuth();

    // Update game tool
    useEffect(() => {
        if (game) {
            game.setTool(selectedTool);
        }
    }, [selectedTool, game]);

    // Update game color
    useEffect(() => {
        if (game) {
            game.setColor(selectedColor);
        }
    }, [selectedColor, game]);

    // Throttled cursor position sender
    const sendCursor = useCallback((x: number, y: number) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: "cursor",
                roomId,
                x,
                y
            }));
        }
    }, [roomId]);

    // WebSocket connection
    useEffect(() => {
        const token = user?.token || localStorage.getItem("token");
        if (!token) {
            router.push("/signin");
            return;
        }

        if (!canvasRef.current) return;

        let activeGame: Game | null = null;
        const ws = new WebSocket(`${WS_URL}?token=${token}`);
        wsRef.current = ws;

        ws.onopen = async () => {
            setConnecting(false);


            ws.send(JSON.stringify({
                type: "join_room",
                roomId: roomId
            }));


            if (canvasRef.current) {
                const g = new Game(canvasRef.current, roomId, ws, {
                    backgroundColor: "#0a0a0a",
                    showGrid: false
                });
                activeGame = g;

                // Set up callbacks
                g.onViewportChange = (vp) => setViewport(vp);
                g.onSelectionChange = (ids) => setSelectedCount(ids.length);
                g.onToolChange = (tool) => setSelectedTool(tool);

                setGame(g);

                // Fetch existing shapes
                try {
                    const res = await axios.get(`${BACKEND_URL}/api/room/${roomId}`);
                    if (res.data.room?.shapes) {
                        const shapes: Shape[] = res.data.room.shapes.map((s: { message: string }) =>
                            JSON.parse(s.message)
                        );
                        g.setShapes(shapes);
                    }
                } catch (e) {
                    console.error("Failed to load existing shapes", e);
                }

                const resize = () => {
                    if (canvasRef.current) {
                        canvasRef.current.width = window.innerWidth;
                        canvasRef.current.height = window.innerHeight;
                        g.render();
                    }
                };
                window.addEventListener("resize", resize);
                resize();

                // Store resize listener for cleanup
                (g as GameWithResize)._resizeListener = resize;
            }
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                if (message.type === "cursor") {
                    setCursors(prev => {
                        const next = new Map(prev);
                        next.set(message.userId, {
                            userId: message.userId,
                            name: message.name,
                            x: message.x,
                            y: message.y,
                            lastUpdated: Date.now()
                        });
                        return next;
                    });
                }

                if (message.type === "user_left") {
                    setCursors(prev => {
                        const next = new Map(prev);
                        next.delete(message.userId);
                        return next;
                    });
                }

                if (message.type === "room_users") {
                    message.users.forEach((u: { userId: string; name: string }) => {
                        setCursors(prev => {
                            const next = new Map(prev);
                            if (!next.has(u.userId)) {
                                next.set(u.userId, {
                                    userId: u.userId,
                                    name: u.name,
                                    x: -100,
                                    y: -100,
                                    lastUpdated: Date.now()
                                });
                            }
                            return next;
                        });
                    });
                }
            } catch {
                // Game class handles draw/delete/clear messages
            }
        };

        return () => {
            if (activeGame) {
                activeGame.destroy();
                if ((activeGame as GameWithResize)._resizeListener) {
                    window.removeEventListener("resize", (activeGame as GameWithResize)._resizeListener!);
                }
            }
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
        };
    }, [roomId, router, user]);

    // Mouse move handler for cursor broadcasting
    useEffect(() => {
        let lastSent = 0;
        const throttleMs = 50;

        const handleMouseMove = (e: MouseEvent) => {
            const now = Date.now();
            if (now - lastSent > throttleMs) {
                sendCursor(e.clientX, e.clientY);
                lastSent = now;
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [sendCursor]);

    // Clean up stale cursors
    useEffect(() => {
        const interval = setInterval(() => {
            const staleThreshold = 5000;
            setCursors(prev => {
                const next = new Map(prev);
                const now = Date.now();
                next.forEach((cursor, id) => {
                    if (now - cursor.lastUpdated > staleThreshold) {
                        next.delete(id);
                    }
                });
                return next;
            });
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    // Update undo/redo state periodically
    useEffect(() => {
        const interval = setInterval(() => {
            if (game) {
                setCanUndo(game.canUndo());
                setCanRedo(game.canRedo());
            }
        }, 500);
        return () => clearInterval(interval);
    }, [game]);

    // Export handlers
    const handleExportPNG = () => {
        if (!game) return;
        const dataUrl = game.exportToPNG();
        const link = document.createElement("a");
        link.download = `muro-canvas-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
    };

    const handleExportSVG = () => {
        if (!game) return;
        const svg = game.exportToSVG();
        const blob = new Blob([svg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `muro-canvas-${Date.now()}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden">
            {/* Header with back button */}
            <div className="absolute top-4 left-4 z-20">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-white/70 hover:text-white hover:bg-zinc-800 transition-all backdrop-blur-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm">Back</span>
                </Link>
            </div>

            {/* Main Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 border border-zinc-800 p-2 rounded-xl flex gap-1 shadow-xl z-10 backdrop-blur-sm items-center">
                {/* Tools */}
                {TOOLS.map(({ tool, icon, label }) => (
                    <button
                        key={tool}
                        onClick={() => setSelectedTool(tool)}
                        className={`p-2 rounded-lg transition-all ${selectedTool === tool
                            ? "bg-purple-500/30 text-purple-300 ring-1 ring-purple-500/50"
                            : "text-white/70 hover:text-white hover:bg-white/10"
                            }`}
                        title={label}
                    >
                        {icon}
                    </button>
                ))}

                {/* Divider */}
                <div className="w-px h-6 bg-white/20 mx-1" />

                {/* Color swatches */}
                <div className="flex gap-1">
                    {STROKE_COLORS.map((color) => (
                        <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${selectedColor === color ? "border-white scale-110" : "border-transparent"
                                }`}
                            style={{ backgroundColor: color }}
                            title={color}
                        />
                    ))}
                </div>

                {/* Divider */}
                <div className="w-px h-6 bg-white/20 mx-1" />

                {/* Undo/Redo */}
                <button
                    onClick={() => game?.undo()}
                    disabled={!canUndo}
                    className={`p-2 rounded-lg transition-all ${canUndo ? "text-white/70 hover:text-white hover:bg-white/10" : "text-white/30 cursor-not-allowed"
                        }`}
                    title="Undo (Ctrl+Z)"
                >
                    <Undo className="w-4 h-4" />
                </button>
                <button
                    onClick={() => game?.redo()}
                    disabled={!canRedo}
                    className={`p-2 rounded-lg transition-all ${canRedo ? "text-white/70 hover:text-white hover:bg-white/10" : "text-white/30 cursor-not-allowed"
                        }`}
                    title="Redo (Ctrl+Y)"
                >
                    <Redo className="w-4 h-4" />
                </button>

                {/* Delete selected */}
                {selectedCount > 0 && (
                    <>
                        <div className="w-px h-6 bg-white/20 mx-1" />
                        <button
                            onClick={() => game?.deleteSelected()}
                            className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                            title="Delete selected"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>

            {/* Zoom Controls */}
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
                <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 rounded-lg p-1 backdrop-blur-sm">
                    <button
                        onClick={() => game?.zoomOut()}
                        className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        title="Zoom out"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-white/70 text-sm px-2 min-w-[60px] text-center">
                        {Math.round(viewport.scale * 100)}%
                    </span>
                    <button
                        onClick={() => game?.zoomIn()}
                        className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        title="Zoom in"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => game?.resetView()}
                        className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        title="Reset view"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Export Menu */}
            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
                <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 rounded-lg p-1 backdrop-blur-sm">
                    <button
                        onClick={handleExportPNG}
                        className="px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all text-sm flex items-center gap-2"
                        title="Export as PNG"
                    >
                        <Download className="w-4 h-4" />
                        PNG
                    </button>
                    <button
                        onClick={handleExportSVG}
                        className="px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all text-sm flex items-center gap-2"
                        title="Export as SVG"
                    >
                        <Download className="w-4 h-4" />
                        SVG
                    </button>
                </div>
            </div>

            {/* Online users indicator */}
            {cursors.size > 0 && (
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/80 border border-zinc-800 backdrop-blur-sm">
                    <div className="flex -space-x-2">
                        {Array.from(cursors.values()).slice(0, 4).map((cursor) => (
                            <div
                                key={cursor.userId}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-zinc-900"
                                style={{ backgroundColor: getCursorColor(cursor.userId) }}
                            >
                                {cursor.name.charAt(0).toUpperCase()}
                            </div>
                        ))}
                        {cursors.size > 4 && (
                            <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-medium text-white border-2 border-zinc-900">
                                +{cursors.size - 4}
                            </div>
                        )}
                    </div>
                    <span className="text-xs text-white/50">{cursors.size} online</span>
                </div>
            )}

            {connecting && (
                <div className="absolute inset-0 flex items-center justify-center text-white/50 z-20 pointer-events-none">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-white/20 border-t-purple-500 rounded-full animate-spin" />
                        <span>Connecting to server...</span>
                    </div>
                </div>
            )}

            {/* Other users' cursors */}
            {Array.from(cursors.values()).map((cursor) => (
                cursor.x >= 0 && cursor.y >= 0 && (
                    <div
                        key={cursor.userId}
                        className="absolute pointer-events-none z-30 transition-all duration-75 ease-out"
                        style={{
                            left: cursor.x,
                            top: cursor.y,
                            transform: "translate(-2px, -2px)"
                        }}
                    >
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
                        >
                            <path
                                d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.86a.5.5 0 0 0-.85.35Z"
                                fill={getCursorColor(cursor.userId)}
                                stroke="white"
                                strokeWidth="1.5"
                            />
                        </svg>
                        <div
                            className="absolute left-4 top-4 px-2 py-0.5 rounded text-[11px] font-medium text-white whitespace-nowrap"
                            style={{
                                backgroundColor: getCursorColor(cursor.userId),
                                boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
                            }}
                        >
                            {cursor.name}
                        </div>
                    </div>
                )
            ))}

            <canvas
                ref={canvasRef}
                className="block touch-none"
            />
        </div>
    );
}
