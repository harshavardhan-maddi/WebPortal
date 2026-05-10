import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false }, // Optional for students, required for admins
  role: { 
    type: String, 
    enum: ["SUPER_ADMIN", "DOMAIN_ADMIN", "STUDENT"], 
    default: "STUDENT" 
  },
  rollNumber: { type: String, unique: true, sparse: true },
  college: { type: String },
  mobile: { type: String },
  domain: { type: String }, // For domain admins and students
  quizSessionToken: { type: String },
  lastLogin: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model("User", UserSchema);
