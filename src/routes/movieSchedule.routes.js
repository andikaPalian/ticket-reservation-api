import express from 'express';
import {adminAuth, roleCheck} from '../middlewares/adminMiddleware.js';
import {userAuth} from '../middlewares/userMiddleware.js';
import { createMovieScheduleController, deleteScheduleController, findAvailableScreenController, getAllSchedulesController, getAvailableSeatsByScheduleController, getScheduleByDateController, getScheduleByIdController, getScheduleByMovieController, getScheduleByScreenController, getScheduleByTheaterController, updateScheduleController } from '../controllers/movieSchedule.controller.js';

export const movieScheduleRouter = express.Router();

movieScheduleRouter.post('/:theaterId/:screenId/create-schedule', adminAuth, roleCheck(["THEATER_ADMIN", "SUPER_ADMIN"]), createMovieScheduleController);
movieScheduleRouter.get('/', adminAuth, roleCheck(["SUPER_ADMIN"]), getAllSchedulesController);
movieScheduleRouter.get('/:theaterId/schedule', adminAuth, roleCheck(["THEATER_ADMIN", "SUPER_ADMIN"]), getScheduleByTheaterController);
movieScheduleRouter.get('/:scheduleId', getScheduleByIdController);
movieScheduleRouter.get('/schedule/:movieId', getScheduleByMovieController);
movieScheduleRouter.get('/schedule/:screenId', getScheduleByScreenController);
movieScheduleRouter.get('/schedule', getScheduleByDateController);
movieScheduleRouter.get('/schedule/:theaterId', adminAuth, roleCheck(["THEATER_ADMIN", "SUPER_ADMIN"]), findAvailableScreenController);
movieScheduleRouter.get('/schedule/:screenId', userAuth, findAvailableScreenController);
movieScheduleRouter.patch('/schedule/:scheduleId/update', adminAuth, roleCheck(["THEATER_ADMIN", "SUPER_ADMIN"]), updateScheduleController);
movieScheduleRouter.get('/schedule/:scheduleId/seats', getAvailableSeatsByScheduleController);
movieScheduleRouter.delete('/schedule/:scheduleId/delete', adminAuth, roleCheck(["THEATER_ADMIN", "SUPER_ADMIN"]), deleteScheduleController);