import { PrismaClient } from "../../generated/prisma/index.js";
import { AppError } from "../utils/errorHandler.js";

const prisma = new PrismaClient();

export const assignAdminToTheater = async (superAdminId, theaterId, assignerId) => {
    try {
        const superAdmin = await prisma.admin.findUnique({
            where: {
                adminId: superAdminId
            }
        });
        if (!superAdmin) {
            throw new AppError("Super admin not found", 404);
        }

        if (superAdmin.role !== "SUPER_ADMIN") {
            throw new AppError("Unauthorized: You do not have permission to assign admins to theaters", 401);
        }

        const theater = await prisma.theaters.findUnique({
            where: {
                theaterId: theaterId
            },
            include: {
                admin: true
            }
        });
        if (!theater) {
            throw new AppError("Theater not found", 404);
        }

        const assigner = await prisma.admin.findUnique({
            where: {
                adminId: assignerId
            }
        });
        if (!assigner) {
            throw new AppError("Assigner not found", 404);
        }

        const theaterAdmins = theater.admin.map((admin) => admin.adminId);
        if (theaterAdmins.includes(assignerId)) {
            throw new AppError("Admin already assigned to theater", 400);
        }

        await prisma.theaters.update({
            where: {
                theaterId: theaterId
            },
            data: {
                admin: {
                    connect: {
                        adminId: assignerId
                    }
                }
            }
        });
    } catch (error) {
        console.error("Theater admin assignment error: ", error);
        throw error;
    }
};

export const removeAdminFromTheater = async (superAdminId, theaterId, adminId) => {
    try {
        const superAdmin = await prisma.admin.findUnique({
            where: {
                adminId: superAdminId
            }
        });
        if (!superAdmin) {
            throw new AppError("Super admin not found", 404);
        }

        if (superAdmin.role !== "SUPER_ADMIN") {
            throw new AppError("Unauthorized: You do not have permission to remove admins from theaters", 401);
        }

        const theater = await prisma.theaters.findUnique({
            where: {
                theaterId: theaterId
            },
            include: {
                admin: true
            }
        });
        if (!theater) {
            throw new AppError("Theater not found", 404);
        }

        const theaterAdmins = theater.admin.map((admin) => admin.adminId);
        if (!theaterAdmins.includes(adminId)) {
            throw new AppError("Admin not assigned to theater", 400);
        }

        await prisma.theaters.update({
            where: {
                theaterId: theaterId
            },
            data: {
                admin: {
                    disconnect: {
                        adminId: adminId
                    }
                }
            }
        });
    } catch (error) {
        console.error("Theater admin removal error: ", error);
        throw error;
    }
};