import { addMovie, getAllMovies, getMovieById, updateMovie, deleteMovie } from "../services/movie.service.js";

export const addMovieController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;

        const newMovie = await addMovie(adminId, req.files, req.body);

        return res.status(201).json({
            success: true,
            message: "Movie added successfully",
            data: {
                movie: newMovie
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getAllMoviesController = async (req, res, next) => {
    try {
        const movies = await getAllMovies(req.query);

        if (movies.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No movies found",
                data: {
                    movies: []
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: "Movies fetched successfully",
            data: {
                movies: movies
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getMovieByIdController = async (req, res, next) => {
    try {
        const {movieId} = req.params;

        const movie = await getMovieById(movieId);

        return res.status(200).json({
            success: true,
            message: "Movie fetched successfully",
            data: {
                movie: movie
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateMovieController = async (req, res, next) => {
    try {
        const adminId = req.admin.adminId;
        const {movieId} = req.params;

        const updatedMovie = await updateMovie(adminId, movieId, req.files, req.body);

        return res.status(200).json({
            success: true,
            message: "Movie updated successfully",
            data: {
                movie: updatedMovie
            }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteMovieController = async (req, res, next) => {
    try {
        const adminid = req.admin.adminId;
        const {movieId} = req.params;

        await deleteMovie(adminid, movieId);

        return res.status(200).json({
            success: true,
            message: "Movie deleted successfully" 
        });
    } catch (error) {
        next(error);
    }
};