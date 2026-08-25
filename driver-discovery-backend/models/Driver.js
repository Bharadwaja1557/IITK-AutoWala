import mongoose from "mongoose";

const DriverSchema = new mongoose.Schema({
  name: String,
  phone: { type: String, unique: true },
  vehicle_type: String,
  zone: String,
  is_available: Boolean,
  last_seen: Number
});

export default mongoose.model("Driver", DriverSchema);
