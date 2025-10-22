import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import records from "./routes/record.js";
import profile from "./routes/profile.js";
import { connectDB } from "./db/connection.js";


dotenv.config();

const PORT = process.env.PORT || 5050;
const app = express();

app.use(cors());
app.use(express.json());
app.use("/record", records);
app.use('/api/users/me', profile);

// start the Express server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error(" Failed to start server:", err);
  });