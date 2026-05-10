import mongoose from "mongoose";

const ResultSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  domain: { type: String, required: true },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  percentage: { type: Number, required: true },
  timeTaken: { type: Number, required: true }, // in seconds
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
    selectedOptions: [Number], // Indices
    isCorrect: Boolean
  }],
  syncedToGoogleSheets: { type: Boolean, default: false },
  submissionTime: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.Result || mongoose.model("Result", ResultSchema);
