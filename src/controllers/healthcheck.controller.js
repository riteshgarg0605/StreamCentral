// import { asyncHandler } from "../utils/asyncHandler";
// import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse.js";

export const healthCheck = (req, res) => {
  return res.status(200).json(new ApiResponse(200, {}, "OK"));
};
