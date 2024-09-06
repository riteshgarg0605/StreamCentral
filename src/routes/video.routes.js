import { Router } from "express";
import {
  getAllVideos,
  publishVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
} from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/all").get(getAllVideos);
router.route("/id/:_id").get(getVideoById);

// Secured Routes
router.route("/publish").post(
  verifyJWT,
  upload.fields([
    {
      name: "thumbnail",
      maxCount: 1,
    },
    {
      name: "videoFile",
      maxCount: 1,
    },
  ]),
  publishVideo
);
router.route("/update/:_id").patch(
  verifyJWT,
  upload.fields([
    {
      name: "thumbnail",
      maxCount: 1,
    },
    {
      name: "videoFile",
      maxCount: 1,
    },
  ]),
  updateVideo
);
router
  .route("/toggle-publish-status/:_id")
  .patch(verifyJWT, togglePublishStatus);
router.route("/delete/:_id").delete(verifyJWT, deleteVideo);

export default router;
