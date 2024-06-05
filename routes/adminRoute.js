const express = require("express");
const router = express.Router();
const User = require("../models/userModel");
const Doctor = require("../models/doctorModel");
const authMiddleware = require("../middlewares/authmiddleware");     

router.get("/get-all-doctors", authMiddleware, async (req, res) => {
  try {
    const doctors = await Doctor.find({});
    res.status(200).send({
      message: "Doctor fetched Sucessfully",
      success: true,
      data: doctors,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error applying doctors account",
      success: false,
      error,
    });
  }
});

router.get("/get-all-users", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({});

    res.status(200).send({
      message: "User fetched Sucessfully",
      success: true,
      data: users,
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      message: "Error applying doctors account",
      success: false,
      error,
    });
  }
});

router.post(
  "/change-doctor-account-status",
  authMiddleware,
  async (req, res) => {
    try {
      const { doctorId, status} = req.body;
      const doctor = await Doctor.findByIdAndUpdate(doctorId, { status });
      const user = await User.findOne({ _id: doctor.userId });
      const unseenNotifications = user.unseenNotifications;
      unseenNotifications.push({
        type: "New-Doctor-request-changed",
        message: `Your doctor account has been ${status}`,
        onClickPath: "/notifications",
      });
      user.isDoctor = status === "approved"? true : false;
      await user.save();

      // const doctors = await Doctor.find({});

      res.status(200).send({
        message: "Doctor status updated Sucessfully",
        success: true,
        data: doctor,
      });
    } catch (error) {
      console.log(error);

      res.status(500).send({
        message: "Error applying doctors account",
        success: false,
        error,
      });
    }
  }
);

// router.post(
//   "/book-appointment",
//   authMiddleware,
//   async (req, res) => {
//     try {
    
//     } 
//     catch (error) {
//       console.log(error);

//       res.status(500).send({
//         message: "Error applying doctors account",
//         success: false,
//         error,
//       });
//     }
//   }
// );

module.exports = router;
