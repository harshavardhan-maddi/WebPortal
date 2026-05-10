import mongoose from "mongoose";
import User from "../models/User";
import connectDB from "./mongodb";

const cyberSecurityStudents = [
  "25475A4603", "24471A4652", "24471A4617", "24471A4624", "24471A4656",
  "24471A4608", "24471A4604", "24471A4610", "24471A4609", "24471A4611",
  "24471A4616", "24471A4644", "24471A4627", "24471A4658", "25475A4606",
  "25475A4605", "24471A4643", "24471A4647", "24471A4606", "24471A4654"
];

async function seedStudents() {
  try {
    await connectDB();
    console.log("Connected to MongoDB for seeding...");

    // Clear existing students in this domain if needed (optional)
    // await User.deleteMany({ domain: "cyber-security", role: "STUDENT" });

    const studentData = cyberSecurityStudents.map(roll => ({
      name: `Student ${roll}`,
      email: `${roll}@nrtec.in`,
      password: roll, // Plain text for demo, should be hashed in production
      role: "STUDENT",
      rollNumber: roll,
      domain: "cyber-security",
      college: "NRTEC"
    }));

    // Use bulk insert for efficiency
    for (const student of studentData) {
      await User.findOneAndUpdate(
        { rollNumber: student.rollNumber },
        student,
        { upsert: true, new: true }
      );
    }

    console.log(`Successfully seeded ${cyberSecurityStudents.length} students into Cyber Security domain.`);
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seedStudents();
