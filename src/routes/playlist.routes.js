import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
} from "../controllers/playlist.controller.js";
const router = Router();

router.use(verifyJWT);

router.route("/").post(createPlaylist);

router
  .route("/:playlistId")
  .get(getPlaylistById)
  .patch(updatePlaylist)
  .delete(deletePlaylist);

router.route("/user/:userId").get(getUserPlaylists);

router.route("/add/:videoId/:playlistId").put(addVideoToPlaylist);
router.route("/delete/:videoId/:playlistId").delete(removeVideoFromPlaylist);

export default router;
