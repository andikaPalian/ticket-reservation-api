import { ZodError } from "zod";

export const validateBody = (schema) => (req, res, next) => {
    try {
        // const parsed = schema.parse(req.body);
        // req.body = parsed;
        schema.parse(req.body);
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            const errors = error.errors.map((err) => ({
                field: err.path.join("."),
                message: err.message
            }));
            return res.status(400).json({
                sucess: false,
                message: "Validation failed",
                error: errors
            });
        }

        next(error);
    }
};