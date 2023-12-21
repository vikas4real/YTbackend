import { Router } from 'express';
import { upload } from '../middlewares/multer.middlewares.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  updateAccountDetails,
  updateAvatarImage,
  updateCoverImage,
  getCurrentUserDetails,
} from '../controllers/user.controllers.js';
const userRouter = Router();

userRouter.route('/register').post(
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  registerUser
);
userRouter.route('/login').post(loginUser);
userRouter.route('/logout').post(verifyJWT, logoutUser);
userRouter.route('/refresh-token').post(refreshAccessToken);
userRouter.route('/change-password').post(verifyJWT, changePassword);
userRouter.route('/update').post(verifyJWT, updateAccountDetails);
userRouter
  .route('/update-avatar')
  .post(verifyJWT, upload.single('avatar'), updateAvatarImage);
userRouter
  .route('/update-cover-image')
  .post(verifyJWT, upload.single('coverImage'), updateCoverImage);
userRouter.route('/details').get(verifyJWT, getCurrentUserDetails);
export default userRouter;
