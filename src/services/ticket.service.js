import { PrismaClient } from "../../generated/prisma/index.js";
import { AppError } from "../utils/errorHandler.js";
import QRCode from 'qrcode';
import { v4 as uuid } from "uuid";
import { stripe } from "../config/stripe.js";

const prisma = new PrismaClient();

export const createTicket = async (userId, theaterId, scheduleId, seatIds) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                userId: userId
            }
        });
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const theater = await prisma.theaters.findUnique({
            where: {
                theaterId: theaterId
            },
            include: {
                screens: {
                    include: {
                        seats: true
                    }
                }
            }
        });
        if (!theater) {
            throw new AppError("Theater not found", 404);
        }

        const schedule = await prisma.movieSchedules.findUnique({
            where: {
                scheduleId: scheduleId
            }
        });
        if (!schedule) {
            throw new AppError("Schedule not found", 404);
        }

        const tickets = await prisma.$transaction(async (tx) => {
            // Check if the seats are available
            const seats = await tx.seats.findMany({
                where: {
                    seatId: {
                        in: seatIds
                    },
                    isAvailable: true
                }
            });
            if (seats.length !== seatIds.length) {
                throw new AppError("One or more seats are not available", 400);
            }

            // Update the seats as unavailable
            await tx.seats.updateMany({
                where: {
                    seatId: {
                        in: seatIds
                    }
                },
                data: {
                    isAvailable: false
                }
            });

            // Make ticket for every seat
            const createdTickets = [];
            for (const seat of seats) {
                const ticketNumber = `TICKET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                const ticket = await tx.tickets.create({
                    data: {
                        userId: user.userId,
                        scheduleId: schedule.scheduleId,
                        seatId: seat.seatId,
                        seatType: seat.seatType,
                        price: seat.seatPrice,
                        ticketNumber: ticketNumber,
                        status: "PENDING",
                        bookTime: new Date(),
                    },
                });
                createdTickets.push(ticket);
            }

            return createdTickets;
        });

        return tickets;
    } catch (error) {
        console.error("Error creating ticket: ", error);
        throw error;
    }
};

export const cancelTicket = async (userId, ticketIds) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                userId: userId
            }
        });
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const tickets = await prisma.$transaction(async (tx) => {
            // Check if the tickets belong to the user
            const userTickets = await tx.tickets.findMany({
                where: {
                    ticketId: {
                        in: ticketIds
                    },
                    userId: user.userId
                }
            });
            if (userTickets.length !== ticketIds.length) {
                throw new AppError("One or more tickets do not belong to the user", 400);
            }

            // Update the tickets as cancelled
            await tx.tickets.updateMany({
                where: {
                    ticketId: {
                        in: ticketIds
                    }
                },
                data: {
                    status: "CANCELED"
                }
            });

            return userTickets;
        });

        return tickets;
    } catch (error) {
        console.error("Error canceling ticket: ", error);
        throw error;
    }
};

export const getAllTickets = async (adminId) => {
    try {
        const admin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!admin) {
            throw new AppError("Admin not found", 404);
        }

        if (!["SUPER_ADMIN", "THEATER_ADMIN"].includes(admin.role)) {
            throw new AppError("Unauthorized: You do not have permission to view tickets", 403);
        }

        // Super admin can view all tickets
        if (admin.role === "SUPER_ADMIN") {
            const tickets = await prisma.tickets.findMany({
                include: {
                    user: {
                        select: {
                            userId: true,
                            email: true,
                            name: true
                        }
                    },
                    schedule: {
                        select: {
                            scheduleId: true,
                            startTime: true,
                            endTime: true,
                            movie: true,
                            screen: {
                                select: {
                                    screenId: true,
                                    name: true,
                                    screenCapacity: true,
                                    theater: true,
                                    seats: {
                                        select: {
                                            seatId: true,
                                            seatRow: true,
                                            seatNumber: true,
                                            seatType: true,
                                            seatPrice: true,
                                            isAvailable: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                }
            });

            return tickets;
            // Theater admin can view tickets for their theaters
        } else if (admin.role === "THEATER_ADMIN") {
            const tickets = await prisma.tickets.findMany({
                where: {
                    schedule: {
                        screen: {
                            theater: {
                                admin: {
                                    some: {
                                        adminId: adminId
                                    }
                                }
                            }
                        }
                    }
                },
                include: {
                    user: {
                        select: {
                            userId: true,
                            email: true,
                            name: true
                        }
                    },
                    schedule: {
                        select: {
                            scheduleId: true,
                            startTime: true,
                            endTime: true,
                            movie: true,
                            screen: {
                                select: {
                                    screenId: true,
                                    name: true,
                                    screenCapacity: true,
                                    theater: true,
                                    seats: {
                                        select: {
                                            seatId: true,
                                            seatRow: true,
                                            seatNumber: true,
                                            seatType: true,
                                            seatPrice: true,
                                            isAvailable: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                }
            });

            return tickets;
        }
    } catch (error) {
        console.error("Error getting tickets: ", error);
        throw error;
    }
};

export const getTicketById = async (adminId, ticketId) => {
    try {
        const admin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!admin) {
            throw new AppError("Admin not found", 404);
        }

        if (!["SUPER_ADMIN", "THEATER_ADMIN"].includes(admin.role)) {
            throw new AppError("Unauthorized: You do not have permission to view tickets", 403);
        }

        const ticket = await prisma.tickets.findUnique({
            where: {
                ticketId: ticketId
            },
            include: {
                user: {
                    select: {
                        userId: true,
                        email: true,
                        name: true
                    }
                },
                schedule: {
                    select: {
                        scheduleId: true,
                        startTime: true,
                        endTime: true,
                        movie: true,
                        screen: {
                            select: {
                                screenId: true,
                                name: true,
                                screenCapacity: true,
                                theater: true,
                                seats: {
                                    select: {
                                        seatId: true,
                                        seatRow: true,
                                        seatNumber: true,
                                        seatType: true,
                                        seatPrice: true,
                                        isAvailable: true
                                    }
                                }
                            }
                        }
                    }
                },
            }
        });

        if (admin.role === "THEATER_ADMIN") {
            const theaterId = ticket.schedule.screen.theater.theaterId;

            const theater = await prisma.theaters.findUnique({
                where: {
                    theaterId: theaterId
                },
                include: {
                    admin: {
                        select: {
                            adminId: true
                        }
                    }
                }
            });
            if (!theater) {
                throw new AppError("Theater not found", 404);
            }

            const isTheaterAdmin = theater.admin.some((admin) => admin.adminId === adminId);
            if (!isTheaterAdmin) {
                throw new AppError("Unauthorized: You do not have permission to view this ticket", 403);
            }
        }

        return ticket;
    } catch (error) {
        console.error("Error getting ticket: ", error);
        throw error;
    }
};

export const getTicketHistoryByUser = async (userId, statusFilter, {page = 1, limit = 10}) => {
    try {
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const user = await prisma.user.findUnique({
            where: {
                userId: userId
            }
        });
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const whereClause = {
            userId: userId
        };

        if (statusFilter && ["PENDING", "PAID", "USED", "CANCELED", "EXPIRED"].includes(statusFilter)) {
            whereClause.status = statusFilter;
        }

        const totalTickets = await prisma.tickets.count({
            where: whereClause
        });

        const tickets = await prisma.tickets.findMany({
            where: whereClause,
            orderBy: {
                bookTime: 'desc'
            },
            skip: skip,
            take: limitNum,
            select: {
                ticketId: true,
                ticketNumber: true,
                status: true,
                price: true,
                bookTime: true,
                schedule: {
                    select: {
                        movie: {
                            select: {
                                movieId: true,
                                title: true
                            }
                        },
                        scheduleId: true,
                        startTime: true,
                        screen: {
                            select: {
                                screenId: true,
                                name: true,
                            }
                        }
                    }
                },
                seat: {
                    select: {
                        seatId: true,
                        seatRow: true,
                        seatNumber: true,
                        seatType: true,
                        seatPrice: true
                    }
                }
            }
        });

        const formattedTickets = tickets.map((ticket) => ({
            ...ticket,
            seat: {
                seatId: ticket.seat.seatId,
                seat: ticket.seat.seatRow + ticket.seat.seatNumber,
                seatType: ticket.seat.seatType,
                seatPrice: ticket.seat.seatPrice
            }
        }))

        return {
            tickets: formattedTickets,
            pagination: {
                total: totalTickets,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(totalTickets / limitNum)
            }
        };
    } catch (error) {
        console.error("Error getting tickets: ", error);
        throw error;
    }
};

export const generateQrCode = async (userId, ticketIds) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                userId: userId
            }
        });
        if (!user) {
            throw new AppError("User not found", 404);
        }
    
        // Check if the tickets belong to the user
        const userTickets = await prisma.tickets.findMany({
            where: {
                ticketId: {
                    in: ticketIds
                },
                userId: user.userId
            }
        });
        if (userTickets.length !== ticketIds.length) {
            throw new AppError("One or more tickets do not belong to the user", 400);
        }
    
        const result = [];
        // Process the tickets
        for (const ticket of userTickets) {
            // Validate the ticket
            if (ticket.status !== "PAID") {
                throw new AppError(`Ticket ${ticket.ticketNumber} has not been paid. Please pay before generating QR Code`, 400);
            }

            // Generate the QR Code
            let qrToken = ticket.qrCodeToken;
            if (!qrToken) {
                qrToken = uuid();
                await prisma.tickets.update({
                    where: {
                        ticketId: ticket.ticketId
                    },
                    data: {
                        qrCodeToken: qrToken
                    }
                });
            }

            // Generate QR Code data URL
            const qrCodeDataUrl = await QRCode.toDataURL(qrToken, {
                errorCorrectionLevel: "H", // High reliability
                type: "image/png",
                width: 300,
                margin: 2
            });
            
            result.push({
                ticketId: ticket.ticketId,
                ticketNumber: ticket.ticketNumber,
                qrCodeDataUrl
            });
        }

        return result;
    } catch (error) {
        console.error("Error generating QR Code: ", error);
        throw error;
    }
};

export const updateTicketStatus = async (adminId, ticketId, status) => {
    try {
        const admin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!admin) {
            throw new AppError("Admin not found", 404);
        }

        if (!["SUPER_ADMIN", "THEATER_ADMIN"].includes(admin.role)) {
            throw new AppError("Unauthorized: You do not have permission to update tickets", 403);
        }

        if (admin.role === "THEATER_ADMIN") {
            const ticket = await prisma.tickets.findUnique({
                where: {
                    ticketId: ticketId
                },
                include: {
                    schedule: {
                        include: {
                            screen: {
                                include: {
                                    theater: {
                                        include: {
                                            admin: {
                                                select: {
                                                    adminId: true
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
            if (!ticket) {
                throw new AppError("Ticket not found", 404);
            }

            const isTheaterAdmin = ticket.schedule.screen.theater.admin.some((admin) => admin.adminId === adminId);
            if (!isTheaterAdmin) {
                throw new AppError("Unauthorized: You do not have permission to update this ticket", 403);
            }
        }

        const ticket = await prisma.tickets.findUnique({
            where: {
                ticketId: ticketId
            }
        });
        if (!ticket) {
            throw new AppError("Ticket not found", 404);
        }

        const statuses = ["PAID", "USED", "CANCELED", "EXPIRED"];
        if (!statuses.includes(status)) {
            throw new AppError("Invalid status", 400);
        }

        const updatedTicket = await prisma.tickets.update({
            where: {
                ticketId: ticketId
            },
            data: {
                status: status
            }
        });

        return updatedTicket;
    } catch (error) {
        console.error("Error updating ticket status: ", error);
        throw error;
    }
};

export const scanTicket = async (adminId, qrCodeToken) => {
    try {
        const admin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!admin) {
            throw new AppError("Admin not found", 404);
        }

        if (!["THEATER_ADMIN", "SUPER_ADMIN"].includes(admin.role)) {
            throw new AppError("Unauthorized: You do not have permission to scan tickets", 403);
        }

        if (admin.role === "THEATER_ADMIN") {
            const ticket = await prisma.tickets.findUnique({
                where: {
                    qrCodeToken: qrCodeToken
                },
                include: {
                    schedule: {
                        include: {
                            screen: {
                                include: {
                                    theater: {
                                        include: {
                                            admin: {
                                                select: {
                                                    adminId: true
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
            if (!ticket) {
                throw new AppError("Ticket not found", 404);
            }

            const isTheaterAdmin = ticket.schedule.screen.theater.admin.some((admin) => admin.adminId === adminId);
            if (!isTheaterAdmin) {
                throw new AppError("Unauthorized: You do not have permission to scan this ticket", 403);
            }
        }

        if (!qrCodeToken) {
            throw new AppError("QR code is required", 400);
        }

        const ticket = await prisma.$transaction(async (tx) => {
            const foundTicket = await prisma.tickets.findUnique({
                where: {
                    qrCodeToken: qrCodeToken
                },
                include: {
                    user: true,
                    schedule: true,
                    seat: true
                }
            });
            if (!foundTicket) {
                throw new AppError("Ticket not found", 404);
            }

            if (foundTicket.status === "USED") {
                throw new AppError("Ticket has already been used", 400);
            }

            if (foundTicket.status !== "PAID") {
                throw new AppError("Ticket has not been paid", 400)
            }

            // Update the ticket as used
            const updatedTicket = await tx.tickets.update({
                where: {
                    ticketId: foundTicket.ticketId
                },
                data: {
                    status: "USED"
                },
                include: {
                    user: true,
                    schedule: true,
                    seat: true
                }
            });

            return updatedTicket;
        });

        return ticket;
    } catch (error) {
        console.error("Error scanning ticket: ", error);
        throw error;
    }
};