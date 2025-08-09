import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs/promises';
import { PrismaClient } from "../../generated/prisma/index.js";
import { AppError } from "../utils/errorHandler.js";

const prisma = new PrismaClient();

export const addMovie = async (adminId, files, movieData) => {
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
            throw new AppError("Unauthorized: You do not have permission to add movies", 401);
        }

        const { title, description, duration, releaseDate, genre, language, rating, director, cast, isPublished } = movieData;

        // Cloudinary
        let posterUrl = null;
        let posterPublicId = null;
        let trailerUrl = null;
        let trailerPublicId = null;

        if (files.poster) {
            const result = await cloudinary.uploader.upload(files.path, {
                folder: 'posters',
                resource_type: 'image',
                use_filename: true,
                unique_filename: true
            });

            await fs.unlink(files.path);

            posterUrl = result.secure_url;
            posterPublicId = result.public_id;
        }

        if (files.trailer) {
            const result = await cloudinary.uploader.upload(files.path, {
                folder: 'trailers',
                resource_type: 'video',
                use_filename: true,
                unique_filename: true
            });

            await fs.unlink(files.path);

            trailerUrl = result.secure_url;
            trailerPublicId = result.public_id;
        };

        const poster = posterUrl || null;
        const trailer = trailerUrl || null;

        // const newMovie = await prisma.movie.create({
        //     data: {
        //         title: title,
        //         description: description,
        //         duration: duration,
        //         releaseDate: new Date(releaseDate),
        //         posterUrl: poster,
        //         trailerUrl: trailer,
        //         genre: genre,
        //         language: language,
        //         rating: rating,
        //         director: director,
        //         isPublished: isPublished,
        //         cast: {
        //             create: cast.map((name), role)
        //         }
        //     }
        // });

        const newMovie = await prisma.$transaction(async (prism) => {
            const movie = await prism.movies.create({
                data: {
                    title: title,
                    description: description,
                    duration: duration,
                    releaseDate: new Date(releaseDate),
                    posterUrl: poster,
                    posterPublicId: posterPublicId,
                    trailerUrl: trailer,
                    trailerPublicId: trailerPublicId,
                    genre: genre,
                    language: language,
                    rating: rating,
                    director: director,
                    isPublished: isPublished
                }
            });

            // Insert cast array
            if (Array.isArray(cast) && cast.length > 0) {
                const castData = cast.map((c) => ({
                    name: c.name,
                    role: c.role,
                    movieId: movie.movieId
                }));

                await prism.cast.createMany({
                    data: castData
                });
            }
        });

        return newMovie;
    } catch (error) {
        console.error("Movie creation error: ", error);
        throw error;
    }
};

export const getAllMovies = async ({page = 1, limit = 10, search = ''}) => {
    try {
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const movies = await prisma.movies.findMany({
            where: {
                title: {
                    contains: search || '',
                    mode: 'insensitive'
                }
            },
            include: {
                cast: true
            },
            skip: skip,
            take: limitNum,
            orderBy: {
                createdAt: 'desc'
            },
        });

        return movies;
    } catch (error) {
        console.error("Movies fetching error: ", error);
        throw error;
    }
};

export const getMovieById = async (movieId) => {
    try {
        const movie = await prisma.movies.findUnique({
            where: {
                movieId: movieId
            },
            include: {
                cast: true
            }
        });

        return movie;
    } catch (error) {
        console.error("Movie fetching error: ", error);
        throw error;
    }
};

export const updateMovie = async (adminId, movieId, files, movieData) => {
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
            throw new AppError("Unauthorized: You do not have permission to update movies", 401);
        }

        const existingMovie = await prisma.movies.findUnique({
            where: {
                movieId: movieId
            }
        });
        if (!existingMovie) {
            throw new AppError("Movie not found", 404);
        }

        const { title, description, duration, releaseDate, genre, language, rating, director, cast, isPublished } = movieData;

        // Cloudinary
        let posterUrl = existingMovie.posterUrl;
        let posterPublicId = existingMovie.posterPublicId;
        let trailerUrl = existingMovie.trailerUrl;
        let trailerPublicId = existingMovie.trailerPublicId;

        if (files?.poster) {
            if (existingMovie.posterPublicId) {
                await cloudinary.uploader.destroy(existingMovie.posterPublicId);
            }

            const result = await cloudinary.uploader.upload(files.path, {
                folder: 'posters',
                resource_type: 'image',
                use_filename: true,
                unique_filename: true
            });

            await fs.unlink(files.path);

            posterUrl = result.secure_url;
            posterPublicId = result.public_id;
        }

        if (files?.trailer) {
            if (existingMovie.trailerPublicId) {
                await cloudinary.uploader.destroy(existingMovie.trailerPublicId);
            }

            const result = await cloudinary.uploader.upload(files.path, {
                folder: 'trailers',
                resource_type: 'video',
                use_filename: true,
                unique_filename: true
            });

            await fs.unlink(files.path);

            trailerUrl = result.secure_url;
            trailerPublicId = result.public_id;
        }

        // const updateData = {}

        // if (title !== undefined) updateData.title = title;
        // if (description !== undefined) updateData.description = description;
        // if (duration !== undefined) updateData.duration = Number(duration);
        // if (releaseDate !== undefined) updateData.releaseDate = new Date(releaseDate);
        // if (genre !== undefined) updateData.genre = genre;
        // if (language !== undefined) updateData.language = language;
        // if (rating !== undefined) updateData.rating = rating;
        // if (director !== undefined) updateData.director = director;
        // if (cast !== undefined) {
        // if (Array.isArray(cast)) {
        //     updateData.cast = cast;
        // } else if (typeof cast === 'string') {
        //     updateData.cast = cast.split(',').map(c => c.trim());
        //     }
        // }
        // if (isPublished !== undefined) updateData.isPublished = isPublished === 'true' || isPublished === true;

        const updaedMovie = await prisma.$transaction(async (prism) => {
            const movie = await prism.movies.update({
                where: {
                    movieId: movieId
                },
                data: {
                    title: title,
                    description: description,
                    duration: Number(duration),
                    releaseDate: new Date(releaseDate),
                    posterUrl: posterUrl,
                    posterPublicId: posterPublicId,
                    trailerUrl: trailerUrl,
                    trailerPublicId: trailerPublicId,
                    genre: genre,
                    language: language,
                    rating: rating,
                    director: director,
                    isPublished: isPublished === 'true' || isPublished === true
                }
            });

            if (Array.isArray(cast)) {
                await prism.cast.deleteMany({
                    where: {
                        movieId: movieId
                    }
                });

                await prism.cast.createMany({
                    data: cast.map((c) => ({
                        name: c.name,
                        role: c.role,
                        movieId: movie.movieId
                    }))
                });
            }
        });

        return updaedMovie;
    } catch (error) {
        console.error("Movie update error: ", error);
        throw error;
    }
};

export const deleteMovie = async (adminId, movieId) => {
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
            throw new AppError("Unauthorized: You do not have permission to delete movies", 401);
        }

        const movie = await prisma.movies.findUnique({
            where: {
                movieId: movieId
            }
        });
        if (!movie) {
            throw new AppError("Movie not found", 404);
        }

        await prisma.$transaction(async (prism) => {
            await prism.movies.delete({
                where: {
                    movieId: movieId
                }
            });

            if (movie.posterPublicId) {
                await cloudinary.uploader.destroy(movie.posterPublicId);
            }
            
            if (movie.trailerPublicId) {
                await cloudinary.uploader.destroy(movie.trailerPublicId);
            }

            await prism.cast.deleteMany({
                where: {
                    movieId: movieId
                }
            });

            await prism.movieSchedules.deleteMany({
                where: {
                    movieID: movieId
                }
            });
        });

        return movie;
    } catch (error) {
        console.error("Movie deletion error: ", error);
        throw error;
    }
};