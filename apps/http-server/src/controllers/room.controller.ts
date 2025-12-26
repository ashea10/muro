import { Request, Response } from "express";
import { CreateRoomSchema } from "@repo/common/types";
import { roomService } from "../services/room.service.js";
import { asyncHandler, BadRequestError } from "../middleware/errorHandler.js";
import logger from "../utils/logger.js";

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
    const parsedData = CreateRoomSchema.safeParse(req.body);

    if (!parsedData.success) {
        logger.warn("Room creation validation failed", { errors: parsedData.error.issues });
        throw new BadRequestError("Invalid input: " + parsedData.error.issues[0]?.message);
    }

    const userId = req.userId;
    if (!userId) {
        throw new BadRequestError("User ID not found");
    }

    const result = await roomService.createRoom({
        name: parsedData.data.name,
        adminId: userId
    });

    logger.info("Room created successfully", { roomId: result.roomId, userId });

    res.status(201).json({
        success: true,
        roomId: result.roomId
    });
});

export const getRoomBySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;

    if (!slug) {
        throw new BadRequestError("Room slug is required");
    }

    const room = await roomService.getRoomBySlug(slug);

    res.json({
        success: true,
        room
    });
});

export const getRoomById = asyncHandler(async (req: Request, res: Response) => {
    const roomId = parseInt(req.params.roomId || "", 10);

    if (isNaN(roomId)) {
        throw new BadRequestError("Invalid room ID");
    }

    const room = await roomService.getRoomById(roomId);

    res.json({
        success: true,
        room
    });
});

export const getUserRooms = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId;

    if (!userId) {
        throw new BadRequestError("User ID not found");
    }

    const rooms = await roomService.getUserRooms(userId);

    res.json({
        success: true,
        rooms
    });
});

export const deleteRoom = asyncHandler(async (req: Request, res: Response) => {
    const roomId = parseInt(req.params.roomId || "", 10);
    const userId = req.userId;

    if (isNaN(roomId)) {
        throw new BadRequestError("Invalid room ID");
    }

    if (!userId) {
        throw new BadRequestError("User ID not found");
    }

    await roomService.deleteRoom(roomId, userId);

    logger.info("Room deleted successfully", { roomId, userId });

    res.json({
        success: true,
        message: "Room deleted successfully"
    });
});


