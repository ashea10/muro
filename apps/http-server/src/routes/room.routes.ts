import { Router, IRouter } from "express";
import {
    createRoom,
    getRoomBySlug,
    getRoomById,
    getUserRooms,
    deleteRoom,

} from "../controllers/room.controller.js";
import { middleware } from "../middleware/auth.js";
import { createRoomLimiter } from "../middleware/rateLimiter.js";

const router: IRouter = Router();

// Protected routes
router.post("/", middleware, createRoomLimiter, createRoom);
router.get("/my-rooms", middleware, getUserRooms);
router.delete("/:roomId", middleware, deleteRoom);

// Public routes (room must be accessible for joining)
router.get("/slug/:slug", getRoomBySlug);
router.get("/:roomId", getRoomById);


export default router;
