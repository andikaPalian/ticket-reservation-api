import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import helmet from 'helmet';
import morgan from 'morgan';
import multer from 'multer';
import { userAuthRouter } from './routes/userAuth.routes.js';
import { adminAuthRouter } from './routes/adminAuth.routes.js';
import { connectCloudinary } from './config/cloudinary.js';
import { movieRouter } from './routes/movie.routes.js';
import { theaterRouter } from './routes/theater.routes.js';
import { movieScheduleRouter } from './routes/movieSchedule.routes.js';
import './cron/cancelUnpaidTicket.js';
import './cron/ticketsCleanUp.js';

const app = express();
const port = process.env.PORT || 3000;
connectCloudinary();

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

app.use('/api/user/auth', userAuthRouter);
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api/movies', movieRouter);
app.use('/api/theaters', theaterRouter);
app.use('/api/chedules', movieScheduleRouter);

// Handle multer errors
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: err.message });
    } else if (err) {
        console.error("Unexpected error:", err)
        return res.status(500).json({ message: err.message || "Internal server error" });
    }
    next();
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
})