import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import records from "./routes/record.js";
import skills from "./routes/skills.js";
//import profile from "./routes/profile.js";

const PORT = process.env.PORT || 5050;
const app = express();

app.use(cors());
app.use(express.json());
app.use("/record", records);
app.use("/api/skills", skills);
//app.use('/api/users/me', profile);

// start the Express server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});