import { Router } from "express";
import {
  addComment,
  deleteComment,
  updateComment,
  getVideoComments,
} from "../controllers/comment.contoller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/all/:videoId").get(getVideoComments);
router.route("/add-comment/:videoId").post(verifyJWT, addComment);
router.route("/update-comment/:commentId").patch(verifyJWT, updateComment);
router.route("/delete-comment/:commentId").delete(verifyJWT, deleteComment);

export default router;
