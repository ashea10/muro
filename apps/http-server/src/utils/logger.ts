import winston from "winston";

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
});

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: combine(
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        errors({ stack: true }),
        logFormat
    ),
    defaultMeta: { service: "http-server" },
    transports: [
        new winston.transports.Console({
            format: combine(
                colorize(),
                timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
                errors({ stack: true }),
                logFormat
            ),
        }),
    ],
});

// Add file transports in production
if (process.env.NODE_ENV === "production") {
    logger.add(
        new winston.transports.File({ filename: "error.log", level: "error" })
    );
    logger.add(
        new winston.transports.File({ filename: "combined.log" })
    );
}

export default logger;
