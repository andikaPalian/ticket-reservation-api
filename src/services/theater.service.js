import { PrismaClient, Prisma } from "../../generated/prisma/index.js";
import { AppError } from "../utils/errorHandler.js";

const prisma = new PrismaClient();

export const addTheater = async (adminId, theaterData) => {
    try {
        const superAdmin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!superAdmin) {
            throw new AppError("Theater admin not found", 404);
        }

        if (superAdmin.role !== "SUPER_ADMIN") {
            throw new AppError("Unauthorized: You do not have permission to add theaters", 401);
        }

        const {name, address, city, state, postalCode,latitude, longitude, phone, email} = theaterData;

        const newTheater = await prisma.theaters.create({
            data: {
                name: name,
                address: address,
                city: city,
                state: state,
                postalCode: postalCode,
                latitude: latitude,
                longitude: longitude,
                // location: location,
                // capacity: capacity,
                phone: phone,
                email: email
            }
        });

        return newTheater;
    } catch (error) {
        console.error("Theater addition error: ", error);
        throw error;
    }
};

export const getAllTheaters = async (adminId, {page = 1, limit = 10, search = ''}) => {
    try {
        const admin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!admin) {
            throw new AppError("Theater admin not found", 404);
        }

        if (admin.role !== "SUPER_ADMIN") {
            throw new AppError("Unauthorized: You do not have permission to fetch theaters", 403);
        }

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const theaters = await prisma.theaters.findMany({
            where: {
                name: {
                    contains: search || '',
                    mode: 'insensitive'
                }
            },
            include: {
                screens: true
            },
            skip: skip,
            take: limitNum,
            orderBy: {
                createdAt: 'desc'
            },
        });

        const total = await prisma.theaters.count({
            where: {
                name: {
                    contains: search || '',
                    mode: 'insensitive'
                }
            }
        });

        return {
            thaaters: theaters,
            total: total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum)
        };
    } catch (error) {
        console.error("Theaters fetching error: ", error);
        throw error;
    }
};

export const getTheaterById = async (adminId, theaterId) => {
    try {
        const admin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!admin) {
            throw new AppError("Theater admin not found", 404);
        }

        if (admin.role !== "SUPER_ADMIN") {
            throw new AppError("Unauthorized: You do not have permission to fetch theaters", 403);
        }

        const theater = await prisma.theaters.findUnique({
            where: {
                theaterId: theaterId
            },
            include: {
                screens: true
            }
        });

        return theater;
    } catch (error) {
        console.error("Theater fetching error: ", error);
        throw error;
    }
};

export const updateTheater = async (adminId, theaterId, theaterData) => {
    try {
        const superAdmin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!superAdmin) {
            throw new AppError("Theater admin not found", 404);
        }

        if (superAdmin.role !== "SUPER_ADMIN") {
            throw new AppError("Unauthorized: You do not have permission to update theaters", 401);
        }

        const updateData = {};

        if (theaterData.name !== undefined) updateData.name = theaterData.name;
        if (theaterData.address !== undefined) updateData.address = theaterData.address;
        if (theaterData.city !== undefined) updateData.city = theaterData.city;
        if (theaterData.state !== undefined) updateData.state = theaterData.state;
        if (theaterData.postalCode !== undefined) updateData.postalCode = theaterData.postalCode;
        if (theaterData.latitude !== undefined) updateData.latitude = theaterData.latitude;
        if (theaterData.longitude !== undefined) updateData.longitude = theaterData.longitude;
        // if (theaterData.location !== undefined) updateData.location = theaterData.location;
        if (theaterData.phone !== undefined) updateData.phone = theaterData.phone;
        if (theaterData.email !== undefined) updateData.email = theaterData.email;

        const updatedTheater = await prisma.theaters.update({
            where: {
                theaterId: theaterId
            },
            data: updateData
        });

        return updatedTheater;
    } catch (error) {
        console.error("Theater update error: ", error);
        throw error;
    }
};

export const deleteTheater = async (adminId, theaterId) => {
    try {
        const superAdmin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!superAdmin) {
            throw new AppError("Theater admin not found", 404);
        }

        if (superAdmin.role !== "SUPER_ADMIN") {
            throw new AppError("Unauthorized: You do not have permission to delete theaters", 401);
        }

        const theater = await prisma.theaters.findUnique({
            where: {
                theaterId: theaterId
            },
            include: {
                screens: true,
                admin: true
            }
        });
        if (!theater) {
            throw new AppError("Theater not found", 404);
        }

        await prisma.$transaction(async (tx) => {
            // Delete screens associated with the theater
            if (theater.screens.length > 0) {
                await tx.screens.deleteMany({
                    where: {
                        theaterId: theaterId
                    }
                });
            }

            // Delete admins associated with the theater
            if (theater.admin.length > 0) {
                await tx.theaters.update({
                    where: {
                        theaterId: theaterId
                    },
                    data: {
                        admin: {
                            set: []
                        }
                    }
                });
            }

            // Delete the theater
            await tx.theaters.delete({
                where: {
                    theaterId: theaterId
                }
            });
        })
    } catch (error) {
        console.error("Theater deletion error: ", error);
        throw error;
    }
};

export const createTheaterScreen = async (adminId, theaterId, screenData, seatsData) => {
    try {
        const admin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!admin) {
            throw new AppError("Theater admin not found", 404);
        }

        if (!["THEATER_ADMIN", "SUPER_ADMIN"].includes(admin.role)) {
            throw new AppError("Unauthorized: You do not have permission to create screens", 401);
        }

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

        if (admin.role === "THEATER_ADMIN") {
            const isTheaterAdmin = theater.admin.some((admin) => admin.adminId === adminId);
            if (!isTheaterAdmin) {
                throw new AppError("Unauthorized: You do not have permission to create screens", 401);
            }
        }

        const {name} = screenData;
        const {totalRows, seatsPerRows, seatType, seatPrice, customSeats = []} = seatsData;

        const newScreen = await prisma.$transaction(async (prism) => {
            // Create screen
            const screen = await prism.screens.create({
                data: {
                    name: name,
                    theaterId: theaterId,
                    screenCapacity: totalRows * seatsPerRows
                }
            });

            // Create seats
            const seats = [];
            const rowLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            for (let i = 0; i < totalRows; i++) {
                const row = rowLetters[i];
                for (let j = 1; j <= seatsPerRows; j++) {
                    const seatNumber = j.toString();

                    // Check if custom seat exists
                    const customSeat = customSeats.find((seat) => seat.row === row && seat.seatNumber === seatNumber);

                    const seatData = {
                        screenId: screen.screenId,
                        seatRow: row,
                        seatNumber: seatNumber,
                        seatType: customSeat?.seatType || seatType,
                        seatPrice: new Prisma.Decimal(
                            customSeat?.seatPrice || seatPrice
                        ),
                        isAvailable: true
                    };

                    seats.push(seatData);
                }
            }

            // Insert seats
            await prism.seats.createMany({
                data: seats
            });

            // Update screen capacity
            await prism.screens.update({
                where: {
                    screenId: screen.screenId
                },
                data: {
                    screenCapacity: totalRows * seatsPerRows
                }
            });

            // Update theater capacity
            await prism.theaters.update({
                where: {
                    theaterId: theaterId
                },
                data: {
                    theaterCapacity: theater.theaterCapacity + screen.screenCapacity
                }
            });

            const screenWithSeats = await prism.screens.findUnique({
                where: {
                    screenId: screen.screenId
                },
                include: {
                    seats: true
                }
            });

            return screenWithSeats;
        });

        return newScreen;
    } catch (error) {
        console.error("Screen creation error: ", error);
        throw error;
    }
};

export const getAllScreens = async (adminId, {page = 1, limit = 10}) => {
    try {
        const admin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!admin) {
            throw new AppError("Admin not found", 404);
        }

        if (admin.role !== "SUPER_ADMIN") {
            throw new AppError("Unauthorized: You do not have permission to view screens", 403);
        }

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const screens = await prisma.screens.findMany({
            skip: skip,
            take: limitNum,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                seats: true
            }
        });

        return screens;
    } catch (error) {
        console.error("Screen fetching error: ", error);
        throw error;
    }
};

export const getScreenByTheater = async (adminId, theaterId) => {
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
            throw new AppError("Unauthorized: You do not have permission to view screens", 401);
        }

        if (admin.role === "THEATER_ADMIN") {
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
                throw new AppError("Unauthorized: You do not have permission to view screens", 401);
            }
        }

        const screens = await prisma.screens.findMany({
            where: {
                theaterId: theaterId
            },
            include: {
                seats: true
            }
        });
        if (!screens.length) {
            throw new AppError("No screens found for this theater", 404);
        }

        // const screenWithSeats = screens.map(async (screen) => {
        //     const [totalSeats, availableSeats] = await prisma.$transaction([
        //         prisma.seats.count({
        //             where: {
        //                 screenId: screen.screenId
        //             }
        //         }),
        //         prisma.seats.count({
        //             where: {
        //                 screenId: screen.screenId
        //             }
        //         })
        //     ]);

        //     return {
        //         ...screen,
        //         totalSeats,
        //         availableSeats
        //     };
        // });

        const screenIds = screens.map((screen) => screen.screenId);

        // Get seats stats (total and available) per screen
        const seatsStats = await prisma.seats.groupBy({
            by: ['screenId', 'isAvailable'],
            where: {
                screenId: {
                    in: screenIds
                }
            },
            _count: {
                seatId: true,
                isAvailable: true
            }
        });

        // Merge seats stats with screens
        const screenWithSeatsCounts = screens.map((screen) => {
            const statsForScreen = seatsStats.find((stat) => stat.screenId === screen.screenId);

            const totalSeats = statsForScreen._count.seatId;
            const availableSeats = statsForScreen._count.isAvailable;

            return {
                ...screen,
                totalSeats,
                availableSeats
            };
        });
        
        return screenWithSeatsCounts;
    } catch (error) {
        console.error("Screen fetching error: ", error);
        throw error;
    }
};

export const getScreenById = async (adminId, screenId) => {
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
            throw new AppError("Unauthorized: You do not have permission to view screens", 403);
        }

        if (admin.role === "THEATER_ADMIN") {
            const screen = await prisma.screens.findUnique({
                where: {
                    screenId: screenId
                },
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
            });
            if (!screen) {
                throw new AppError("Screen not found", 404);
            }

            const isTheaterAdmin = screen.theater.admin.some((admin) => admin.adminId === adminId);
            if (!isTheaterAdmin) {
                throw new AppError("Unauthorized: You do not have permission to view screens", 403);
            }
        }

        const screen = await prisma.screens.findUnique({
            where: {
                screenId: screenId
            },
            include: {
                seats: true
            }
        });

        const seats = await prisma.seats.findMany({
            where: {
                screenId: screenId
            },
            select: {
                seatId: true,
                seatRow: true,
                seatNumber: true,
                seatType: true,
                seatPrice: true,
                isAvailable: true
            }
        });

        
        return {
            ...screen,
            seats
        };
    } catch (error) {
        console.error("Screen fetching error: ", error);
        throw error;
    }
};

export const updateTheaterScreen = async (adminId, theaterId, screenId, screenData) => {
    try {
        const admin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!admin) {
            throw new AppError("Theater admin not found", 404);
        }

        if (!["THEATER_ADMIN", "SUPER_ADMIN"].includes(admin.role)) {
            throw new AppError("Unauthorized: You do not have permission to update screens", 403);
        }

        if (admin.role === "THEATER_ADMIN") {
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
                throw new AppError("Unauthorized: You do not have permission to update screens for this theater", 403);
            }
        }

        const screen = await prisma.screens.findUnique({
            where: {
                screenId: screenId
            }
        });
        if (!screen) {
            throw new AppError("Screen not found", 404);
        }

        const {name} = screenData;

        const updatedScreen = await prisma.screens.update({
            where: {
                screenId: screenId
            },
            data: {
                name: name
            }
        });

        return updatedScreen;
    } catch (error) {
        console.error("Error updating screen: ", error);
        throw error;
    }
};

export const deleteScreen = async (adminId, theaterId, screenId) => {
    try {
        const admin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!admin) {
            throw new AppError("Theater admin not found", 404);
        }

        if (!["THEATER_ADMIN", "SUPER_ADMIN"].includes(admin.role)) {
            throw new AppError("Unauthorized: You do not have permission to delete screens", 401);
        }

        if (admin.role === "THEATER_ADMIN") {
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
                throw new AppError("Unauthorized: You do not have permission to delete screens for this theater", 401);
            }
        }

        const screen = await prisma.screens.findUnique({
            where: {
                screenId: screenId
            }
        });
        if (!screen) {
            throw new AppError("Screen not found", 404);
        }

        await prisma.$transaction(async (prism) => {
            // Delete seats
            await prism.seats.deleteMany({
                where: {
                    screenId: screenId
                }
            });

            // Delete screen
            await prism.screens.delete({
                where: {
                    screenId: screenId
                }
            });
        });
    } catch (error) {
        console.error("Screen deletion error: ", error);
        throw error;
    }
};

export const updateScreenSeats = async (adminId, theaterId, screenId, seatsData) => {
    try {
        const admin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!admin) {
            throw new AppError("Theater admin not found", 404);
        }

        if (!["THEATER_ADMIN", "SUPER_ADMIN"].includes(admin.role)) {
            throw new AppError("Unauthorized: You do not have permission to update screen seats", 401);
        }

        if (admin.role === "THEATER_ADMIN") {
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
                throw new AppError("Unauthorized: You do not have permission to update screen seats for this theater", 401);
            }
        }

        const {totalRows, seatsPerRows, seatType, seatPrice, customSeats = []} = seatsData;

        if (totalRows && seatsPerRows) {
            // Delete existing seats
            await prisma.seats.deleteMany({
                where: {
                    screenId: screenId
                }
            });

            const newSeats = [];
            const rowLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

            for (let i = 0; i < totalRows; i++) {
                const row = rowLetters[i];
                for (let j = 1; j < seatsPerRows; j++) {
                    // const seatNumber = j.toString();

                    const seat = {
                        screenId: screenId,
                        seatRow: row,
                        seatNumber: j.toString(),
                        seatType: seatType,
                        seatPrice: new Prisma.Decimal(seatPrice),
                        isAvailable: true
                    };

                    newSeats.push(seat);
                }
            }

            await prisma.seats.createMany({
                data: newSeats
            });

            // Update screen capacity
            await prisma.screens.update({
                where: {
                    screenId: screenId
                },
                data: {
                    screenCapacity: totalRows * seatsPerRows
                }
            });

            return {
                message: "Seats regenerated successfully"
            };
        }

        // Update custom seats or half seats
        if (customSeats.length > 0) {
            await prisma.$transaction(async (prism) => {
                for (const seat of customSeats) {
                    const seatExists = await prism.seats.findFirst({
                        where: {
                            seatId: seat.seatId,
                            screenId: screenId
                        }
                    });
                    if (!seatExists) {
                        throw new AppError(`Seat ${seat.seatId} not found in this screen`, 404);
                    }

                    await prism.seats.update({
                        where: {
                            seatId: seat.seatId
                        },
                        data: {
                            ...(seat.seatType && {seatType: seat.seatType}),
                            ...(seat.seatPrice && {seatPrice: new Prisma.Decimal(seat.seatPrice)})
                        }
                    });
                }
            });

            return {
                message: "Seats updated successfully"
            };
        }
    } catch (error) {
        console.error("Screen seats update error: ", error);
        throw error;
    }
};

export const getSeatsByScreen = async (screenId) => {
    try {
        const screen = await prisma.screens.findUnique({
            where: {
                screenId: screenId
            }
        });
        if (!screen) {
            throw new AppError("Screen not found", 404);
        }

        const seats = await prisma.seats.findMany({
            where: {
                screenId: screenId
            }
        });

        // for (const seat of seats) {
        //     return [{
        //         seatId: seat.seatId,
        //         seat: seat.seatRow + seat.seatNumber,
        //         seatType: seat.seatType,
        //         seatPrice: seat.seatPrice,
        //         isAvailable: seat.isAvailable
        //     }];
        // }

        // const seatNames = [];
        const seatResult = [];
        for (const seat of seats) {
            const seatNames = seat.seatRow + seat.seatNumber;
            seatResult.push({
                seatId: seat.seatId,
                seat: seatNames,
                seatType: seat.seatType,
                seatPrice: seat.seatPrice,
                isAvailable: seat.isAvailable
            });
            // seatNames.push(seat.seatRow + seat.seatNumber);

            // return seatResult;
        }

        // return [{
        //     seatId: seats.seatId,
        //     seat: seatNames,
        //     seatType: seats.seatType,
        //     seatPrice: seats.seatPrice,
        //     isAvailable: seats.isAvailable
        // }];
        return seatResult;
    } catch (error) {
        console.error("Seats fetching error: ", error);
        throw error;
    }
};

export const getSeatsById = async (screenId, seatId) => {
    try {
        const screen = await prisma.screens.findUnique({
            where: {
                screenId: screenId
            }
        });
        if (!screen) {
            throw new AppError("Screen not found", 404);
        }

        const seat = await prisma.seats.findUnique({
            where: {
                seatId: seatId
            }
        });
        if (!seat) {
            throw new AppError("Seat not found", 404);
        }

        // const seatName = `${seat.seatRow} + ${seat.seatNumber}`;
        const seatName = seat.seatRow + seat.seatNumber;

        return {
            seatId: seat.seatId,
            seat: seatName,
            seatType: seat.seatType,
            seatPrice: seat.seatPrice,
            isAvailable: seat.isAvailable
        };
    } catch (error) {
        console.error("Error fetching seat: ", error);
        throw error;
    }
};