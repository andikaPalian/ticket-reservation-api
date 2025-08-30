import express from 'express';
import { userAuth } from '../middlewares/userMiddleware.js';
import { cancelTicketController, createTicketController, generateQrCodeController, getAllTicketsController, getTicketByIdController, getTicketHistoryByUserController, scanTicketController, updateTicketStatusController } from '../controllers/ticket.controller.js';
import { adminAuth, roleCheck } from '../middlewares/adminMiddleware.js';

export const ticketRouter = express.Router();

ticketRouter.post('/book', userAuth, createTicketController);
ticketRouter.patch('/cancel', userAuth, cancelTicketController);
ticketRouter.get('/get-all', adminAuth, roleCheck(["SUPER_ADMIN", "THEATER_ADMIN"]), getAllTicketsController);
ticketRouter.get('/:ticketId', adminAuth, roleCheck(["SUPER_ADMIN", "THEATER_ADMIN"]), getTicketByIdController);
ticketRouter.get('/tickets/history', userAuth, getTicketHistoryByUserController);
ticketRouter.post('/generate-qr', userAuth, generateQrCodeController);
ticketRouter.patch('/:ticketId/update', adminAuth, roleCheck(["SUPER_ADMIN", "THEATER_ADMIN"]), updateTicketStatusController);
ticketRouter.post('/scan-qr', adminAuth, roleCheck(["SUPER_ADMIN", "THEATER_ADMIN"]), scanTicketController);