import {z} from 'zod';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const registerAdminSchema = z.object({
    username: z.string().min(3, {
        message: "Username must be at least 3 characters long"
    }).max(50, {
        message: "Username must be at most 50 characters long"
    }).trim(),
    password: z.string().regex(passwordRegex, {
        message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    }),
    role: z.enum(["SUPER_ADMIN", "THEATHER_ADMIN", "ADMIN"]).default("ADMIN")
});

export const loginAdminSchema = z.object({
    username: z.string().min(3, {
        message: "Username must be at least 3 characters long"
    }).max(50, {
        message: "Username must be at most 50 characters long"
    }).trim(),
    password: z.string().regex(passwordRegex, {
        message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    })
});

export const changeAdminRoleSchema = z.object({
    role: z.enum(["THEATHER_ADMIN", "ADMIN"]).default("ADMIN")
});