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

const optionalAuth = (req, res, next) => {
  if (req.cookies?.accessToken || req.header("Authorization")) {
    return verifyJWT(req, res, next);
  }
  next();
};

router.route("/all").get(getAllVideos);
router.route("/id/:videoId").get(optionalAuth, getVideoById);

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
router
  .route("/update/:videoId")
  .patch(verifyJWT, upload.single("thumbnail"), updateVideo);
router
  .route("/toggle-publish-status/:videoId")
  .patch(verifyJWT, togglePublishStatus);
router.route("/delete/:videoId").delete(verifyJWT, deleteVideo);

export default router;
