import { PrismaClient, Prisma } from "../../generated/prisma";
import { AppError } from "../utils/errorHandler";

const prisma = new PrismaClient();

export const addTheater = async (adminId, theaterData) => {
    try {
        const theaterAdmin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!theaterAdmin) {
            throw new AppError("Theater admin not found", 404);
        }

        if (!["THEATER_ADMIN", "SUPER_ADMIN"].includes(theaterAdmin.role)) {
            throw new AppError("Unauthorized: You do not have permission to add theaters", 401);
        }

        const {name, location, phone, email} = theaterData;

        const newTheater = await prisma.theaters.create({
            data: {
                name: name,
                location: location,
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

export const getAllTheaters = async ({page = 1, limit = 10, search = ''}) => {
    try {
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const theaters = await prisma.theaters.findMany({
            where: {
                name: {
                    contains: search || '',
                    mode: 'insensitive'
                },
                location: {
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

        return theaters;
    } catch (error) {
        console.error("Theaters fetching error: ", error);
        throw error;
    }
};

export const getTheaterById = async (theaterId) => {
    try {
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
        const theaterAdmin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!theaterAdmin) {
            throw new AppError("Theater admin not found", 404);
        }

        if (!["THEATER_ADMIN", "SUPER_ADMIN"].includes(theaterAdmin.role)) {
            throw new AppError("Unauthorized: You do not have permission to update theaters", 401);
        }

        const updateData = {};

        if (theaterData.name !== undefined) updateData.name = theaterData.name;
        if (theaterData.location !== undefined) updateData.location = theaterData.location;
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
        const theaterAdmin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!theaterAdmin) {
            throw new AppError("Theater admin not found", 404);
        }

        if (!["THEATER_ADMIN", "SUPER_ADMIN"].includes(theaterAdmin.role)) {
            throw new AppError("Unauthorized: You do not have permission to delete theaters", 401);
        }

        await prisma.theaters.delete({
            where: {
                theaterId: theaterId
            }
        });
    } catch (error) {
        console.error("Theater deletion error: ", error);
        throw error;
    }
};

export const createTheaterScreen = async (adminId, theaterId, screenData, seatsData) => {
    try {
        const theaterAdmin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!theaterAdmin) {
            throw new AppError("Theater admin not found", 404);
        }

        if (!["THEATER_ADMIN", "SUPER_ADMIN"].includes(theaterAdmin.role)) {
            throw new AppError("Unauthorized: You do not have permission to create screens", 401);
        }

        const theater = await prisma.theaters.findUnique({
            where: {
                theaterId: theaterId
            }
        });
        if (!theater) {
            throw new AppError("Theater not found", 404);
        }

        const {name} = screenData;
        const {totalRows, seatsPerRows, seatType, seatPrice, customSeats = []} = seatsData;

        const newScreen = await prisma.$transaction(async (prism) => {
            // Create screen
            const screen = await prism.screens.create({
                data: {
                    name: name,
                    theaterId: theaterId
                }
            });

            // Create seats
            const seats = [];
            const rowLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            for (let i = 0; i < totalRows; i++) {
                const row = rowLetters[i];
                for (let j = 1; j < seatsPerRows; j++) {
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
            await prisma.seats.createMany({
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

            return screen;
        });

        return newScreen;
    } catch (error) {
        console.error("Screen creation error: ", error);
        throw error;
    }
};

export const getAllScreens = async ({page = 1, limit = 10}) => {
    try {
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const screens = await prisma.screens.findMany({
            skip: skip,
            take: limitNum,
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                screenId: true,
                name: true,
                screenCapacity: true,
                theater: {
                    select: {
                        theaterId: true,
                        name: true
                    }
                }
            }
        });

        return screens;
    } catch (error) {
        console.error("Screen fetching error: ", error);
        throw error;
    }
};

export const getScreenByTheater = async (theaterId) => {
    try {
        const screens = await prisma.screens.findMany({
            where: {
                theaterId: theaterId
            },
            include: {
                seats: {
                    orderBy: {
                        seatRow: 'asc',
                        seatNumber: 'asc'
                    }
                }
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
                screenId: screenIds
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

export const getScreenById = async (screenId) => {
    try {
        const screen = await prisma.screens.findUnique({
            where: {
                screenId: screenId
            },
            select: {
                screenId: true,
                name: true,
                screenCapacity: true
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
        const theaterAdmin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!theaterAdmin) {
            throw new AppError("Theater admin not found", 404);
        }

        if (!["THEATER_ADMIN", "SUPER_ADMIN"].includes(theaterAdmin.role)) {
            throw new AppError("Unauthorized: You do not have permission to update screens", 401);
        }

        const theater = await prisma.theaters.findUnique({
            where: {
                theaterId: theaterId
            }
        });
        if (!theater) {
            throw new AppError("Theater not found", 404);
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
        const theaterAdmin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!theaterAdmin) {
            throw new AppError("Theater admin not found", 404);
        }

        if (!["THEATER_ADMIN", "SUPER_ADMIN"].includes(theaterAdmin.role)) {
            throw new AppError("Unauthorized: You do not have permission to delete screens", 401);
        }

        const theater = await prisma.theaters.findUnique({
            where: {
                theaterId: theaterId
            }
        });
        if (!theater) {
            throw new AppError("Theater not found", 404);
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
            // Delete screen
            await prism.screens.delete({
                where: {
                    screenId: screenId
                }
            });

            // Delete seats
            await prism.seats.deleteMany({
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
        const theaterAdmin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!theaterAdmin) {
            throw new AppError("Theater admin not found", 404);
        }

        if (!["THEATER_ADMIN", "SUPER_ADMIN"].includes(theaterAdmin.role)) {
            throw new AppError("Unauthorized: You do not have permission to update screen seats", 401);
        }

        const theater = await prisma.theaters.findUnique({
            where: {
                theaterId: theaterId
            }
        });
        if (!theater) {
            throw new AppError("Theater not found", 404);
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