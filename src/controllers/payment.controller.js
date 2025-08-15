import { createPaymentIntent, cancelPaymentIntent, handleStripeWebhook, getPaymentStatus } from "../services/payment.service.js";

export const createPaymentIntentController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {ticketIds} = req.body;

        if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Ticket Ids must be a non-empty array"
            });
        }

        const paymentIntent = await createPaymentIntent(userId, ticketIds);

        return res.status(201).json({
            success: true,
            message: "Payment intent created successfully",
            data: {
                payment: paymentIntent
            }
        });
    } catch (error) {
        next(error);
    }
};

export const handleStripeWebhookController = async (req, res, next) => {
    try {
        const sig = req.headers["stripe-signature"];
        if (!sig) {
            return res.status(400).json({
                success: false,
                message: "Missing stripe signature"
            });
        }

        await handleStripeWebhook(req.rawBody, sig);

        return res.status(200).json({
            received: true
        });
    } catch (error) {
        next(error);
    }
};

export const cancelPaymentIntentController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {paymentIntentId} = req.body;

        if (!paymentIntentId) {
            return res.status(400).json({
                success: true,
                message: "PaymentIntentId is required"
            });
        }

        const cancelPayment = await cancelPaymentIntent(userId, paymentIntentId);

        return res.status(200).json({
            success: true,
            message: "Payment intent canceled successfully",
            data: {
                payment: cancelPayment
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getPaymentStatusController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {paymentIntentId} = req.body;

        if (!paymentIntentId) {
            return res.status(400).json({
                success: true,
                message: "PaymentIntentId is required"
            });
        }

        const paymentStatus = await getPaymentStatus(userId, paymentIntentId);

        return res.status(200).json({
            success: true,
            message: "Payment status fetched successfully",
            data: {
                payment: paymentStatus
            }
        });
    } catch (error) {
        next(error);
    }
};