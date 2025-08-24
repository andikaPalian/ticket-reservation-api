import { PrismaClient } from "../../generated/prisma/index.js";
import { AppError } from "../utils/errorHandler.js";

const prisma = new PrismaClient();

export const createMovieSchedule = async (adminId, theaterId, screenId, scheduleData) => {
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
            throw new AppError("Unauthorized: You do not have permission to add schedules", 403);
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
                },
                screens: {
                    select: {
                        screenId: true
                    }
                }
            }
        });
        if (!theater) {
            throw new AppError("Theater not found", 404);
        }

        if (theaterAdmin.role === "THEATER_ADMIN") {
            const isTheaterAdmin = theater.admin.some((admin) => admin.adminId === adminId);
            if  (!isTheaterAdmin) {
                throw new AppError("Unauthorized: You do not have permission to add schedules", 403);
            }
        }

        const isScreenOfTheater = theater.screens.some((screen) => screen.screenId === screenId);
        if (!isScreenOfTheater) {
            throw new AppError("Screen not found in this theater", 404);
        }

        const {movieId, startTime, endTime} = scheduleData;

        if (new Date(startTime) >= new Date(endTime)) {
            throw new AppError("Start time must be before end time", 400);
        }

        // Check if the movie and screen exist
        const [movie, screen] = await Promise.all([
            prisma.movies.findUnique({
                where: {
                    movieId: movieId
                }
            }),
            prisma.screens.findUnique({
                where: {
                    screenId: screenId
                }
            })
        ]);

        if (!movie) {
            throw new AppError("Movie not found", 404);
        }

        if (!screen) {
            throw new AppError("Screen not found", 404);
        }
        
        // Check schedule conflicts
        const overlapping = await prisma.movieSchedules.findFirst({
            where: {
                screenId: screenId,
                OR: [{
                    startTime: {
                        lt: new Date(endTime)
                    },
                    endTime: {
                        gt: new Date(startTime)
                    }
                }]
            }
        });
        if (overlapping) {
            throw new AppError("Schedule overlaps with existing schedule", 400);
        }

        const newSchedule = await prisma.movieSchedules.create({
            data: {
                movieId: movieId,
                screenId: screenId,
                startTime: startTime,
                endTime: endTime
            },
            include: {
                movie: true,
                screen: true
            }
        });

        return newSchedule;
    } catch (error) {
        console.error("Error creating movie schedule: ", error);
        throw error;
    }
};

export const getAllSchedules = async (adminId, {page = 1, limit = 10}) => {
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
            throw new AppError("Unauthorized: You do not have permission to view schedules", 403);
        }

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const schedules = await prisma.movieSchedules.findMany({
            include: {
                movie: true,
                screen: true
            },
            skip: skip,
            take: limitNum,
            orderBy: {
                startTime: 'desc'
            }
        });

        return schedules;
    } catch (error) {
        console.error("Error fetching movie schedules: ", error);
        throw error;
    }
};

export const getScheduleById = async (scheduleId) => {
    try {
        const schedule = await prisma.movieSchedules.findUnique({
            where: {
                scheduleId: scheduleId
            },
            include: {
                movie: true,
                screen: true
            }
        });

        return schedule;
    } catch (error) {
        console.error("Error fetching movie schedule: ", error);
        throw error;
    }
};

export const getScheduleByTheater = async (adminId, theaterId) => {
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
            throw new AppError("Unauthorized: You do not have permission to view schedules", 403);
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
                throw new AppError("Unauthorized: You do not have permission to view schedules", 403);
            }
        }

        const schedules = await prisma.movieSchedules.findMany({
            where: {
                screen: {
                    theaterId: theaterId
                }
            },
            include: {
                movie: true,
                screen: true
            }
        });

        return schedules;
    } catch (error) {
        console.error("Error fetching movie schedules: ", error);
        throw error;
    }
};

export const getScheduleByMovie = async (movieId) => {
    try {
        const movie = await prisma.movies.findUnique({
            where: {
                movieId: movieId
            }
        });
        if (!movie) {
            throw new AppError("Movie not found", 404);
        }

        const schedule = await prisma.movieSchedules.findMany({
            where: {
                movieId: movieId
            },
            include: {
                movie: true,
                screen: true
            }
        });

        return schedule;
    } catch (error) {
        console.error("Error fetching movie schedule: ", error);
        throw error;
    }
};

export const getScheduleByScreen = async (screenId) => {
    try {
        const screen = await prisma.screens.findMany({
            where: {
                screenId: screenId
            }
        });
        if (!screen) {
            throw new AppError("Screen not found", 404);
        }
        
        const schedule = await prisma.movieSchedules.findMany({
            where: {
                screenId: screenId
            },
            include: {
                movie: true,
                screen: true
            }
        });

        return schedule;
    } catch (error) {
        console.error("Error fetching movie schedule: ", error);
        throw error;
    }
};

export const getScheduleByDate = async (date) => {
    try {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        const schedule = await prisma.movieSchedules.findMany({
            where: {
                startTime: {
                    gte: start,
                    lte: end
                }
            },
            include: {
                movie: true,
                screen: true
            }
        });

        return schedule;
    } catch (error) {
        console.error("Error fetching movie schedule: ", error);
        throw error;
    }
};

export const findAvailableScreen = async (adminId, theaterId) => {
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
            throw new AppError("Unauthorized: You do not have permission to add theaters", 403);
        }

        if (theaterAdmin.role === "THEATER_ADMIN") {
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
                throw new AppError("Unauthorized: You do not have permission to add theaters", 403);
            }
        }

        // Count seats stats
        const seatStats = await prisma.seats.groupBy({
            by: ["screenId", "isAvailable"],
            where: {
                screen: {
                    theaterId: theaterId
                }
            },
            _count: {
                seatId: true
            }
        });

        const screens = await prisma.screens.findMany({
            where: {
                theaterId: theaterId
            },
            include: {
                theater: true
            }
        });

        return screens.map((screen) => {
            const availableSeats = seatStats.find((seat) => seat.screenId === screen.screenId && seat.isAvailable === true)?._count.seatId || 0;

            const totalSeats = seatStats
            .filter((seat) => seat.screenId === screen.screenId)
            .reduce((sum, seat) => sum + seat._count.seatId, 0);

            return {
                ...screen,
                availableSeats,
                totalSeats
            };
        });
    } catch (error) {
        console.error("Error finding available screen: ", error);
        throw error;
    }
};

export const findAvailableSeats = async (userId, screenId) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                userId: userId
            }
        });
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const seats = await prisma.seats.findMany({
            where: {
                screenId: screenId,
                isAvailable: true
            }
        });

        return seats;
    } catch (error) {
        console.error("Error finding available seats: ", error);
        throw error;
    }
};

export const getAvailableSeatsBySchedule = async (userId, scheduleId) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                userId: userId
            }
        });
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const availableSeats = await prisma.movieSchedules.findUnique({
            where: {
                scheduleId: scheduleId
            },
            include: {
                movie: true,
                screen: {
                    include: {
                        seats: {
                            where: {
                                isAvailable: true
                            }
                        }
                    }
                }
            }
        });

        return availableSeats;
    } catch (error) {
        console.error("Error finding available seats by schedule: ", error);
        throw error;
    }
};

export const updateSchedule = async (adminId, scheduleId, scheduleData) => {
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
            throw new AppError("Unauthorized: You do not have permission to update theaters", 403);
        }

        if (theaterAdmin.role === "THEATER_ADMIN") {
            const schedule = await prisma.movieSchedules.findUnique({
                where: {
                    scheduleId: scheduleId
                },
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
            });
            if (!schedule) {
                throw new AppError("Schedule not found", 404);
            }

            const isTheaterAdmin = schedule.screen.theater.admin.some((admin) => admin.adminId === adminId);
            if (!isTheaterAdmin) {
                throw new AppError("Unauthorized: You do not have permission to update theaters", 403);
            }
        }

        const schedule = await prisma.movieSchedules.findUnique({
            where: {
                scheduleId: scheduleId
            }
        });
        if (!schedule) {
            throw new AppError("Schedule not found", 404);
        }

        // const {movieId, screenId, startTime, endTime} = scheduleData;

        const updateData = {};

        if (scheduleData.movieId !== undefined) {
            // Check if the movie exist
            const movie = await prisma.movies.findUnique({
                where: {
                    movieId: scheduleData.movieId
                }
            });
            if (!movie) {
                throw new AppError("Movie not found", 404);
            }

            updateData.movieId = scheduleData.movieId;
        }
        if (scheduleData.screenId !== undefined) {
            // Check if the screen exist
            const screen = await prisma.screens.findUnique({
                where: {
                    screenId: scheduleData.screenId
                }
            });
            if (!screen) {
                throw new AppError("Screen not found", 404);
            }

            updateData.screenId = scheduleData.screenId;
        }
        if (scheduleData.startTime !== undefined) {
            if (new Date(scheduleData.startTime) >= new Date(schedule.endTime)) {
                throw new AppError("Start time must be before end time", 400);
            }

            updateData.startTime = scheduleData.startTime;
        }
        if (scheduleData.endTime !== undefined) {
            if (new Date(scheduleData.endTime) <= new Date(schedule.startTime)) {
                throw new AppError("End time must be after start time", 400)
            }

            updateData.endTime = scheduleData.endTime;
        }

        const updatedSchedule = await prisma.movieSchedules.update({
            where: {
                scheduleId: scheduleId
            },
            data: updateData,
            include: {
                movie: true,
                screen: true
            }
        });

        return updatedSchedule;
    } catch (error) {
        console.error("Error updating movie schedule: ", error);
        throw error;
    }
};

export const deleteSchedule = async (adminId, scheduleId) => {
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
            throw new AppError("Unauthorized: You do not have permission to delete theaters", 403);
        }

        if (theaterAdmin.role === "THEATER_ADMIN") {
            const schedule = await prisma.movieSchedules.findUnique({
                where: {
                    scheduleId: scheduleId
                },
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
            });
            if (!schedule) {
                throw new AppError("Schedule not found", 404);
            }

            const isTheaterAdmin = schedule.screen.theater.admin.some((admin) => admin.adminId === adminId);
            if (!isTheaterAdmin) {
                throw new AppError("Unauthorized: You do not have permission to delete theaters", 403);
            }
        }

        const schedule = await prisma.movieSchedules.findUnique({
            where: {
                scheduleId: scheduleId
            },
            include: {
                tickets: true
            }
        });
        if (!schedule) {
            throw new AppError("Schedule not found", 404);
        }

        if (schedule.startTime < new Date()) {
            throw new AppError("Cannot delete a schedule that has already started", 404);
        }

        if (schedule.tickets && schedule.tickets.length > 0) {
            await prisma.tickets.deleteMany({
                where: {
                    scheduleId: scheduleId
                }
            });
        }

        await prisma.movieSchedules.delete({
            where: {
                scheduleId: scheduleId
            }
        });
    } catch (error) {
        console.error("Error deleting movie schedule: ", error);
        throw error;
    }
};