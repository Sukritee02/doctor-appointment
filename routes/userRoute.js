//api function opertions
const express = require("express");
const router = express.Router();
const User = require("../models/userModel");
const Doctor = require("../models/doctorModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middlewares/authmiddleware");
const Appointment = require("../models/appointmentModel");
const moment = require("moment");

// whenever the end point is called from the client the function here will be exected.
// str is end point then callback finction its str will be try catch block coz we are using async. for all the mongdb concenp we will use await for function to call

router.post("/register", async (req, res) => {
  try {
    const userExists = await User.findOne({ email: req.body.email });
    if (userExists) {
      return res
        .status(200)
        .send({ message: "User Already Exists", success: false });
    }
    const password = req.body.password;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    req.body.password = hashedPassword;
    const newuser = new User(req.body);
    await newuser.save();
    res
      .status(200)
      .send({ message: "User Created Sucessfully", success: true });
  } catch (error) {
    console.log(error);

    res
      .status(500)
      .send({ message: "Error Creating User", success: false, error });
  }
});

router.post("/login", async (req, res) => {
  try {
    // first we will find the email if there is no email then no login, errmsg will be poped we no check the password
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res
        .status(200)
        .send({ message: " User does not exist.", success: false });
    }
    // comparing encrpted password with the normal password here await bcrypt.compare(user_input_normal-password, encrpted_password)
    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) {
      return res
        .status(200)
        .send({ message: " Password is incorrect", success: false });
    } else {
      // jwt.sign will generte the token ;first paramenter will be idie payload the it will be secret key; every they need to login token will be expired in 1 day
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });
      res
        .status(200)
        .send({ message: "Login successful", success: true, data: token });
    }
  } catch (error) {
    console.log(error);

    res
      .status(500)
      .send({ message: "Error Logging in", success: false, error });
  }
});

// token valid then only we will send the response to the frontend
// in this end point we r going to send email and user to the user after the successfull login
router.post("/get-user-info-by-id", authMiddleware, async (req, res) => {
  // every time they will only send one thing that the token to the backend
  try {
    const user = await User.findById({ _id: req.body.userId });
    user.password = undefined;
    if (!user) {
      return res
        .status(200)
        .send({ message: "User does not exist", success: false });
    } else {
      res.status(200).send({
        success: true,
        data: user,
      });
    }
  } catch (error) {
    res
      .status(500)
      .send({ message: "Error getting user info", success: false, error });
  }
});

router.post("/apply-doctor-account", authMiddleware, async (req, res) => {
  try {
    const newdoctor = new Doctor({ ...req.body, status: "pending" });
    await newdoctor.save();
    const adminUser = await User.findOne({ isAdmin: true });

    const unseenNotifications = adminUser.unseenNotifications;
    unseenNotifications.push({
      type: "New-Doctor-request",
      message: `${newdoctor.firstName} ${newdoctor.lastName} has applied for doctor account`,
      data: {
        doctorId: newdoctor._id,
        name: newdoctor.firstName + " " + newdoctor.lastName,
      },
      onClickPath: "/admin/doctorslist",
    });
    await User.findByIdAndUpdate(adminUser._id, { unseenNotifications });
    res.status(200).send({
      success: true,
      message: "Doctor account applied successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      message: "Error applying doctor account",
      success: false,
      error,
    });
  }
});

router.post(
  "/mark-all-notofications-as-seen",
  authMiddleware,
  async (req, res) => {
    try {
      const user = await User.findOne({ _id: req.body.userId });
      const unseenNotifications = user.unseenNotifications;
      const seenNotifications = user.seenNotifications;
      seenNotifications.push(...unseenNotifications);
      user.unseenNotifications = [];
      user.seenNotifications = seenNotifications;
      const updatedUser = await user.save();
      updatedUser.password = undefined;
      res.status(200).send({
        success: true,
        message: "All notifications marked as seen",
        data: updatedUser,
      });
    } catch (error) {
      console.log(error);

      res.status(500).send({
        message: "Error applying doctor account",
        success: false,
        error,
      });
    }
  }
);

router.post("/delete-all-notifications", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.body.userId });
    user.seenNotifications = [];
    user.unseenNotifications = [];
    const updatedUser = await user.save();
    updatedUser.password = undefined;
    res.status(200).send({
      success: true,
      message: "All notifications are deleted",
      data: updatedUser,
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      message: "Error applying doctor account",
      success: false,
      error,
    });
  }
});

router.get("/get-all-approved-doctors", authMiddleware, async (req, res) => {
  try {
    const doctors = await Doctor.find({ status: "approved" });
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

router.post("/book-appointment", authMiddleware, async (req, res) => {
  try {
    req.body.status = "pending";
    req.body.date = moment(req.body.date, 'DD-MM-YYYY').toISOString();
    req.body.time = moment(req.body.time, 'HH:mm').toISOString();
    const newAppointment = new Appointment(req.body);
    await newAppointment.save();
    // pushing notification to doctor based on his userId
    const user = await User.findOne({ _id: req.body.doctorInfo.userId });
    user.unseenNotifications.push({
      type: "new-appointment-request",
      message: `${req.body.userInfo.name} has booked appointment`,
      onClickPath: "/doctor/appointments",
    });
    await user.save();
    res.status(200).send({
      success: true,
      message: "Appointment booked successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      message: "Error booking appointment",
      success: false,
      error,
    });
  }
});

// router.post("/check-booking-availability", authMiddleware, async (req, res) => {
//   try {
//     const date = moment(req.body.date, "DD-MM-YYYY").toISOString();
//     const fromTime = moment(req.body.fromTime, "HH:mm")
//       .subtract(60, "minutes")
//       .toISOString();
//     const toTime = moment(req.body.toTime, "HH:mm")
//       .add(60, "minutes")
//       .toISOString();
//     const doctorId = req.body.doctorId;
//     const appointments = await Appointment.find({
//       doctorId,
//       date,
//       time: { $gte: fromTime, $lte: toTime },
//       // status: "approved",
//     });
//     if (appointments.length > 0) {
//       res.status(200).send({
//         success: false,
//         message: "Appointments not available",
//       });
//     } else {
//       res.status(200).send({
//         success: true,
//         message: "Appointments available",
//       });
//     }
//   } catch (error) {
//     console.log(error);

//     res.status(500).send({
//       message: "Error booking appointment",
//       success: false,
//       error,
//     });
//   }
// });

router.post("/check-booking-availability", authMiddleware, async (req, res) => {
  try {
    const date = moment(req.body.date, 'DD-MM-YYYY').toISOString(); // Convert date to ISOString
    const time = moment(req.body.time, "HH:mm").toISOString(); // Convert time to ISOString
    const doctorId = req.body.doctorId;

    // Calculate the start and end times for the 1-hour range
    // const startTime = moment(time).subtract(30, 'minutes').toDate();
    // const endTime = moment(time).add(30, 'minutes').toDate();

    // Calculate the start and end times for the 45-minute range
    const startTime = moment(time).subtract(22.5, 'minutes').toISOString();
    const endTime = moment(time).add(22.5, 'minutes').toISOString();


    const appointments = await Appointment.find({
      doctorId,
      date,
      time: { $gte: startTime, $lte: endTime },
    });

    if (appointments.length > 0) {
      res.status(200).send({
        success: false,
        message: "Appointments not available",
      });
    } else {
      res.status(200).send({
        success: true,
        message: "Appointments available",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error checking appointment availability",
      success: false,
      error,
    });
  }
});

router.get("/get-appointments-by-user-id", authMiddleware, async (req, res) => {
  try {
    const appointments = await Appointment.find({ userId : req.body.userId });
    res.status(200).send({
      message: "Appointments  fetched Sucessfully",
      success: true,
      data: appointments,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error getting appointments",
      success: false,
      error,
    });
  }
});

module.exports = router;
