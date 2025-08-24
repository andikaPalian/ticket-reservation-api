import { createMovieSchedule, getAllSchedules, getScheduleById, getScheduleByMovie, findAvailableScreen, findAvailableSeats, updateSchedule, deleteSchedule, getAvailableSeatsBySchedule, getScheduleByDate, getScheduleByScreen } from "../services/movieSchedule.service.js";

export const createMovieScheduleController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;
        const {theaterId, screenId} = req.params;

        const newSchedule = await createMovieSchedule(adminId,theaterId, screenId, req.body);

        return res.status(201).json({
            success: true,
            message: "Schedule created successfully",
            data: {
                schedule: newSchedule
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getAllSchedulesController = async (req, res, next) => {
    try {
        const schedules = await getAllSchedules(req.query);

        if (schedules.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No schedules found',
                data: {
                    schedules: []
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: "Schedules fetched successfully",
            data: {
                schedules: schedules
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getScheduleByIdController = async (req, res, next) => {
    try {
        const {scheduleId} = req.params;

        const schedule = await getScheduleById(scheduleId);

        return res.status(200).json({
            success: true,
            message: "Schedule fetched successfully",
            data: {
                schedule: schedule
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getScheduleByMovieController = async (req, res, next) => {
    try {
        const {movieId} = req.params;

        const schedule = await getScheduleByMovie(movieId);

        return res.status(200).json({
            success: true,
            message: "Schedule fetched successfully",
            data: {
                schedule: schedule
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getScheduleByScreenController = async (req, res, next) => {
    try {
        const {screenId} = req.params;

        const schedule = await getScheduleByScreen(screenId);

        if (schedule.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No schedule found",
                data: {
                    schedule: []
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: "Schedule fetched successfully",
            data: {
                schedule: schedule
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getScheduleByDateController = async (req, res, next) => {
    try {
        const {date} = req.query;

        const schedule = await getScheduleByDate(date);

        if (schedule.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No schedule found",
                data: {
                    schedule: []
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: "Schedule fetched successfully",
            data: {
                schedule: schedule
            }
        });
    } catch (error) {
        next(error);
    }
};

export const findAvailableScreenController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;
        const {theaterId} = req.params;

        const availableScreen = await findAvailableScreen(adminId, theaterId);

        return res.status(200).json({
            success: true,
            message: "Available screen fetched successfully",
            data: {
                screen: availableScreen
            }
        });
    } catch (error) {
        next(error);
    }
};

export const findAvailableSeatsController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {screenId} = req.params;

        const availableSeats = await findAvailableSeats(userId, screenId);

        return res.status(200).json({
            success: true,
            message: "Available seats fetched successfully",
            data: {
                seats: availableSeats
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateScheduleController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;
        const {scheduleId} = req.params;
        const {scheduleData} = req.body;

        const updatedSchedule = await updateSchedule(adminId, scheduleId, scheduleData);

        return res.status(200).json({
            success: true,
            message: "Schedule updated successfully",
            data: {
                schedule: updatedSchedule
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getAvailableSeatsByScheduleController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {scheduleId} = req.params;

        const availableSeats = await getAvailableSeatsBySchedule(userId, scheduleId);

        return res.status(200).json({
            success: true,
            message: "Available seats fetched successfully",
            data: {
                seats: availableSeats
            }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteScheduleController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;
        const {scheduleId} = req.params;

        await deleteSchedule(adminId, scheduleId);

        return res.status(200).json({
            success: true,
            message: "Schedule deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};