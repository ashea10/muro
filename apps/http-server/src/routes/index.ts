import { Router, IRouter } from "express";
import authRoutes from "./auth.routes.js";
import roomRoutes from "./room.routes.js";

const router: IRouter = Router();

// Mount route modules
router.use("/auth", authRoutes);
router.use("/room", roomRoutes);

export default router;
