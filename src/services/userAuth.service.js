import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AppError } from '../utils/errorHandler.js';
import { PrismaClient } from '../../generated/prisma/index.js';
import { transaporter } from '../utils/email.js';

const prisma = new PrismaClient();

// Generate a random 6-digit OTP
const generateOtp = () => crypto.randomInt(100000, 999999).toString();

// Register a new user
export const userRegister = async ({name, email, password}) => {
    try {
        // Check if user already registered
        const existingUser = await prisma.user.findUnique({
            where: {
                email: email
            }
        });
        if (existingUser) {
            throw new AppError("User already exists", 400);
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create a otp
        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes

        // Create/Register a new user
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

// Verify user email
export const verifyCode = async ({email, otp}) => {
    try {
        // Check if user already registered
        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        });
        if (!user) {
            throw new AppError("User not found", 404);
        }

        // Check if user email and email match
        if (user.email !== email) {
            throw new AppError("Email does not match", 400);
        }

        // Check if otp is valid
        if (user.verificationToken !== otp) {
            throw new AppError("Invalid verification code", 400);
        }

        // Check if the otp is expired or not
        if (user.verificationTokenExpiry < new Date()) {
            throw new AppError("Verification code has expired", 400);
        }

        // Check if user is already verified
        if (user.isVerified === true) {
            throw new AppError("User already verified", 400);
        }

        // Update the user as verified
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

// Resend verification code
export const resendVerificationCode = async ({email}) => {
    try {
        // Check if user already registered
        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        });
        if (!user) {
            throw new AppError("User not found", 404);
        }

        // Check if user is already verified
        if (user.isVerified === true) {
            throw new AppError("User already verified", 400);
        }

        // Check if previous otp is still valid
        if (user.verificationTokenExpiry > new Date()) {
            throw new AppError("Previous OTP is still valid. Please check your email.", 400);
        }

        // Create a new otp
        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes

        // Update the user otp
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
            from: process.env.FROM_EMAIL,
            to: email,
            subject: "Email Verification Code",
            text: `Your verification code is ${otp}. It is valid for 5 minutes.`
        });
    } catch (error) {
        console.error("Resend verification code error: ", error);
        throw error;
    }
}

// Login a user
export const userLogin = async ({email, password}) => {
    try {
        // Check if user already registered
        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        });
        if (!user) {
            throw new AppError("User not found", 404);
        }

        // Check if user is already verified
        if (user.isVerified === false) {
            throw new AppError("Please verify your email before logging in", 401);
        }

        // Compare the user password with the inpured password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new AppError("Invalid credentials", 401);
        }

        // Create JWT Token
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