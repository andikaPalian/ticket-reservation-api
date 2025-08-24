import express from 'express';
import { adminAuth, roleCheck } from '../middlewares/adminMiddleware.js';
import { validateBody } from '../middlewares/zodValidation.js';
import { theaterAddSchema, theaterScreenCreateSchema, theaterScreenSeatsUpdatedSchema, theaterScreenUpdateSchema, theaterUpdateSchema } from '../validators/theaterValidator.js';
import { addTheaterController, createTheaterScreenController, deleteScreenController, deleteTheaterController, getAllScreensController, getAllTheatersController, getScreenByIdController, getScreenByTheaterController, getSeatByIdController, getSeatsByScreemController, getTheaterByIdController, updateScreenSeatsController, updateTheaterController, updateTheaterScreenController } from '../controllers/theater.controller.js';

export const theaterRouter = express.Router();

// Theaters
theaterRouter.post('/add-theater', adminAuth, roleCheck(["SUPER_ADMIN"]), validateBody(theaterAddSchema), addTheaterController);
theaterRouter.get('/', adminAuth, roleCheck(["SUPER_ADMIN"]), getAllTheatersController);
theaterRouter.get('/:theaterId', adminAuth, roleCheck(["SUPER_ADMIN"]), getTheaterByIdController);
theaterRouter.patch('/:theaterId/update', adminAuth, roleCheck(["SUPER_ADMIN"]), validateBody(theaterUpdateSchema), updateTheaterController);
theaterRouter.delete('/:theaterId/delete', adminAuth, roleCheck(["SUPER_ADMIN"]), deleteTheaterController);

// Screens
theaterRouter.post('/:theaterId/screens/add-screen', adminAuth, roleCheck(["THEATER_ADMIN", "SUPER_ADMIN"]), validateBody(theaterScreenCreateSchema), createTheaterScreenController);
theaterRouter.get('/screens/screen', adminAuth, roleCheck(["SUPER_ADMIN"]), getAllScreensController);
theaterRouter.get('/:theaterId/screen', adminAuth, roleCheck(["THEATER_ADMIN", "SUPER_ADMIN"]), getScreenByTheaterController);
theaterRouter.get('/screen/:screenId', adminAuth, roleCheck(["SUPER_ADMIN", "THEATER_ADMIN"]), getScreenByIdController);
theaterRouter.patch('/:theaterId/screen/:screenId/update', adminAuth, roleCheck(["THEATER_ADMIN", "SUPER_ADMIN"]), validateBody(theaterScreenUpdateSchema), updateTheaterScreenController);
theaterRouter.delete('/:theaterId/screen/:screenId/delete', adminAuth, roleCheck(["THEATER_ADMIN", "SUPER_ADMIN"]), deleteScreenController);

// Seats
theaterRouter.patch('/:theaterId/screen/:screenId/seats/update', adminAuth, roleCheck(["THEATER_ADMIN", "SUPER_ADMIN"]), validateBody(theaterScreenSeatsUpdatedSchema), updateScreenSeatsController);
theaterRouter.get('/screen/:screenId/seats', getSeatsByScreemController);
theaterRouter.get('/screen/:screenId/seats/:seatId', getSeatByIdController);