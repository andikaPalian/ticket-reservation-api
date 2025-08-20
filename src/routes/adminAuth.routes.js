import express from 'express';
import { adminAuth, roleCheck } from '../middlewares/adminMiddleware.js';
import { adminLoginController, adminRegisterController, changeRoleController, deleteAdminController } from '../controllers/adminAuth.controller.js';
import { validateBody } from '../middlewares/zodValidation.js';
import { changeAdminRoleSchema, loginAdminSchema, registerAdminSchema } from '../validators/adminAuthValidator.js';

export const adminAuthRouter = express.Router();

adminAuthRouter.post('/register/admin', adminAuth, roleCheck(["SUPER_ADMIN"]), validateBody(registerAdminSchema), adminRegisterController);
adminAuthRouter.post('/login/admin', validateBody(loginAdminSchema), adminLoginController);
adminAuthRouter.patch('/:targetAdminId/change-role', adminAuth, roleCheck(["SUPER_ADMIN"]), validateBody(changeAdminRoleSchema), changeRoleController);
adminAuthRouter.delete('/:targetAdminId/delete', adminAuth, roleCheck(["SUPER_ADMIN"]), deleteAdminController)