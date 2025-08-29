import nodemailer from 'nodemailer';

export const transaporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_HOST_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_LOGIN,
        pass: process.env.EMAIL_PASSWORD
    }
}); 