import { stripe } from "../config/stripe.js";
import { PrismaClient } from "../../generated/prisma/index.js";
import { AppError } from "../utils/errorHandler.js";

const prisma = new PrismaClient();

export const createPaymentIntent = async (userId, ticketIds) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                userId: userId
            }
        });
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const tickets = await prisma.tickets.findMany({
            where: {
                ticketId: {
                    in: ticketIds
                },
                userId: user.userId,
                status: "PENDING"
            },
            include: {
                schedule: true
            }
        });
        if (tickets.length !== ticketIds.length) {
            throw new AppError("Tickets not found or already paid", 404);
        }

        // Calculate the total amount of the tickets (in cents)
        const totalAmount = tickets.reduce((total, ticket) => total + Number(ticket.price), 0) * 100;

        // Make sure the total amount is not zero
        if (totalAmount === 0) {
            throw new AppError("Total amount is zero", 400);
        }

        // Make sure stripe customer exists
        let stripeCustomerId = user.stripeCustomerId;
        if (stripeCustomerId) {
            try {
                await stripe.customers.retrieve(stripeCustomerId);
            } catch (error) {
                console.error(`Stripe customer ${stripeCustomerId} not found: `, error);
                stripeCustomerId = null;
            }
        }

        if (!stripeCustomerId) {
            const stripeCustomer = await stripe.customers.create({
                email: user.email,
                name: user.name
            });

            stripeCustomerId = stripeCustomer.id;
        }

        // Create a payment intent in Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmount,
            currency: "usd",
            customer: stripeCustomerId,
            metadata: {
                userId: user.userId,
                ticketIds: JSON.stringify(ticketIds)
            }
        });

        // Save the payment intent in the tickets
        await prisma.$transaction(async (tx) => {
            if (!user.stripeCustomerId) {
                await tx.user.update({
                    where: {
                        userId: user.userId
                    },
                    data: {
                        stripeCustomerId: stripeCustomerId
                    }
                });
            }

            await tx.tickets.updateMany({
                where: {
                    ticketId: {
                        in: ticketIds
                    }
                },
                data: {
                    stripePaymentIntentId: paymentIntent.id
                }
            })
        });

        return {
            clientSecret: paymentIntent.client_secret
        };
    } catch (error) {
        console.error("Error creating payment intent: ", error);
        throw error;
    }
};

export const handleStripeWebhook = async (rawBody, sigHeader) => {
    const endPointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
        // Signature stripe verification
        event = stripe.webhooks.constructEvent(rawBody, sigHeader, endPointSecret);
        console.log(`Stripe event received: ${event.type}`);

        const eventId = event.id;

        // Check if the event has already been processed (indempotency check)
        const existingEvent = await prisma.stripeEvent.findUnique({
            where: {
                eventId: eventId
            }
        });
        if (existingEvent) {
            throw new AppError("Event already processed", 400);
        }

        // Save the event in the table log
        await prisma.stripeEvent.create({
            data: {
                eventId: eventId,
                type: event.type,
                payload: event
            }
        });

        // Handle the event based on its type
        switch (event.type) {
            case "payment_intent.succeeded": {
                const {id} = event.data.object;
                console.log(`Payment intent succeeded: ${id}`);

                await prisma.tickets.updateMany({
                    where: {
                        stripePaymentIntentId: id
                    },
                    data: {
                        status: "PAID"
                    }
                });

                break;
            }
            case "payment_intent.payment_failed": {
                const {id} = event.data.object;
                console.log(`Payment intent failed: ${id}`);

                await prisma.tickets.updateMany({
                    where: {
                        stripePaymentIntentId: id
                    },
                    data: {
                        status: "FAILED"
                    }
                });

                break;
            }
            case "payment_intent.canceled": {
                const {id} = event.data.object;
                console.log(`Payment intent canceled: ${id}`);

                await prisma.tickets.updateMany({
                    where: {
                        stripePaymentIntentId: id
                    },
                    data: {
                        status: "CANCELED"
                    }
                });

                break;
            }
            default: 
                console.log(`Unhandled stripe event type: ${event.type}`);
        }
    } catch (error) {
        console.error("Error handling stripe webhook: ", error);
        throw error;
    }
};

export const cancelPaymentIntent = async (userId, paymentIntentId) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                userId: userId
            }
        });
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const tickets = await prisma.tickets.findMany({
            where: {
                stripePaymentIntentId: paymentIntentId,
                userId: user.userId
            }
        });
        if (tickets.length === 0) {
            throw new AppError("Tickets not found or access denied", 404)
        }

        const cancelPayment = await stripe.paymentIntents.cancel(paymentIntentId);

        await prisma.tickets.updateMany({
            where: {
                stripePaymentIntentId: paymentIntentId
            },
            data: {
                status: "CANCELED"
            }
        });

        return cancelPayment;
    } catch (error) {
        console.error("Error canceling payment intent: ", error);
        throw error;
    }
};

export const getPaymentStatus = async (userId, paymentIntentId) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                userId: userId
            }
        });
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const tickets = await prisma.tickets.findMany({
            where: {
                stripePaymentIntentId: paymentIntentId,
                userId: user.userId
            }
        });
        if (tickets.length === 0) {
            throw new AppError("Tickets not found or access denied", 404);
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        return {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency
        };
    } catch (error) {
        console.error("Error getting payment status: ", error);
        throw error;
    }
};

// export const confirmPayment = async (paymentIntentId) => {
//     try {
//         const tickets = await prisma.tickets.findMany({
//             where: {
//                 stripePaymentIntentId: paymentIntentId
//             }
//         });
//         if (tickets.length === 0) {
//             throw new AppError("No tickets found for this payment", 404);
//         }

//         await prisma.tickets.updateMany({
//             where: {
//                 stripePaymentIntentId: paymentIntentId
//             },
//             data: {
//                 status: "PAID"
//             }
//         });

//         return tickets;
//     } catch (error) {
//         console.error("Error confirming payment: ", error);
//         throw error;
//     }
// };