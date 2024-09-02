import dotenv from "dotenv";
import { app } from "./app.js";
import connectDB from "./db/index.js";

dotenv.config({ path: "./.env" });

connectDB()
  .then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log("Server is running at port:", port);
      console.log(`URL: http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.log("MongoDB connection error ", err);
  });
process.on("SIGINT", () => {
  console.log("Shutting down the server...");
  process.exit();
});
