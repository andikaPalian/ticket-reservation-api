import jwt from 'jsonwebtoken';
import { PrismaClient } from '../../generated/prisma/index.js';

const prisma = new PrismaClient();

export const adminAuth = async (req, res, next) => {
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
            console.error("Admin token verification failed: ", error);
            return res.status(401).json({
                success: false,
                message: error.name === "TokenExpiredError" ? "Unauthorized: Token has expired" : "Unauthorized: Invalid token"
            });
        }

        const admin = await prisma.admin.findUnique({
            where: {
                adminId: decoded.id
            }
        });
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        req.admin = {
            adminId: admin.adminId,
            username: admin.username,
            role: admin.role
        };

        next();
    } catch (error) {
        console.error("Admin authentication error: ", error);
        return res.status(500).json({
            success: false,
            message: error.message || "An unexpected error occurred during admin authentication"
        });
    }
};

export const roleCheck = (role) => {
    return (req, res, next) => {
        // Validate if the req.admin or req.admin.role exists
        if (!req.admin || !req.admin.role) {
            return res.status(401).json({
                successL: false,
                message: "Unauthorized: Admin information is missing"
            });
        }

        // Validate the role is an array 
        if (!Array.isArray(role)) {
            return res.status(400).json({
                success: false,
                message: "Roles paramater must be an array"
            });
        }

        // Check if the admin's role is included in the allowed roles
        if (!role.includes(req.admin.role)) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You do not have permission to access this resource"
            });
        }

        // If the role matches, proceed to the next middleware
        next();
    }
}