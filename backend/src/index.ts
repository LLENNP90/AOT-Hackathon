import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRouter from "./routes/user.js"
import employeeRouter from "./routes/employee.js"
import shiftRouter from "./routes/shift.js"
import activityLogRouter from "./routes/activityLog.js"
import { errorHandler } from "./err/error.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ message: "im okay" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 

app.use("/api/user", userRouter)

app.use("/api/employee", employeeRouter)
app.use("/api/shift", shiftRouter)

app.use(errorHandler)