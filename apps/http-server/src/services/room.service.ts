import { prismaClient } from "@repo/db/client";
import { ConflictError, NotFoundError } from "../middleware/errorHandler.js";

export interface CreateRoomInput {
    name: string;
    adminId: string;
}

export interface RoomWithShapes {
    id: number;
    slug: string;
    createdAt: Date;
    adminId: string;
    shapes: Array<{
        id: number;
        type: string;
        message: string;
    }>;
}

export class RoomService {
    async createRoom(input: CreateRoomInput): Promise<{ roomId: number }> {
        const { name, adminId } = input;

        // Slug generation logic could be moved to a util if needed
        const slug = name.toLowerCase().replace(/ /g, "-") + "-" + Math.random().toString(36).substring(2, 9);

        const room = await prismaClient.room.create({
            data: {
                slug,
                name: name,
                adminId
            }
        });

        return { roomId: room.id };
    }

    async getRoomBySlug(slug: string): Promise<RoomWithShapes | null> {
        const room = await prismaClient.room.findFirst({
            where: { slug },
            include: {
                shapes: {
                    orderBy: { id: "asc" }
                }
            }
        });

        return room;
    }

    async getRoomById(roomId: number): Promise<RoomWithShapes> {
        const room = await prismaClient.room.findFirst({
            where: { id: roomId },
            include: {
                shapes: {
                    orderBy: { id: "asc" }
                }
            }
        });

        if (!room) {
            throw new NotFoundError("Room not found");
        }

        return room;
    }

    async getUserRooms(userId: string) {
        const rooms = await prismaClient.room.findMany({
            where: { adminId: userId },
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: { shapes: true }
                }
            }
        });

        return rooms.map(room => ({
            id: room.id,
            slug: room.slug,
            createdAt: room.createdAt,
            shapeCount: room._count.shapes
        }));
    }

    async deleteRoom(roomId: number, userId: string): Promise<void> {
        const room = await prismaClient.room.findFirst({
            where: { id: roomId }
        });

        if (!room) {
            throw new NotFoundError("Room not found");
        }

        if (room.adminId !== userId) {
            throw new NotFoundError("Room not found"); // Don't reveal room exists
        }

        // Delete shapes first (due to foreign key)
        await prismaClient.shape.deleteMany({
            where: { roomId }
        });



        // Delete room
        await prismaClient.room.delete({
            where: { id: roomId }
        });
    }


}

export const roomService = new RoomService();
