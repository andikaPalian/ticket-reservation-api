import { PrismaClient } from "../../generated/prisma/index.js";
import { AppError } from "../utils/errorHandler.js";
import QRCode from 'qrcode';
import { v4 as uuid } from "uuid";
// import { stripe } from "../config/stripe.js";

const prisma = new PrismaClient();

// Create a ticket or book seats/tickets
export const createTicket = async (userId, theaterId, scheduleId, seatIds) => {
    try {
        // Validate user, theater, schedule
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

// Cancel a ticket or cancel booked seats/tickets
export const cancelTicket = async (userId, ticketIds) => {
    try {
        // Validate user
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

// Admin: Get all tickets with user and schedule details
export const getAllTickets = async (adminId) => {
    try {
        // Validate admin
        const admin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!admin) {
            throw new AppError("Admin not found", 404);
        }

        // Check admin role
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

// Admin: Get ticket by ID with user and schedule details
export const getTicketById = async (adminId, ticketId) => {
    try {
        // Validate admin
        const admin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!admin) {
            throw new AppError("Admin not found", 404);
        }

        // Check admin role
        if (!["SUPER_ADMIN", "THEATER_ADMIN"].includes(admin.role)) {
            throw new AppError("Unauthorized: You do not have permission to view tickets", 403);
        }

        // Get the ticket details
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

        // If admin role is theater admin, check if the ticket belongs to their theater
        if (admin.role === "THEATER_ADMIN") {
            // Get the theater ID from the ticket's schedule
            const theaterId = ticket.schedule.screen.theater.theaterId;

            // Validate theater
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

            // Check if the admin is associated with the theater
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

// User: Get ticket history with pagination and status filter
export const getTicketHistoryByUser = async (userId, statusFilter, {page = 1, limit = 10}) => {
    try {
        // pagination calculation
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        // Validate user
        const user = await prisma.user.findUnique({
            where: {
                userId: userId
            }
        });
        if (!user) {
            throw new AppError("User not found", 404);
        }

        // Build the where clause based on status filter
        const whereClause = {
            userId: userId
        };

        // Add status filter if provided and valid
        if (statusFilter && ["PENDING", "PAID", "USED", "CANCELED", "EXPIRED"].includes(statusFilter)) {
            whereClause.status = statusFilter;
        }

        // Get total count for pagination
        const totalTickets = await prisma.tickets.count({
            where: whereClause
        });

        // Fetch tickets with pagination and sorting by booktime desc
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

        // Format the tickets to include seat as a string and make is more readable
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

// User: Generate QR code for tickets
export const generateQrCode = async (userId, ticketIds) => {
    try {
        // Validate user
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
    
        // Generate QR codes for each ticket
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
            
            // Push to result
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

// Admin: Update ticket status (e.g., mark as USED, CANCELED, EXPIRED)
export const updateTicketStatus = async (adminId, ticketId, status) => {
    try {
        // Validate admin
        const admin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!admin) {
            throw new AppError("Admin not found", 404);
        }

        // Check admin role
        if (!["SUPER_ADMIN", "THEATER_ADMIN"].includes(admin.role)) {
            throw new AppError("Unauthorized: You do not have permission to update tickets", 403);
        }

        // If admin role is theater admin, check if the ticket belongs to their theater
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

            // Check if the admin is associated with the theater
            const isTheaterAdmin = ticket.schedule.screen.theater.admin.some((admin) => admin.adminId === adminId);
            if (!isTheaterAdmin) {
                throw new AppError("Unauthorized: You do not have permission to update this ticket", 403);
            }
        }

        // Validate ticket
        const ticket = await prisma.tickets.findUnique({
            where: {
                ticketId: ticketId
            }
        });
        if (!ticket) {
            throw new AppError("Ticket not found", 404);
        }

        // Validate ticket status
        const statuses = ["PAID", "USED", "CANCELED", "EXPIRED"];
        if (!statuses.includes(status)) {
            throw new AppError("Invalid status", 400);
        }

        // Update the ticket status
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

// Admin: Scan a ticket using QR code
export const scanTicket = async (adminId, qrCodeToken) => {
    try {
        // Validate admin
        const admin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!admin) {
            throw new AppError("Admin not found", 404);
        }

        // Check admin role
        if (!["THEATER_ADMIN", "SUPER_ADMIN"].includes(admin.role)) {
            throw new AppError("Unauthorized: You do not have permission to scan tickets", 403);
        }

        // If admin role is theater admin, check if the ticket belongs to their theater
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

            // Check if the admin is associated with the theater
            const isTheaterAdmin = ticket.schedule.screen.theater.admin.some((admin) => admin.adminId === adminId);
            if (!isTheaterAdmin) {
                throw new AppError("Unauthorized: You do not have permission to scan this ticket", 403);
            }
        }

        // Validate QR code token
        if (!qrCodeToken) {
            throw new AppError("QR code is required", 400);
        }

        // Find the ticket by QR code token
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

            // Check if the ticket is already used
            if (foundTicket.status === "USED") {
                throw new AppError("Ticket has already been used", 400);
            }

            // Check if the ticket is not paid
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