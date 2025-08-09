import express from "express";
import { adminAuth, roleCheck } from "../middlewares/adminMiddleware.js";
import { addMovieController, deleteMovieController, getAllMoviesController, getMovieByIdController, updateMovieController } from "../controllers/movie.controller.js";
import { validateBody } from "../middlewares/zodValidation.js";
import { movieAddSchema, movieUpdateSchema } from "../validators/movieValidator.js";
import { upload } from "../middlewares/multer.js";

export const movieRouter = express.Router();

movieRouter.post('/add-movie', adminAuth, roleCheck(["THEATER_ADMIN", "SUPER_ADMIN"]), upload.fields([
    {name: 'posters', maxCount: 1},
    {name: 'trailers', maxCount: 1}
]), validateBody(movieAddSchema), addMovieController);
movieRouter.get('/', getAllMoviesController);
movieRouter.get('/:movieId', getMovieByIdController);
movieRouter.patch('/:movieId/update', adminAuth, roleCheck(["THEATER_ADMIN", "SUPER_ADMIN"]), upload.fields([
    {name: 'posters', maxCount: 1},
    {name: 'trailers', maxCount: 1}
]), validateBody(movieUpdateSchema), updateMovieController);
movieRouter.delete('/:movieId', adminAuth, roleCheck(["THEATER_ADMIN", "SUPER_ADMIN"]), deleteMovieController);