import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/Heal-Hub`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Database Connected");
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB Connection Error:", err);
    });

  } catch (error) {
    console.log(process.env.MONGODB_URI)
    console.error("Database Connection Failed:", error);
    process.exit(1); 
  }
};

export default connectDB;
