import cron from 'node-cron';
import { PrismaClient } from '../../generated/prisma/index.js';

const prisma = new PrismaClient();

const EXPIRATION_TIME = 10 * 60 * 1000;

cron.schedule("* * * * *", async () => {
    console.log("Running job to clean up tickets...");

    const expirationTime = new Date(Date.now() - EXPIRATION_TIME);

    try {
        const {expiredTicket} = await prisma.tickets.updateMany({
            where: {
                status: "PENDING",
                bookTime: {
                    lt: expirationTime
                }
            },
            data: {
                status: "CANCELED"
            }
        });

        if (expiredTicket > 0) {
            console.log*(`${expiredTicket} tickets has been canceled`);
        }
    } catch (error) {
        console.error("Error canceling tickets: ", error);
    }
});

