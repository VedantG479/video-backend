import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addComment, deleteComment, getVideoComments, updateComment } from "../controllers/comment.controller.js";
import { verifyCommentOwner } from "../middlewares/comment.middleware.js";

const router = Router()
router.use(verifyJWT)

router.route('/:videoId').get(getVideoComments).post(addComment)
router.route('/:videoId:/commentId').patch(verifyCommentOwner, updateComment).delete(verifyCommentOwner, deleteComment)

export default router