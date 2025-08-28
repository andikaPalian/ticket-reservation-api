import { userRegister, userLogin, verifyCode, resendVerificationCode } from "../services/userAuth.service.js";

export const userRegisterController = async (req, res, next) => {
    try {
        const newUser = await userRegister(req.body);

        return res.status(201).json({
            success: true,
            message: "User registered successfully. Please check your email for the verification code.",
            data: {
                user: newUser
            }
        });
    } catch (error) {
        next(error);
    }
};

export const verifyCodeController = async (req, res, next) => {
    try {
        await verifyCode(req.body);

        return res.status(200).json({
            success: true,
            message: "Email verified successfully"
        });
    } catch (error) {
        next(error);
    };
};

export const resendVerificationCodeController = async (req, res, next) => {
    try {
        await resendVerificationCode(req.body);

        return res.status(200).json({
            success: true,
            message: "Verification code resent successfully. Please check your email."
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