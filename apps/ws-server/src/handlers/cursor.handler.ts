import { WebSocket } from "ws";
import { RoomManagerInstance } from "../RoomManager.js";

interface User {
    userId: string;
    name: string;
    ws: WebSocket;
}

interface CursorMessage {
    type: "cursor";
    roomId: string;
    x: number;
    y: number;
}

export function handleCursor(message: CursorMessage, user: User): void {
    const { roomId, x, y } = message;

    // Broadcast cursor position to other users in the room
    RoomManagerInstance.broadcastToOthers(roomId, user.userId, JSON.stringify({
        type: "cursor",
        userId: user.userId,
        name: user.name,
        x,
        y
    }));
}
