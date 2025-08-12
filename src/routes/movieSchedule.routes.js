import express from 'express';
import {adminAuth, roleCheck} from '../middlewares/adminMiddleware.js';
import {userAuth} from '../middlewares/userMiddleware.js';
import { createMovieScheduleController, deleteScheduleController, findAvailableScreenController, getAllSchedulesController, getScheduleByIdController, getScheduleByMovieController, updateScheduleController } from '../controllers/movieSchedule.controller.js';

export const movieScheduleRouter = express.Router();

movieScheduleRouter.post('/create-schedule', adminAuth, roleCheck(["THEATER_ADMIN", "SUPER_ADMIN"]), createMovieScheduleController);
movieScheduleRouter.get('/', getAllSchedulesController);
movieScheduleRouter.get('/:scheduleId', getScheduleByIdController);
movieScheduleRouter.get('/schedule/:movieId', getScheduleByMovieController);
movieScheduleRouter.get('/schedule/:theaterId', adminAuth, roleCheck(["THEATER_ADMIN", "SUPER_ADMIN"]), findAvailableScreenController);
movieScheduleRouter.get('/schedule/:screenId', userAuth, findAvailableScreenController);
movieScheduleRouter.patch('/schedule/:scheduleId/update', adminAuth, roleCheck(["THEATER_ADMIN", "SUPER_ADMIN"]), updateScheduleController);
movieScheduleRouter.delete('/schedule/:scheduleId/delete', adminAuth, roleCheck(["THEATER_ADMIN", "SUPER_ADMIN"]), deleteScheduleController);