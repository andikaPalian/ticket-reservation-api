import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import {AppError} from "../utils/errorHandler.js";
import {PrismaClient} from "../../generated/prisma/index.js";

const prisma = new PrismaClient();

// Super Admin: Register admin
export const adminRegister = async (adminId, {username, password, role}) => {
    try {
        // Check if the admin is exists or not
        const superAdmin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!superAdmin) {
            throw new AppError("Super admin not found", 404);
        }

        // Check if the admin role is SUPER_ADMIN or not
        if (superAdmin.role !== "SUPER_ADMIN") {
            throw new AppError("Unauthorized: You do not have permission to register admins", 403);
        }

        // Check if the admin is already exists or not
        const existingAdmin = await prisma.admin.findUnique({
            where: {
                username: username
            }
        });
        if (existingAdmin) {
            throw new AppError("Admin already exists", 400);
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create new admin
        const newAdmin = await prisma.admin.create({
            data: {
                username: username,
                password: hashedPassword,
                role: role
            }
        });

        return newAdmin;
    } catch (error) {
        console.error("Admin registration error: ", error);
        throw error;
    }
};

// Admin login
export const adminLogin = async ({username, password}) => {
    try {
        // Check if the admin exists or not
        const admin = await prisma.admin.findUnique({
            where: {
                username: username
            }
        });
        if (!admin) {
            throw new AppError("Admin not found", 404);
        }

        // Compare the password
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            throw new AppError("Invalid credentials", 401);
        }

        // Create JWT Token
        const token = jwt.sign({
            id: admin.adminId
        }, process.env.JWT_SECRET, {
            expiresIn: "1d"
        });

        return token;
    } catch (error) {
        console.error("Admin login error: ", error);
        throw error;
    }
};

// Super Admin: Change role of other admins
export const changeRole = async (adminId, targetAdminId, {role}) => {
    try {
        // Check if the admin is exists or not
        const admin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!admin) {
            throw new AppError("Admin not found", 404);
        }

        // Check if the admin role is SUPER_ADMIN or not
        if (admin.role !== "SUPER_ADMIN") {
            throw new AppError("Unauthorized: You do not have permission to change roles", 401);
        }

        // Check if the target admin exists or not
        const tagetAdmin = await prisma.admin.findUnique({
            where: {
                adminId: targetAdminId
            }
        });
        if (!tagetAdmin) {
            throw new AppError("Target admin not found", 404);
        }

        // Prevent super admin from changing their own role
        if (admin.adminId === tagetAdmin.adminId) {
            throw new AppError("Cannot change your own role", 400)
        }

        // Validate the new role
        const validRoles = ["THEATER_ADMIN", "ADMIN"];
        if (!validRoles.includes(role)) {
            throw new AppError("Invalid role", 400)
        }

        // Update the role of the target admin
        await prisma.admin.update({
            where: {
                adminId: targetAdminId
            },
            data: {
                role: role
            }
        });
    } catch (error) {
        console.error("Role change error: ", error);
        throw error;
    }
};

// Super Admin: Delete admin
export const deleteAdmin = async (adminId, targetAdminId) => {
    try {
        // Check if the admin is exists or not
        const superAdmin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!superAdmin) {
            throw new AppError("Super admin not found", 404);
        }

        // Check if the admin role is SUPER_ADMIN or not
        if (superAdmin.role !== "SUPER_ADMIN") {
            throw new AppError("Unauthorized: You do not have permission to delete admins", 401);
        }

        // Check if the target admin exists or not
        const targetAdmin = await prisma.admin.findUnique({
            where: {
                adminId: targetAdminId
            },
            include: {
                theater: true
            }
        });
        if (!targetAdmin) {
            throw new AppError("Target admin not found", 404);
        }

        // Prevent super admin from deleting themselves
        if (superAdmin.adminId === targetAdmin.adminId) {
            throw new AppError("Cannot delete yourself", 400);
        }

        // Prevent deleting another super admin
        if (targetAdmin.role === "SUPER_ADMIN") {
            throw new AppError("Cannot delete super admin", 400);
        }

        // Disconnect target admin from theaters
        if (targetAdmin.theater.length > 0) {
            await prisma.admin.update({
                where: {
                    adminId: targetAdminId
                },
                data: {
                    theater: {
                        disconnect: targetAdmin.theater.map((theater) => ({
                            theaterId: theater.theaterId
                        }))
                    }
                }
            });
        }

        // Delete the target admin
        await prisma.admin.delete({
            where: {
                adminId: targetAdminId
            }
        });
    } catch (error) {
        console.error("Admin deletion error: ", error);
        throw error;
    }
};