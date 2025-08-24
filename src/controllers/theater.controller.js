import { addTheater, getAllTheaters,getTheaterById, updateTheater, deleteTheater, createTheaterScreen, getAllScreens, getScreenByTheater, getScreenById, updateTheaterScreen, deleteScreen, updateScreenSeats, getSeatsByScreen, getSeatsById } from "../services/theater.service.js";

export const addTheaterController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;

        const newTheater = await addTheater(adminId, req.body);
        
        return res.status(201).json({
            success: true,
            message: "Theater added successfully",
            data: {
                theater: newTheater
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getAllTheatersController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;

        const theaters = await getAllTheaters(adminId, req.query);

        if (theaters.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No theaters found",
                data: {
                    theaters: []
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: "Theaters fetched successfully",
            data: {
                theaters: theaters
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getTheaterByIdController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;
        const {theaterId} = req.params;

        const theater = await getTheaterById(adminId, theaterId);

        return res.status(200).json({
            success: true,
            message: "Theater fetched succesfully",
            data: {
                theater: theater
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateTheaterController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;
        const {theaterId} = req.params;
        
        const updatedTheater = await updateTheater(adminId, theaterId, req.body);

        return res.status(200).json({
            success: true,
            message: "Theater updated successfully",
            data: {
                theater: updatedTheater
            }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteTheaterController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;
        const {theaterId} = req.params;

        await deleteTheater(adminId, theaterId);

        return res.status(200).json({
            success: true,
            message: "Theater deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const createTheaterScreenController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;
        const {theaterId} = req.params;
        const {screenData, seatsData} = req.body;

        const newScreen = await createTheaterScreen(adminId, theaterId, screenData, seatsData);

        return res.status(201).json({
            success: true,
            message: "Screen added successfully",
            data: {
                screen: newScreen,

            }
        });
    } catch (error) {
        next(error);
    }
};

export const getAllScreensController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;
        const screens = await getAllScreens(adminId, req.query);

        if (screens.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No screens found",
                data: {
                    screens: []
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: "Screens fetched successfully",
            data: {
                screens: screens
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getScreenByTheaterController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;
        const {theaterId} = req.params;
        
        const screen = await getScreenByTheater(adminId, theaterId);

        return res.status(200).json({
            success: true,
            message: "Screens fetched successfully",
            data: {
                screen: screen
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getScreenByIdController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;
        const {screenId} = req.params;

        const screen = await getScreenById(adminId, screenId);

        return res.status(200).json({
            success: true,
            message: "Screen fetched successfully",
            data: {
                screen: screen
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateTheaterScreenController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;
        const {theaterId, screenId} = req.params;

        const updatedScreen = await updateTheaterScreen(adminId, theaterId, screenId, req.body);

        return res.status(200).json({
            success: true,
            message: "Screen updated successfully",
            data: {
                screen: updatedScreen
            }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteScreenController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;
        const {theaterId, screenId} = req.params;

        await deleteScreen(adminId, theaterId, screenId);

        return res.status(200).json({
            success: true,
            message: "Screen deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const updateScreenSeatsController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;
        const {theaterId, screenId} = req.params;
        
        const updatedSeat = await updateScreenSeats(adminId, theaterId, screenId, req.body);

        return res.status(200).json({
            success: true,
            message: "Screen updated successfully",
            data: {
                seats: updatedSeat
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getSeatsByScreemController = async (req, res, next) => {
    try {
        const {theaterId, screenId} = req.params;

        const seats = await getSeatsByScreen(theaterId, screenId);

        return res.status(200).json({
            success: true,
            message: "Seats fetched successfully",
            data: {
                seats: seats
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getSeatByIdController = async (req, res, next) => {
    try {
        const {theaterId, screenId, seatId} = req.params;

        const seat = await getSeatsById(theaterId, screenId, seatId);
        
        return res.status(200).json({
            success: true,
            message: "Seat fetched successfully",
            data: {
                seat: seat
            }
        });
    } catch (error) {
        next(error);
    }
};