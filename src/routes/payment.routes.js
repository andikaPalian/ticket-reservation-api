import express from "express";
import { userAuth } from "../middlewares/userMiddleware";
import { cancelPaymentIntentController, createPaymentIntentController, getPaymentStatusController, handleStripeWebhookController } from "../controllers/payment.controller.js";
import { paymentRateLimiter } from "../middlewares/rateLimiter.js";

export const paymentRouter = express.Router();

paymentRouter.post('/', userAuth, paymentRateLimiter, createPaymentIntentController);
paymentRouter.post('/webhook', express.raw({
    type: "application/json"
}), handleStripeWebhookController);
paymentRouter.post('/:paymentIntentId/cancel', userAuth, cancelPaymentIntentController);
paymentRouter.get('/:paymentIntentId/status', userAuth, getPaymentStatusController);