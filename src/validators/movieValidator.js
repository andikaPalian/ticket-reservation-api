import {z} from 'zod';

export const movieAddSchema = z.object({
    title: z.string().min(1, {
        message: "Title must be at least 1 character long"
    }).max(100, {
        message: "Title must be at most 100 characters long"
    }).trim(),
    description: z.string().min(1, {
        message: "Description must be at least 1 character long"
    }).max(1000, {
        message: "Description must be at most 1000 characters long"
    }).trim(),
    duration: z.coerce.number().min(1, {
        message: "Duration must be at least 1 minute long"
    }).max(300, {
        message: "Duration must be at most 300 minutes long"
    }),
    releaseDate: z.preprocess((date) => {
        if (typeof date === 'string' || date instanceof Date) {
            const parsedDate = new Date(date);
            return isNaN(parsedDate.getTime()) ? null : parsedDate;
        }
        return null;
    }, z.date().refine((date) => date > new Date(), {
        message: "Release date must be in the future"
    })),
    genre: z.preprocess((gen) => {
        if (typeof gen === 'string') {
            try {
                return JSON.parse(gen);
            } catch (error) {
                return gen
            }
        }
        return gen
    }, z.array(z.enum([
        "ACTION", "COMEDY", "DRAMA", "THRILLER", "ROMANCE", "SCIFI", "HORROR", "DOCUMENTARY", "FAMILY", "ANIMATION", "FANTASY"
    ]))),
    language: z.string().min(1, {
        message: "Languange must be at least 1 character long"
    }),
    rating: z.string().min(1, {
        message: "Rating is required"
    }),
    director: z.string().optional(),
    isPublished: z.coerce.boolean().default(false).optional(),
    cast: z.preprocess((cas) => {
        if (typeof cas === 'string') {
            try {
                return JSON.parse(cas);
            } catch (error) {
                return cas
            }
        }
        return cas
    }, z.array(
        z.object({
            name: z.string().min(1, {
                message: "Cast name must be at least 1 character long"
            }).max(100, {
                message: "Cast name must be at most 100 characters long"
            }),
            role: z.string().max(100, {
                message: "Cast role must be at most 100 characters long"
            }).optional()
        })
    ))
});

export const movieUpdateSchema = movieAddSchema.partial();