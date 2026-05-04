import { asyncHandler } from "../utils/asyncHandler";

const registerUser = asyncHandler(async(req, res) => {
    res.status(500).json({
        message: 'user registered'
    })
})

export {registerUser}