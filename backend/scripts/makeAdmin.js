import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";

const email = process.argv[2];
if (!email) {
  console.log("Usage : node scripts/makeAdmin.js email@exemple.com");
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);
const user = await User.findOneAndUpdate(
  { email: email.toLowerCase() },
  { role: "admin" },
  { new: true }
);
console.log(user ? `${user.email} est maintenant admin` : "Utilisateur introuvable");
await mongoose.disconnect();