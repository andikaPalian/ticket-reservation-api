import rateLimit from "express-rate-limit";

export const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Max 100 requests per 15 minutes
    message: {
        success: false,
        message: "Too many requests from this IP, please try again after 15 minutes."
    },
    standardHeaders: true, // Return info in the "RateLimit-" headers
    legacyHeaders: false
});


export const paymentRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,  // 5 minutes
    max: 5, // Max 5 requests per 5 minutes
    message: {
        success: false,
        message: "Too many payment attempts, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false
});