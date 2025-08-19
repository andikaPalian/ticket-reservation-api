import { assignAdminToTheater, removeAdminFromTheater } from "../services/theaterAdmin.service.js";

export const assignAdminToTheaterController = async (req, res, next) => {
    try {
        const superAdminId = req.admin.adminId;
        const {theaterId} = req.params;
        const {assignerId} = req.body;

        await assignAdminToTheater(superAdminId, theaterId, assignerId);

        return res.status(200).json({
            success: true,
            message: "Admin assigned to theater successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const removeAdminFromTheaterController = async (req, res, next) => {
    try {
        const superAdminId = req.admin.adminId;
        const {theaterId, adminId} = req.params;

        await removeAdminFromTheater(superAdminId, theaterId, adminId);

        return res.status(200).json({
            success: true,
            message: "Admin removed from theater successfully"
        });
    } catch (error) {
        next(error);
    }
};