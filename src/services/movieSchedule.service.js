import { PrismaClient } from "../../generated/prisma/index.js";
import { AppError } from "../utils/errorHandler.js";

const prisma = new PrismaClient();

// Admin: Create movie schedule
export const createMovieSchedule = async (adminId, theaterId, screenId, scheduleData) => {
    try {
        // Check if the admin is exists or not
        const theaterAdmin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!theaterAdmin) {
            throw new AppError("Theater admin not found", 404);
        }

        // Check if the admin role is SUPER_ADMIN or THEATER_ADMIN
        if (!["THEATER_ADMIN", "SUPER_ADMIN"].includes(theaterAdmin.role)) {
            throw new AppError("Unauthorized: You do not have permission to add schedules", 403);
        }

        // Check if the theater exists
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

        // If the admin role is THEATER_ADMIN, check if the admin is a theater admin of the theater
        if (theaterAdmin.role === "THEATER_ADMIN") {
            // Validate if the admin is a admin of the theater
            const isTheaterAdmin = theater.admin.some((admin) => admin.adminId === adminId);
            if  (!isTheaterAdmin) {
                throw new AppError("Unauthorized: You do not have permission to add schedules", 403);
            }
        }

        // Check if the screen exists
        const isScreenOfTheater = theater.screens.some((screen) => screen.screenId === screenId);
        if (!isScreenOfTheater) {
            throw new AppError("Screen not found in this theater", 404);
        }

        // Destructure the schedule data
        const {movieId, startTime, endTime} = scheduleData;

        // Check if the start time is before the end time
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

        // Create the movie schedule
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

// Admin: Get all movie schedules
export const getAllSchedules = async (adminId, {page = 1, limit = 10}) => {
    try {
        // Check if the admin is exists or not
        const admin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!admin) {
            throw new AppError("Admin not found", 404);
        }

        // Check if the admin role is SUPER_ADMIN or not
        if (admin.role !== "SUPER_ADMIN") {
            throw new AppError("Unauthorized: You do not have permission to view schedules", 403);
        }

        // Pagination calculation
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        // Fetch movbie schedules
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

// Get movie schedule by ID
export const getScheduleById = async (scheduleId) => {
    try {
        // Fetch movie schedule by ID
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

// Admin: Get movie schedules by theater
export const getScheduleByTheater = async (adminId, theaterId) => {
    try {
        // Check if the admin is exists or not
        const admin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!admin) {
            throw new AppError("Admin not found", 404);
        }

        // Check if the admin role is SUPER_ADMIN or THEATER_ADMIN
        if (!["THEATER_ADMIN", "SUPER_ADMIN"].includes(admin.role)) {
            throw new AppError("Unauthorized: You do not have permission to view schedules", 403);
        }

        // If the admin role is THEATER_ADMIN, check if the admin is theater admin of the theater
        if (admin.role === "THEATER_ADMIN") {
            // Check if the theater exists
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

            // Check if the admin is admin of the theater
            const isTheaterAdmin = theater.admin.some((admin) => admin.adminId === adminId);
            if (!isTheaterAdmin) {
                throw new AppError("Unauthorized: You do not have permission to view schedules", 403);
            }
        }

        // Fetch movie schedules
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

// Get movie schedule by movie
export const getScheduleByMovie = async (movieId) => {
    try {
        // Check if the movie exists
        const movie = await prisma.movies.findUnique({
            where: {
                movieId: movieId
            }
        });
        if (!movie) {
            throw new AppError("Movie not found", 404);
        }

        // Fetch movie schedules that belong to the movie
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

// Get movie schedule by screen
export const getScheduleByScreen = async (screenId) => {
    try {
        // Check if the screen exists
        const screen = await prisma.screens.findMany({
            where: {
                screenId: screenId
            }
        });
        if (!screen) {
            throw new AppError("Screen not found", 404);
        }
        
        // Fetch movie schedules that belong to the screeb
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

// Get movie schedule by date
export const getScheduleByDate = async (date) => {
    try {
        // Set a time stamps in the beginning and end of the day (one full day) based on specified date
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        // Fetch movie schedules based on the time stamps
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

// Admin: Find available screen
export const findAvailableScreen = async (adminId, theaterId) => {
    try {
        // Check if the admin is exists or not
        const theaterAdmin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!theaterAdmin) {
            throw new AppError("Theater admin not found", 404);
        }

        // Check if the admin role is SUPER_ADMIN or THEATER_ADMIN
        if (!["THEATER_ADMIN", "SUPER_ADMIN"].includes(theaterAdmin.role)) {
            throw new AppError("Unauthorized: You do not have permission to add theaters", 403);
        }

        // If the admin role is THEATER_ADMIN, check if the admin is theater admin of the theater
        if (theaterAdmin.role === "THEATER_ADMIN") {
            // Check if the theater exists and include admin
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

            // Check if the admin is admin of the theater
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

        // Fetch screens of the theater include theater and schedules
        const screens = await prisma.screens.findMany({
            where: {
                theaterId: theaterId
            },
            include: {
                theater: true,
                schedules: true
            }
        });

        // Check if there is no schedule or all schedules are not ongoing
        const availabelScreen = screens.filter((screen) => {
            const now = new Date();
            // Chedk if there is no schedule or all schedules are not ongoing
            return !screen.schedules.some((schedule) => schedule.startTime < now && schedule.endTime > now);
        });
        if (availabelScreen.length === 0) {
            return {
                screen: [],
                message: "No available screen found"
            };
        }

        // Return available screen with available and total seats
        return availabelScreen.map((screen) => {
            // Find available seats and total seats
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

// User: Find available seats
export const findSeats = async (theaterId, screenId, scheduleId) => {
    try {
        // Check if the theater exists
        const theater = await prisma.theaters.findUnique({
            where: {
                theaterId: theaterId
            },
            include: {
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

        // Validate if the screen is in the theater
        const isScreenOfTheater = theater.screens.some((screen) => screen.screenId === screenId);
        if (!isScreenOfTheater) {
            throw new AppError("Screen not found in this theater", 404);
        }

        // Check if the schedule exists
        const schedule = await prisma.movieSchedules.findUnique({
            where: {
                scheduleId: scheduleId
            }
        });
        if (!schedule) {
            throw new AppError("Schedule not found", 404);
        }

        // Validate if the schedule belongs to the screen
        if (schedule.screenId !== screenId) {
            throw new AppError("Schedule does not belong to this screen", 400);
        }

        // Validate if the schedule is ongoing or already ended
        const now = new Date();
        // if (now < schedule.startTime || now > schedule.endTime) {
        //     throw new AppError("Schedule is not ongoing", 400);
        // }
        if (schedule.endTime < now) {
            throw new AppError("This schedule has already ended", 400);
        }

        // Fetch seats
        const seats = await prisma.seats.findMany({
            where: {
                screenId: screenId,
                // isAvailable: true
            }
        });

        // Return customized response of available seats
        const seatsResponse = [];
        for (const seat of seats) {
            const seatsNames = seat.seatRow + seat.seatNumber;
            seatsResponse.push({
                seatId: seat.seatId,
                seat: seatsNames,
                seatType: seat.seatType,
                seatPrice: seat.seatPrice,
                isAvailable: seat.isAvailable
            });
        }

        return seatsResponse;
    } catch (error) {
        console.error("Error finding available seats: ", error);
        throw error;
    }
};

// export const getAvailableSeatsBySchedule = async (userId, scheduleId) => {
//     try {
//         const user = await prisma.user.findUnique({
//             where: {
//                 userId: userId
//             }
//         });
//         if (!user) {
//             throw new AppError("User not found", 404);
//         }

//         const availableSeats = await prisma.movieSchedules.findUnique({
//             where: {
//                 scheduleId: scheduleId
//             },
//             include: {
//                 movie: true,
//                 screen: {
//                     include: {
//                         seats: {
//                             where: {
//                                 isAvailable: true
//                             }
//                         }
//                     }
//                 }
//             }
//         });

//         return availableSeats;
//     } catch (error) {
//         console.error("Error finding available seats by schedule: ", error);
//         throw error;
//     }
// };

// Admin: Update schedule
export const updateSchedule = async (adminId, theaterId, scheduleId, scheduleData) => {
    try {
        // Check if the admin is exists or not
        const theaterAdmin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!theaterAdmin) {
            throw new AppError("Theater admin not found", 404);
        }

        // Check if the admin role is SUPER_ADMIN or THEATER_ADMIN
        if (!["THEATER_ADMIN", "SUPER_ADMIN"].includes(theaterAdmin.role)) {
            throw new AppError("Unauthorized: You do not have permission to update theaters", 403);
        }

        // If the admin role is THEATER_ADMIN, check if the admin is theater admin of the theater
        if (theaterAdmin.role === "THEATER_ADMIN") {
            // Check if the theater exists or not
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

            // Validate if the admin is theater admin of the theater
            const isTheaterAdmin = theater.admin.some((admin) => admin.adminId === adminId);
            if (!isTheaterAdmin) {
                throw new AppError("Unauthorized: You do not have permission to update theaters", 403);
            }
        }

        // Check if the schedule exists or not
        const schedule = await prisma.movieSchedules.findUnique({
            where: {
                scheduleId: scheduleId
            }
        });
        if (!schedule) {
            throw new AppError("Schedule not found", 404);
        }

        // const {movieId, screenId, startTime, endTime} = scheduleData;

        // Create update data
        const updateData = {};

        // Check if any field is updated
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

        // Update schedule data
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

// Admin: Delete schedule
export const deleteSchedule = async (adminId, theaterId, scheduleId) => {
    try {
        // Check if the admin is exists or not
        const theaterAdmin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!theaterAdmin) {
            throw new AppError("Theater admin not found", 404);
        }

        // Check if the admin role is SUPER_ADMIN or THEATER_ADMIN
        if (!["THEATER_ADMIN", "SUPER_ADMIN"].includes(theaterAdmin.role)) {
            throw new AppError("Unauthorized: You do not have permission to delete theaters", 403);
        }

        // If the admin role is THEATER_ADMIN check if the admin is theater admin of the theater
        if (theaterAdmin.role === "THEATER_ADMIN") {
            // Check if the theater exists or not
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

            // Validate if the admin is theater admin of the theater
            const isTheaterAdmin = theater.admin.some((admin) => admin.adminId === adminId);
            if (!isTheaterAdmin) {
                throw new AppError("Unauthorized: You do not have permission to delete theaters", 403);
            }
        }

        // Check if the schedule exists or not
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

        // Check if the schedule has already started
        if (schedule.startTime < new Date()) {
            throw new AppError("Cannot delete a schedule that has already started", 404);
        }

        // If the schedule has tickets, delete them
        if (schedule.tickets && schedule.tickets.length > 0) {
            await prisma.tickets.deleteMany({
                where: {
                    scheduleId: scheduleId
                }
            });
        }

        // Delete schedule
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