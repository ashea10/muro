import { WebSocket } from "ws";
import { prismaClient } from "@repo/db/client";
import { RoomManagerInstance } from "../RoomManager.js";
import { Shape } from "@repo/common/types";

interface User {
    userId: string;
    name: string;
    ws: WebSocket;
}

interface DrawMessage {
    type: "draw";
    roomId: string;
    shape: Shape;
}

export async function handleDraw(message: DrawMessage, user: User): Promise<void> {
    const { shape, roomId } = message;



    // Validate shape has required fields
    if (!shape || !shape.type) {
        console.error("[DRAW] Invalid shape data received");
        return;
    }

    try {
        // Persist shape to database
        await prismaClient.shape.create({
            data: {
                roomId: Number(roomId),
                message: JSON.stringify(shape),
                type: shape.type,
            }
        });



        // Broadcast to OTHER users only (sender already has the shape locally)
        const usersInRoom = RoomManagerInstance.getUsers(roomId);


        RoomManagerInstance.broadcastToOthers(roomId, user.userId, JSON.stringify({
            type: "draw",
            shape
        }));


    } catch (error) {
        console.error("[DRAW] Failed to save shape:", error);
    }
}

interface DeleteMessage {
    type: "delete";
    roomId: string;
    shapeId: string; // This is the shape's UUID, not the database ID
}

export async function handleDelete(message: DeleteMessage, user: User): Promise<void> {
    const { roomId, shapeId } = message;



    try {
        // Find the shape by its JSON message content (which contains the UUID id)
        const shapes = await prismaClient.shape.findMany({
            where: { roomId: Number(roomId) }
        });

        // Find the shape with matching ID in its JSON message
        const shapeToDelete = shapes.find(s => {
            try {
                const parsed = JSON.parse(s.message);
                return parsed.id === shapeId;
            } catch {
                return false;
            }
        });

        if (shapeToDelete) {
            await prismaClient.shape.delete({
                where: { id: shapeToDelete.id }
            });

        } else {

        }

        // Broadcast deletion to all other users
        RoomManagerInstance.broadcastToOthers(roomId, user.userId, JSON.stringify({
            type: "delete",
            shapeId
        }));
    } catch (error) {
        console.error("[DELETE] Failed to delete shape:", error);
    }
}

interface ClearMessage {
    type: "clear";
    roomId: string;
}

export async function handleClear(message: ClearMessage, user: User): Promise<void> {
    const { roomId } = message;



    try {
        await prismaClient.shape.deleteMany({
            where: { roomId: Number(roomId) }
        });

        // Broadcast clear to all other users
        RoomManagerInstance.broadcastToOthers(roomId, user.userId, JSON.stringify({
            type: "clear"
        }));
    } catch (error) {
        console.error("[CLEAR] Failed to clear canvas:", error);
    }
}
