import { prismaClient } from "@repo/db/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { BadRequestError, ConflictError, UnauthorizedError } from "../middleware/errorHandler.js";

export interface CreateUserInput {
    username: string;
    password: string;
    name: string;
}

export interface SigninInput {
    username: string;
    password: string;
}

export interface AuthResult {
    token: string;
    userId: string;
}

export class AuthService {
    private static SALT_ROUNDS = 10;

    async createUser(input: CreateUserInput): Promise<{ userId: string }> {
        const { username, password, name } = input;

        // Check if user already exists
        const existingUser = await prismaClient.user.findUnique({
            where: { email: username }
        });

        if (existingUser) {
            throw new ConflictError("User with this email already exists");
        }

        const hashedPassword = await bcrypt.hash(password, AuthService.SALT_ROUNDS);

        const user = await prismaClient.user.create({
            data: {
                email: username,
                password: hashedPassword,
                name
            }
        });

        return { userId: user.id };
    }

    async signin(input: SigninInput): Promise<AuthResult> {
        const { username, password } = input;

        const user = await prismaClient.user.findFirst({
            where: { email: username }
        });

        if (!user) {
            throw new UnauthorizedError("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedError("Invalid credentials");
        }

        const token = jwt.sign(
            { userId: user.id },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        return { token, userId: user.id };
    }

    async getUserById(userId: string) {
        const user = await prismaClient.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                photo: true
            }
        });

        return user;
    }
}

export const authService = new AuthService();
