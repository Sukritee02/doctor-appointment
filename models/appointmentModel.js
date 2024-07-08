const mongoose = require("mongoose");
const AppointmentSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    doctorId: {
      type: String,
      required: true,
    },
    doctorInfo: {
      type: Object,
      required: true,
    },
    userInfo: {
      type: Object,
      required: true,
    },
    date: {
      type: Date, // Change to Date type
      required: true,
    }, 
    time: {
      type: Date, // Change to Date type
      // type: String,  Change to String type
      required: true,
    },
    status: {
      type: String,
      required: true,
      default: "pending",
    },                       
  },
  {
    timestamps: true,
  }
);

const appointmentModel = mongoose.model("appointments", AppointmentSchema);
module.exports = appointmentModel;
