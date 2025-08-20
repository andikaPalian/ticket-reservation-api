import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import {AppError} from "../utils/errorHandler.js";
import {PrismaClient} from "../../generated/prisma/index.js";

const prisma = new PrismaClient();

export const adminRegister = async (adminId, {username, password, role}) => {
    try {
        const superAdmin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!superAdmin) {
            throw new AppError("Super admin not found", 404);
        }

        const existingAdmin = await prisma.admin.findUnique({
            where: {
                username: username
            }
        });
        if (existingAdmin) {
            throw new AppError("Admin already exists", 400);
        }

        const hashedPassword = await bcrypt.hash(password, 12);

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


export const adminLogin = async ({username, password}) => {
    try {
        const admin = await prisma.admin.findUnique({
            where: {
                username: username
            }
        });
        if (!admin) {
            throw new AppError("Admin not found", 404);
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            throw new AppError("Invalid credentials", 401);
        }

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

export const changeRole = async (adminId, targetAdminId, {role}) => {
    try {
        const admin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!admin) {
            throw new AppError("Admin not found", 404);
        }

        if (admin.role !== "SUPER_ADMIN") {
            throw new AppError("Unauthorized: You do not have permission to change roles", 401);
        }

        const tagetAdmin = await prisma.admin.findUnique({
            where: {
                adminId: targetAdminId
            }
        });
        if (!tagetAdmin) {
            throw new AppError("Target admin not found", 404);
        }

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

export const deleteAdmin = async (adminId, targetAdminId) => {
    try {
        const superAdmin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!superAdmin) {
            throw new AppError("Super admin not found", 404);
        }

        if (superAdmin.role !== "SUPER_ADMIN") {
            throw new AppError("Unauthorized: You do not have permission to delete admins", 401);
        }

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

        if (superAdmin.adminId === targetAdmin.adminId) {
            throw new AppError("Cannot delete yourself", 400);
        }

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