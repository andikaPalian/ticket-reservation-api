import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AppError } from '../utils/errorHandler.js';
import { PrismaClient } from '../../generated/prisma/index.js';
import { transaporter } from '../utils/email.js';

const prisma = new PrismaClient();

const generateOtp = () => crypto.randomInt(100000, 999999).toString();

export const userRegister = async ({name, email, password}) => {
    try {
        const existingUser = await prisma.user.findUnique({
            where: {
                email: email
            }
        });
        if (existingUser) {
            throw new AppError("User already exists", 400);
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes

        const newUser = await prisma.user.create({
            data: {
                name: name,
                email: email,
                password: hashedPassword,
                isVerified: false,
                verificationToken: otp,
                verificationTokenExpiry: otpExpiry
            }
        });

        // Send verification email
        await transaporter.sendMail({
            from: process.env.FROM_EMAIL,
            to: email,
            subject: "Email Verification Code",
            text: `Your verification code is ${otp}. It is valid for 5 minutes.`
        });

        return newUser;
    } catch (error) {
        console.error("User registration error: ", error);
        throw error;
    }
};

export const verifyCode = async ({email, otp}) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        });
        if (!user) {
            throw new AppError("User not found", 404);
        }

        if (user.email !== email) {
            throw new AppError("Email does not match", 400);
        }

        if (user.verificationToken !== otp) {
            throw new AppError("Invalid verification code", 400);
        }

        if (user.verificationTokenExpiry < new Date()) {
            throw new AppError("Verification code has expired", 400);
        }

        if (user.isVerified === true) {
            throw new AppError("User already verified", 400);
        }

        await prisma.user.update({
            where: {
                email: email
            },
            data: {
                isVerified: true,
                verificationToken: null,
                verificationTokenExpiry: null
            }
        });
    } catch (error) {
        console.error("Email verification error: ", error);
        throw error;
    }
};

export const resendVerificationCode = async ({email}) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        });
        if (!user) {
            throw new AppError("User not found", 404);
        }

        if (user.isVerified === true) {
            throw new AppError("User already verified", 400);
        }

        if (user.verificationTokenExpiry > new Date()) {
            throw new AppError("Previous OTP is still valid. Please check your email.", 400);
        }

        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes

        await prisma.user.update({
            where: {
                email: email
            },
            data: {
                verificationToken: otp,
                verificationTokenExpiry: otpExpiry
            }
        });

        // Send verification email
        await transaporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Email Verification Code",
            text: `Your verification code is ${otp}. It is valid for 5 minutes.`
        });
    } catch (error) {
        console.error("Resend verification code error: ", error);
        throw error;
    }
}

export const userLogin = async ({email, password}) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        });
        if (!user) {
            throw new AppError("User not found", 404);
        }

        if (user.isVerified === false) {
            throw new AppError("Please verify your email before logging in", 401);
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new AppError("Invalid credentials", 401);
        }

        const token = jwt.sign({
            id: user.userId
        }, process.env.JWT_SECRET, {
            expiresIn: "1d"
        });

        return token;
    } catch (error) {
        console.error("User login error: ", error);
        throw error;
    }
}