import express from 'express';
import { resendVerificationCodeController, userLoginController, userRegisterController, verifyCodeController } from '../controllers/userAuth.controller.js';
import { validateBody } from '../middlewares/zodValidation.js';
import { loginUserSchema, registerUserSchema } from '../validators/userAuthValidator.js';

export const userAuthRouter = express.Router();

userAuthRouter.post('/register', validateBody(registerUserSchema), userRegisterController);
userAuthRouter.post('/verify-code', verifyCodeController);
userAuthRouter.post('/resend-code', resendVerificationCodeController);
userAuthRouter.post('/login', validateBody(loginUserSchema), userLoginController);