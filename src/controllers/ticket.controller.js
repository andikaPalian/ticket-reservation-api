import { createTicket, cancelTicket, getAllTickets, getTicketById, getTicketsByUserId, generateQrCode, updateTicketStatus, scanTicket } from "../services/ticket.service.js";

export const createTicketController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {theaterId, scheduleId, seatIds} = req.body;

        const ticket = await createTicket(userId, theaterId, scheduleId, seatIds);

        return res.status(200).json({
            success: true,
            message: "Ticket created successfully",
            data: {
                ticket: ticket
            }
        });
    } catch (error) {
        next(error);
    }
};

export const cancelTicketController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {ticketIds} = req.body;

        await cancelTicket(userId, ticketIds);

        return res.status(200).json({
            success: true,
            message: "Ticket cancelled successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const getAllTicketsController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;

        const tickets = await getAllTickets(adminId);

        if (tickets.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No tickets found",
                data: {
                    tickets: []
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: "Tickets fetched successfully",
            data: {
                tickets: tickets
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getTicketByIdController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;
        const {ticketId} = req.params;

        const ticket = await getTicketById(adminId, ticketId);

        return res.status(200).json({
            success: true,
            message: "Ticket fetched successfully",
            data: {
                ticket: ticket
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getTicketsByUserIdController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;
        const {userId} = req.params;

        const ticket = await getTicketsByUserId(adminId, userId);

        return res.status(200).json({
            success: true,
            message: "Tickets fetched successfully",
            data: {
                tickets: ticket
            }
        });
    } catch (error) {
        next(error);
    }
};

export const generateQrCodeController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {ticketIds} = req.body;

        const qrCode = await generateQrCode(userId, ticketIds);

        return res.status(200).json({
            success: true,
            message: "QR Code generated successfully",
            data: {
                qrCode: qrCode
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateTicketStatusController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;
        const {ticketId} = req.params;
        const {status} = req.body;

        const updatedTicket = await updateTicketStatus(adminId, ticketId, status);

        return res.status(200).json({
            success: true,
            message: "Ticket status updated successfully",
            data: {
                ticket: updatedTicket
            }
        });
    } catch (error) {
        next(error);
    }
};

export const scanTicketController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;
        const {qrCodeToken} = req.body;

        const ticket = await scanTicket(adminId, qrCodeToken);

        return res.status(200).json({
            success: true,
            message: "Ticket scanned successfully",
            data: {
                ticket: ticket
            }
        });
    } catch (error) {
        next(error);
    }
}