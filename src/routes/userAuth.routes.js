import express from 'express';
import { userLoginController, userRegisterController } from '../controllers/userAuth.controller.js';
import { validateBody } from '../middlewares/zodValidation.js';
import { loginUserSchema, registerUserSchema } from '../validators/userAuthValidator.js';

export const userAuthRouter = express.Router();

userAuthRouter.post('/register', validateBody(registerUserSchema), userRegisterController);
userAuthRouter.post('/login', validateBody(loginUserSchema), userLoginController);