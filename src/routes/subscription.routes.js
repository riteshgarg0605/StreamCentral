import { Router } from "express";
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router
  .route("/channel/:channelId")
  .get(getUserChannelSubscribers)
  .post(toggleSubscription);

router.route("/subscriber/:subscriberId").get(getSubscribedChannels);

export default router;
