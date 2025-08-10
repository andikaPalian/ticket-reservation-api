import {z} from 'zod';

const addressRegex = /^[a-zA-Z0-9\s,.'-]*$/;
const cityRegex = /^[a-zA-Z\s'-]+$/;
const postalCodeRegex = /^[0-9]+$/;
const screenRegex = /^[a-zA-Z0-9\s-]+$/;
const seatRowRegex = /^[A-Z]$/;
const seatNumberRegex = /^[0-9]+$/;


export const theaterAddSchema = z.object({
    name: z.string().min(1, {
        message: "Name must be at least 1 character long"
    }).max(100, {
        message: "Name must be at most 100 characters long"
    }).trim(),
    address: z.string().min(5, {
        message: "Address must be at least 5 characters long"
    }).max(200, {
        message: "Address must be at most 200 characters long"
    }).regex(addressRegex, {
        message: "Address contains invalid characters"
    }).trim(),
    city: z.string().min(2, {
        message: "City must be at least 2 characters long"
    }).max(100, {
        message: "City must be at most 100 characters long"
    }).regex(cityRegex, {
        message: "City name must contains only letters"
    }).trim(),
    state: z.string().min(2, {
        message: "State/Province must be at least 2 characters long"
    }).max(100, {
        message: "State/Province name to long"
    }).trim(),
    postalCode: z.string().min(4, {
        message: "Postal code must be at least 4 digits"
    }).max(10, {
        message: "Postal code too long"
    }).regex(postalCodeRegex, {
        message: "Postal code must contains only numbers"
    }),
    latitude: z.number().min(-90, {
        message: "Latitude must be greeter or equal to -90"
    }).max(90, {
        message: "Latitude must be less than or equal to 90"
    }).optional(),
    longitude: z.number().min(-180, {
        message: "Longitude must be greeter or equal to -180"
    }).max(180, {
        message: "Longitude must be less than or equal to 180"
    }).optional()
});

export const theaterUpdateSchema = theaterAddSchema.partial();

export const screenDataSchema = z.object({
    name: z.string().min(3, {
        message: "Screen name must be at least 3 character long"
    }).max(50, {
        message: "Screen name must be at most 50 characters long"
    }).regex(screenRegex, {
        message: "Screen name contains invalid characters"
    }).trim()
});

export const seatsDataSchema = z.object({
    totalRows: z.number().int().min(1, {
        message: "Number of rows must be at least 1 row"
    }).max(26, {
        message: "Number of rows must be at most 26 rows"
    }),
    seatsPerRows: z.number().int().min(1, {
        message: "Number of seats per row must be at least 1 seat"
    }).max(50, {
        message: "Maximum 50 seats per row"
    }),
    seatType: z.enum(["REGULAR", "VIP", "PREMIUM"], {
        message: "Invalid seat type"
    }).default("REGULAR"),
    seatPrice: z.number().positive({
        message: "Seat price must be a positive number"
    }),
    customSeats: z.array(
        z.object({
            row: z.string().regex(seatRowRegex, {
                message: "Row must be a single uppercase letter A-Z"
            }),
            seatNumber: z.string().regex(seatNumberRegex, {
                message: "Seat number must be numeric"
            }),
            seatType: z.enum(["REGULAR", "VIP", "PREMIUM"], {
                message: "Invalid seat type"
            }).default("REGULAR"),
            seatPrice: z.number().positive({
                message: "Seat price must be a positive number"
            })
        })
    ).optional()
});

export const theaterScreenCreateSchema = z.object({
    screenData: screenDataSchema,
    seatDAta: seatsDataSchema
});

export const theaterScreenUpdateSchema = screenDataSchema;

export const updateCustomeSeatSchema = z.object({
    customSeats: z.array(
        z.object({
            seatId: z.string().uuid(),
            seatType: z.enum(["REGULAR", "VIP", "PREMIUM"], {
                message: "Invalid seat type"
            }).default("REGULAR").optional(),
            seatPrice: z.number().positive({
                message: "Seat price must be a positive number"
            }).optional()
        })
    ).min(1, {
        message: "At leat one custom seat must be updated"
    })
});

export const theaterScreenSeatsUpdatedSchema = z.union([
    seatsDataSchema,
    updateCustomeSeatSchema
]);