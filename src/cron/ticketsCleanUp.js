import cron from 'node-cron';
import { PrismaClient } from '../../generated/prisma/index.js';

const prisma = new PrismaClient();

cron.schedule("0 2 * * *", async () => {
    try {
        const {canceledTicket} = await prisma.tickets.deleteMany({
            where: {
                status: "CANCELED",
                bookTime: {
                    lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Lebih dari 1 hari
                }
            }
        });

        console.log(`${canceledTicket} tickets has been deleted`);
    } catch (error) {
        console.error("Error deleting tickets: ", error);
    }
});