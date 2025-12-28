import { WebSocketServer, WebSocket } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { prismaClient } from "@repo/db/client";
import { RoomManagerInstance } from "./RoomManager.js";
import { handleDraw, handleDelete, handleClear } from "./handlers/draw.handler.js";
import { handleJoinRoom, handleLeaveRoom } from "./handlers/room.handler.js";
import { handleCursor } from "./handlers/cursor.handler.js";

const PORT = parseInt(process.env.WS_PORT || "8080", 10);
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CLIENT_TIMEOUT = 35000; // 35 seconds

const wss = new WebSocketServer({ port: PORT });

interface ExtendedWebSocket extends WebSocket {
    isAlive: boolean;
    userId?: string;
    currentRoomId?: string;
}

interface User {
    userId: string;
    name: string;
    ws: WebSocket;
}

function checkUser(token: string): string | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        if (!decoded || !decoded.userId) {
            return null;
        }
        return decoded.userId;
    } catch (e) {
        return null;
    }
}

// Heartbeat interval to detect dead connections
const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        const extWs = ws as ExtendedWebSocket;
        if (extWs.isAlive === false) {

            return ws.terminate();
        }
        extWs.isAlive = false;
        ws.ping();
    });
}, HEARTBEAT_INTERVAL);

wss.on("close", () => {
    clearInterval(heartbeatInterval);
});

wss.on("connection", async (ws: ExtendedWebSocket, req) => {
    const url = req.url;

    if (!url) {
        ws.close(1008, "Missing URL");
        return;
    }

    const queryParams = new URLSearchParams(url.split("?")[1]);
    const token = queryParams.get("token") ?? "";

    const userId = checkUser(token);
    if (!userId) {
        ws.close(1008, "Invalid token");
        return;
    }

    // Buffer messages while we await the user from DB
    const messageQueue: any[] = [];
    const queueHandler = (data: any) => {
        messageQueue.push(data);
    };
    ws.on("message", queueHandler);

    const userFromDb = await prismaClient.user.findUnique({
        where: { id: userId },
    });

    if (!userFromDb) {
        ws.close(1008, "User not found");
        return;
    }

    // Setup connection properties
    ws.isAlive = true;
    ws.userId = userId;

    const user: User = {
        userId,
        name: userFromDb.name,
        ws
    };



    // Handle pong responses for heartbeat
    ws.on("pong", () => {
        ws.isAlive = true;
    });

    // Remove the queue handler and set up the main message handler
    ws.removeListener("message", queueHandler);

    ws.on("message", async (data) => {
        let parsedData;

        try {
            if (typeof data !== "string") {
                parsedData = JSON.parse(data.toString());
            } else {
                parsedData = JSON.parse(data);
            }
        } catch (e) {
            console.error("Failed to parse message:", e);
            return;
        }

        try {


            switch (parsedData.type) {
                case "join_room":

                    // Force string type for Map keys
                    parsedData.roomId = String(parsedData.roomId);
                    ws.currentRoomId = parsedData.roomId;
                    handleJoinRoom(parsedData, user);
                    break;

                case "leave_room":
                    ws.currentRoomId = undefined;
                    handleLeaveRoom(parsedData, user);
                    break;

                case "cursor":
                    handleCursor(parsedData, user);
                    break;



                case "draw":
                    parsedData.roomId = String(parsedData.roomId);
                    await handleDraw(parsedData, user);
                    break;

                case "delete":
                    parsedData.roomId = String(parsedData.roomId);
                    await handleDelete(parsedData, user);
                    break;

                case "clear":
                    parsedData.roomId = String(parsedData.roomId);
                    await handleClear(parsedData, user);
                    break;

                default:
                    console.warn("Unknown message type:", parsedData.type);
            }
        } catch (error) {
            console.error("Error handling message:", error);
        }
    });

    ws.on("close", () => {


        // Remove user from their room
        if (ws.currentRoomId) {
            RoomManagerInstance.removeUser(ws.currentRoomId, user);
        }
    });

    ws.on("error", (error) => {
        console.error(`WebSocket error for user ${userId}:`, error);
    });

    // Process any messages that were buffered during authentication
    for (const data of messageQueue) {
        ws.emit("message", data);
    }
});



console.log(`WebSocket server running on port ${PORT}`);
