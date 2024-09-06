import { Router } from "express";
import {
  addComment,
  deleteComment,
  updateComment,
  getVideoComments,
} from "../controllers/comment.contoller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/all/:id").get(getVideoComments);
router.route("/add-comment/:id").post(verifyJWT, addComment);
router.route("/update-comment/:id").patch(verifyJWT, updateComment);
router.route("/delete-comment/:id").delete(verifyJWT, deleteComment);

export default router;
