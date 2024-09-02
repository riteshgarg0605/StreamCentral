import mongoose, { Schema } from "mongoose";
import { User } from "./user.model";

const subscriptionSchema = new Schema(
  {
    //one who is subscribing
    subscribe: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    //one to whom subscriber is subscribing
    channel: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
