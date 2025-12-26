import { Request, Response } from "express";
import { CreateUserSchema, SigninSchema } from "@repo/common/types";
import { authService } from "../services/auth.service.js";
import { asyncHandler, BadRequestError } from "../middleware/errorHandler.js";
import logger from "../utils/logger.js";

export const signup = asyncHandler(async (req: Request, res: Response) => {
    const parsedData = CreateUserSchema.safeParse(req.body);

    if (!parsedData.success) {
        logger.warn("Signup validation failed", { errors: parsedData.error.issues });
        throw new BadRequestError("Invalid input: " + parsedData.error.issues[0]?.message);
    }

    const result = await authService.createUser(parsedData.data);

    logger.info("User created successfully", { userId: result.userId });

    res.status(201).json({
        success: true,
        userId: result.userId
    });
});

export const signin = asyncHandler(async (req: Request, res: Response) => {
    const parsedData = SigninSchema.safeParse(req.body);

    if (!parsedData.success) {
        logger.warn("Signin validation failed", { errors: parsedData.error.issues });
        throw new BadRequestError("Invalid input: " + parsedData.error.issues[0]?.message);
    }

    const result = await authService.signin(parsedData.data);

    logger.info("User signed in successfully", { userId: result.userId });

    res.json({
        success: true,
        token: result.token
    });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId;

    if (!userId) {
        throw new BadRequestError("User ID not found");
    }

    const user = await authService.getUserById(userId);

    res.json({
        success: true,
        user
    });
});
