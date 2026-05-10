import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema({
  domain: { type: String, required: true },
  text: { type: String, required: true },
  type: { 
    type: String, 
    enum: ["MCQ", "MULTI_SELECT", "TRUE_FALSE"], 
    required: true 
  },
  options: [{
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false }
  }],
  difficulty: { 
    type: String, 
    enum: ["EASY", "MEDIUM", "HARD"], 
    default: "MEDIUM" 
  },
  explanation: { type: String },
  image: { type: String }, // Cloudinary URL
  codeBlock: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export default mongoose.models.Question || mongoose.model("Question", QuestionSchema);
