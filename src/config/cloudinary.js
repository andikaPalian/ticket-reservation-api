import {v2 as cloudinary} from 'cloudinary';

export const connectCloudinary = () => {
    try {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });

        if (!process.env.CLOUDINARY_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            throw new Error("Cloudinary credentials are missing or invalid. Please check your environment variables.");
        }

        console.log("Cloudinary connected");
    } catch (error) {
        console.error("Cloudinary connection error: ", error);
        process.exit(1);
    }
};