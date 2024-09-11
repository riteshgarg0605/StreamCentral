import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    //one who is subscribing
    subscriber: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    //one to whom subscriber is subscribing
    channel: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
