import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve("./.env") });

console.log("MONGODB_URI =", process.env.MONGODB_URI);
console.log("PORT =", process.env.PORT);
