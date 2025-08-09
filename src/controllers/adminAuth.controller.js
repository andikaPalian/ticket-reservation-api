import { adminRegister, adminLogin, changeRole } from "../services/adminAuth.service.js";

export const adminRegisterController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;

        const newAdmin = await adminRegister(adminId, req.body);

        return res.status(201).json({
            success: true,
            message: "Admin registered successfully", 
            data: {
                admin: newAdmin
            }
        });
    } catch (error) {
        next(error);
    }
};

export const adminLoginController = async (req, res, next) => {
    try {
        const token = await adminLogin(req.body);

        return res.status(200).json({
            success: true,
            message: "Admin logged in successfully",
            data: {
                token: token
            }
        });
    } catch (error) {
        next(error);
    }
};

export const changeRoleController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;
        const {targetAdminId} = req.params;
        
        const updatedAdmin = await changeRole(adminId, targetAdminId, req.body);

        return res.status(200).json({
            success: true,
            message: "Role changed successfully",
            data: {
                admin: updatedAdmin
            }
        });
    } catch (error) {
        next(error);
    }
};