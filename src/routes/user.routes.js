import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, getUserChannelProfile, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/mutler.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()
//router.route('/register').post(registerUser)
router.route('/register').post(
    upload.fields([
        {
            name: 'avatar',
            maxCount: 1
        }, 
        {
            name: 'coverImage', 
            maxCount: 1
        }
    ]), 
    registerUser
)

router.route('/login').post(loginUser)
router.route('/logout').post(verifyJWT, logoutUser)
router.route('/refresh-token').post(refreshAccessToken)
router.route('/change-password').post(verifyJWT, changeCurrentPassword)
router.route('/get-current-user').get(verifyJWT, getCurrentUser)
router.route('/update-account-details').patch(verifyJWT, updateAccountDetails)
router.route('/update-avatar').patch(
    upload.single('avatar'),
    verifyJWT, 
    updateUserAvatar
)
router.route('/update-cover-image').patch(
    upload.single('coverImage'), 
    verifyJWT, 
    updateUserCoverImage
)
router.route('/history').get(verifyJWT, getWatchHistory)
router.route('/:username').get(verifyJWT, getUserChannelProfile)

export default router