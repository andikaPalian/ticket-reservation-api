// import { ZodError } from "zod";

export const validateBody = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: result.error.issues.map((err) => ({
                path: err.path.join('.'),
                message: err.message
            }))
        });
    }

    req.body = result.data;

    next();
};