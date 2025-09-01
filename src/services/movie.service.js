import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs/promises';
import { PrismaClient } from "../../generated/prisma/index.js";
import { AppError } from "../utils/errorHandler.js";

const prisma = new PrismaClient();

// Super Admin: Add new movie
export const addMovie = async (adminId, files, movieData) => {
    try {
        // Check if the admin is exists or not
        const superAdmin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!superAdmin) {
            throw new AppError("Theater admin not found", 404);
        }

        // Check if the admin role is SUPER_ADMIN or not
        if (superAdmin.role !== "SUPER_ADMIN") {
            throw new AppError("Unauthorized: You do not have permission to add movies", 401);
        }

        // Destructure movie data
        const { title, description, duration, releaseDate, genre, language, rating, director, cast, isPublished } = movieData;

        // Cloudinary
        let posterUrl = null;
        let posterPublicId = null;
        let trailerUrl = null;
        let trailerPublicId = null;

        // Upload poster to cloudinary
        if (files.posters && files.posters[0]) {
            // Upload poster
            const result = await cloudinary.uploader.upload(files.posters[0].path, {
                folder: 'posters', // Create a folder named 'posters' in cloudinary to store poster images
                resource_type: 'image', // Specify the resource type as image
                use_filename: true, // Use the original filename
                unique_filename: true // Ensure the filename is unique
            });

            // Delete the file from local uploads folder
            await fs.unlink(files.posters[0].path);

            // Set poster URL and public ID
            posterUrl = result.secure_url;
            posterPublicId = result.public_id;
        }

        // Upload trailer to cloudinary
        if (files.trailers && files.trailers[0]) {
            // Upload trailer
            const result = await cloudinary.uploader.upload(files.trailers[0].path, {
                folder: 'trailers', // Create a folder named 'trailers' in cloudinary to store trailer videos
                resource_type: 'video', // Specify the resource type as video
                use_filename: true, // Use the original filename
                unique_filename: true // Ensure the filename is unique
            });

            // Delete the file from local uploads folder
            await fs.unlink(files.trailers[0].path);

            // Set trailer URL and public ID
            trailerUrl = result.secure_url;
            trailerPublicId = result.public_id;
        };

        // Handle optional fields
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

        // Using transaction to ensure both movie and cast are created
        const newMovie = await prisma.$transaction(async (tx) => {
            // Insert movie
            const movie = await tx.movies.create({
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

                // Insert cast data
                await tx.cast.createMany({
                    data: castData
                });
            }

            return movie;
        });

        return newMovie;
    } catch (error) {
        console.error("Movie creation error: ", error);
        throw error;
    }
};

// Get all movies with pagination and search
export const getAllMovies = async ({page = 1, limit = 10, search = ''}) => {
    try {
        // Pagination calculation
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        // Fetch movies from database with pagination and search
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

        // Get total count of movies for pagination
        const totalMovies = await prisma.movies.count({
            where: {
                title: {
                    contains: search || '',
                    mode: 'insensitive'
                }
            }
        });

        return {
            movies: movies,
            totalMovies: totalMovies,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalMovies / limitNum)
        };
    } catch (error) {
        console.error("Movies fetching error: ", error);
        throw error;
    }
};

// Get movie by ID
export const getMovieById = async (movieId) => {
    try {
        // Get movie details from database
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

// Super Admin: Update movie
export const updateMovie = async (adminId, movieId, files, movieData) => {
    try {
        // Check if the admin is exists or not
        const superAdmin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!superAdmin) {
            throw new AppError("Theater admin not found", 404);
        }

        // Check if the admin role is SUPER_ADMIN or not
        if (superAdmin.role !== "SUPER_ADMIN") {
            throw new AppError("Unauthorized: You do not have permission to update movies", 401);
        }

        // Check if the movie exists or not
        const existingMovie = await prisma.movies.findUnique({
            where: {
                movieId: movieId
            }
        });
        if (!existingMovie) {
            throw new AppError("Movie not found", 404);
        }

        // Destructure movie data
        const { title, description, duration, releaseDate, genre, language, rating, director, cast, isPublished } = movieData;

        // Prepare update data object
        const updateData = {}

        // Cloudinary
        let posterUrl = existingMovie.posterUrl;
        let posterPublicId = existingMovie.posterPublicId;
        let trailerUrl = existingMovie.trailerUrl;
        let trailerPublicId = existingMovie.trailerPublicId;

        // Upload new poster to cloudinary if provided
        if (files?.posters && files?.posters[0]) {
            // Delete existing poster from cloudinary if exists
            if (existingMovie.posterPublicId) {
                await cloudinary.uploader.destroy(existingMovie.posterPublicId);
            }

            // Upload new poster
            const result = await cloudinary.uploader.upload(files.posters[0].path, {
                folder: 'posters', // Create a folder named 'posters' in cloudinary to store poster images
                resource_type: 'image', // Specify the resource type as image
                use_filename: true, // Use the original filename
                unique_filename: true // Ensure the filename is unique
            });

            // Delete the file from local uploads folder
            await fs.unlink(files.posters[0].path);

            // Set new poster URL and public ID
            posterUrl = result.secure_url;
            posterPublicId = result.public_id;

            // Update the update data object
            updateData.posterUrl = posterUrl;
            updateData.posterPublicId = posterPublicId;
        }

        // Upload new trailer to cloudinary if provided
        if (files?.trailers && files?.trailers[0]) {
            // Delete existing trailer from cloudinary if exists
            if (existingMovie.trailerPublicId) {
                await cloudinary.uploader.destroy(existingMovie.trailerPublicId);
            }

            // Upload new trailer
            const result = await cloudinary.uploader.upload(files.trailers[0].path, {
                folder: 'trailers', // Create a folder named 'trailers' in cloudinary to store trailer videos
                resource_type: 'video', // Specify the resource type as video
                use_filename: true, // Use the original filename
                unique_filename: true // Ensure the filename is unique
            });

            // Delete the file from local uploads folder
            await fs.unlink(files.trailers[0].path);

            // Set new trailer URL and public ID
            trailerUrl = result.secure_url;
            trailerPublicId = result.public_id;

            // Update the update data object
            updateData.trailerUrl = trailerUrl;
            updateData.trailerPublicId = trailerPublicId;
        }

        // if fields are not undefined, add them to the updateData object
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (duration !== undefined) updateData.duration = Number(duration);
        if (releaseDate !== undefined) updateData.releaseDate = new Date(releaseDate);
        if (genre !== undefined) {
            if (Array.isArray(genre)) {
                updateData.genre = genre.filter((g) => g !== undefined && g !== null);
            } else {
                updateData.genre = [genre]
            }
        }
        if (language !== undefined) updateData.language = language;
        if (rating !== undefined) updateData.rating = rating;
        if (director !== undefined) updateData.director = director;
        if (cast !== undefined) {
            // Delete existing casts
            await prisma.cast.deleteMany({
                where: {
                    movieId: movieId
                }
            });

            // Add new casts
            if (Array.isArray(cast)) {
                // Map the cast array to an array of cast objects
                const newCast = cast.map((c) => ({
                    name: c.name,
                    role: c.role,
                    movieId: existingMovie.movieId
                }));

                // Create new casts
                await prisma.cast.createMany({
                    data: newCast
                });
            }
        }
        if (isPublished !== undefined) updateData.isPublished = isPublished === 'true' || isPublished === true;

        // updateData.posterUrl = posterUrl;
        // updateData.posterPublicId = posterPublicId;
        // updateData.trailerUrl = trailerUrl;
        // updateData.trailerPublicId = trailerPublicId;

        // Update movie
        const updatedMovie = await prisma.movies.update({
            where: {
                movieId: movieId
            },
            data: updateData,
            include: {
                cast: true
            }
        });

        return updatedMovie;
    } catch (error) {
        console.error("Movie update error: ", error);
        throw error;
    }
};

// Super Admin: Delete movie
export const deleteMovie = async (adminId, movieId) => {
    try {
        // Check if the admin is exists or not
        const superAdmin = await prisma.admin.findUnique({
            where: {
                adminId: adminId
            }
        });
        if (!superAdmin) {
            throw new AppError("Theater admin not found", 404);
        }

        // Check if the admin role is SUPER_ADMIN or not
        if (superAdmin.role !== "SUPER_ADMIN") {
            throw new AppError("Unauthorized: You do not have permission to delete movies", 401);
        }

        // Check if the movie exists or not
        const movie = await prisma.movies.findUnique({
            where: {
                movieId: movieId
            }
        });
        if (!movie) {
            throw new AppError("Movie not found", 404);
        }

        // Using transaction to delete all related data
        await prisma.$transaction(async (tx) => {
            // Delete all cast that are related to this movie
            await tx.cast.deleteMany({
                where: {
                    movieId: movieId
                }
            });
            
            // Delete poster from cloudinary
            if (movie.posterPublicId) {
                await cloudinary.uploader.destroy(movie.posterPublicId);
            }
            
            // Delete trailer from cloudinary
            if (movie.trailerPublicId) {
                await cloudinary.uploader.destroy(movie.trailerPublicId);
            }

            // Delete all movie schedules that are related to this movie
            await tx.movieSchedules.deleteMany({
                where: {
                    movieId: movieId
                }
            });

            // Delete movie
            await tx.movies.delete({
                where: {
                    movieId: movieId
                }
            });
        });

        return movie;
    } catch (error) {
        console.error("Movie deletion error: ", error);
        throw error;
    }
};