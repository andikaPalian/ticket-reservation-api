import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { AppError } from '../utils/errorHandler.js';
import { PrismaClient } from '../../generated/prisma/index.js';

const prisma = new PrismaClient();

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

        const newUser = await prisma.user.create({
            data: {
                name: name,
                email: email,
                password: hashedPassword
            }
        });

        return newUser;
    } catch (error) {
        console.error("User registration error: ", error);
        throw error;
    }
};

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