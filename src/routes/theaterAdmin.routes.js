import express from "express";
import { adminAuth, roleCheck } from "../middlewares/adminMiddleware.js";
import { assignAdminToTheaterController, removeAdminFromTheaterController } from "../controllers/theaterAdmin.controller.js";

export const theaterAdminRouter = express.Router();

theaterAdminRouter.post('/theaterId/assign-admin', adminAuth, roleCheck(["SUPER_ADMIN"]), assignAdminToTheaterController);
theaterAdminRouter.delete('/:theaterId/remove/:adminId', adminAuth, roleCheck(["SUPER_ADMIN"]), removeAdminFromTheaterController);