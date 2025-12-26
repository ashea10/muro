import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { UnauthorizedError } from "./errorHandler.js";

declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}

export function middleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers["authorization"] ?? "";

    // Handle "Bearer <token>" format
    const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;

    if (!token) {
        throw new UnauthorizedError("No token provided");
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

        if (!decoded || !decoded.userId) {
            throw new UnauthorizedError("Invalid token");
        }

        req.userId = decoded.userId;
        next();
    } catch (e) {
        if (e instanceof UnauthorizedError) {
            throw e;
        }
        throw new UnauthorizedError("Invalid or expired token");
    }
}
