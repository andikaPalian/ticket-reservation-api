import { userRegister, userLogin } from "../services/userAuth.service.js";

export const userRegisterController = async (req, res, next) => {
    try {
        const newUser = await userRegister(req.body);

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                user: newUser
            }
        });
    } catch (error) {
        next(error);
    }
};

export const userLoginController = async (req, res, next) => {
    try {
        const token = await userLogin(req.body);

        return res.status(200).json({
            success: true,
            message: "User logged in successfully",
            data: {
                token: token
            }
        });
    } catch (error) {
        next(error);
    }
};