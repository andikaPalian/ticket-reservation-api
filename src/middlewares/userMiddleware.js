import jwt from 'jsonwebtoken';
import { PrismaClient } from '../../generated/prisma/index.js'

const prisma = new PrismaClient();

export const userAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        // Ensure the header authorization is formatted with "Bearer <token>"
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: "Token is missing or not provided"
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify the token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            console.error("User token verification failed: ", error);
            return res.status(401).json({
                success: false,
                message: error.name === "TokenExpiredError" ? "Unauthorized: Token has expired" : "Unauthorized: Invalid token"
            });
        }

        const user = await prisma.user.findUnique({
            where: {
                userId: decoded.id
            }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        req.user = {
            userId: user.userId,
            name: user.name,
            email: user.email
        };

        next();
    } catch (error) {
        console.error("User authentication error: ", error);
        return res.status(500).json({
            success: false,
            message: error.message || "An unexpected error occurred during authentication"
        });
    }
};