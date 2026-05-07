import { Comment } from "../models/comment.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyCommentOwner = asyncHandler(async(req, res, next) => {
    const {commentId} = req.body
    const userId = req.user?._id

    if(!commentId)   throw new ApiError(400, 'no comment selected')

    const comment = await Comment.findById(commentId)
    if(!comment)   throw new ApiError(400, 'comment not found')

    if(!comment.owner.equals(userId))   throw new ApiError(403, 'you do not have permission to modify')
    
    next()
})