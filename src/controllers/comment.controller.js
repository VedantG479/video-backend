import { Mongoose } from "mongoose";
import { Comment } from "../models/comment.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";

const getVideoComments = asyncHandler(async(req, res) => {
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
    const userId = req.user?._id

    if(!videoId)    throw new ApiError(400, 'video not available')
    
    const comments = await Comment.aggregate([
        {
            $match: {
                video: new Mongoose.Types.ObjectId(videoId)
            }
        }
    ])

    if(!comments?.length)   throw new ApiError(404, 'error fetching comments')

    return res.status(200)
        .json(new ApiResponse(200, comments[0], 'comments fetched successfully'))
})

const addComment = asyncHandler(async(req, res) => {
    const {videoId} = req.params
    const {content} = req.body
    const userId = req.user?._id

    if(!content?.trim())     throw new ApiError(400, 'enter valid comment')

    const comment = await Comment.create({
        content, 
        video: videoId, 
        owner: userId
    })

    const createdComment = await Comment.findById(comment._id)
    if(!createdComment) throw new ApiError(404, 'error creating comment')

    return res.status(200)
        .json(new ApiResponse(200, createdComment, 'comment created successfully'))
})

const updateComment = asyncHandler(async(req, res) => {
    const {commentId, newContent} = req.body
    if(!commentId || !newContent?.trim())  throw new ApiError(400, 'give valid comment')

    const newComment = await Comment.findByIdAndUpdate(commentId, 
        {content: newContent}, 
        {new: true}
    )

    return res.status(200)
        .json(new ApiResponse(200, newComment, 'comment updated successfully'))
})

const deleteComment = asyncHandler(async(req, res) => {
    const {commentId} = req.body
    if(!commentId)   throw new ApiError(400, 'no comment selected')

    await Comment.findByIdAndDelete(commentId)

    return res.status(200)
        .json(new ApiResponse(200, {}, 'comment deleted successfully'))
})

export {
    getVideoComments, 
    addComment, 
    updateComment, 
    deleteComment
}