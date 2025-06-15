import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  docId: { type: String, required: true },
  slotDate: { type: String, required: true },
  slotTime: { type: String, required: true },
  userData: { type: Object, required: true }, // should be an object, not string
  docData: { type: Object, required: true },  // should be an object, not string
  amount: { type: String, required: true },
  date: { type: Date, default: Date.now },     // fixed typo: 'data' => 'date'
  cancelled: { type: Boolean, default: false },
  payment: { type: Boolean, default: false },
  isCompleted: { type: Boolean, default: false } // fixed typo: 'isCompletede'
});

const appointmentModel = mongoose.models.appointment || mongoose.model("appointment", appointmentSchema);

export default appointmentModel;
