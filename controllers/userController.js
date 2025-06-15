import validator from "validator";
import bcrypt from "bcrypt";
import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js"
import dotenv from "dotenv"
dotenv.config();
//import appointmentModel from "../models/appointmentModel.js";
// API to register user
const registerUser = async (req, res) => {
  try {
    
    const { name, email, password } = req.body;

    if (!name || !password || !email) {
      return res.json({ success: false, message: "Missing Details" });
    }

    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Enter a valid email" });
    }

    if (password.length < 8) {
      return res.json({ success: false, message: "Enter a strong password" });
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      name,
      email,
      password: hashedPassword,
    };

    const newUser = new userModel(userData);
    const user = await newUser.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({ success: true, token, user });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

// API to login user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({ success: true, token, user });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

// Api to get usr profile data
const getProfile = async (req, res) => {
  try {
    console.log("profile here");
    const { userId } = req.body;
    const userData = await userModel.findById(userId).select("-password");
    res.json({ success: true, userData });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

//API to update profile
const updateProfile = async (req, res) => {
  try {
    const { userId, name, phone, dob, gender } = req.body;
    const imageFile = req.file;
    if (!name || !phone || !dob || !gender) {
      return res.json({ success: false, message: "Data Missing" });
    }
    await userModel.findByIdAndUpdate(userId, { name, phone, dob, gender });
    const usernow = await userModel.findById(userId);
    console.log(usernow);
    if (imageFile) {
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: "image",
      });
      const imageURL = imageUpload.secure_url;
      await userModel.findByIdAndUpdate(userId, { image: imageURL });
    }
    res.json({ success: true, message: "Profile Updated" });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

// api to book appointment

const bookAppointment = async (req, res) => {
  try {
    const { userId, docId, slotDate, slotTime } = req.body;
    console.log("Booking appointment for:", userId, docId, slotDate, slotTime);
    const docData = await doctorModel.findById(docId).select("-password");

    if (!docData.available) {
      return res.json({ success: false, message: "Doctor not available" });
    }
    // const userDat = await userModel.findById(userId).select('-password');
    // if (!userDat) {
    //   console.log("❌ No user found for ID:", userId);
    //   return res.json({ success: false, message: 'Invalid User ID' });
    // }
    let slots_booked = docData.slots_booked;

    if (slots_booked[slotDate]) {
      if (slots_booked[slotDate].includes(slotTime)) {
        return res.json({ success: false, message: "slot not available" });
      } else {
        slots_booked[slotDate].push(slotTime);
      }
    } else {
      slots_booked[slotDate] = [];
      slots_booked[slotDate].push(slotTime);
    }
    const userData = await userModel.findById(userId).select("-password");
    delete docData.slots_booked;

    const appointmentData = {
      userId,
      docId,
      userData,
      docData,
      amount: docData.fees,
      slotTime,
      slotDate,
      date: Date.now(),
    };
    const newAppointment = new appointmentModel(appointmentData);
    await newAppointment.save();
    await doctorModel.findByIdAndUpdate(docId, { slots_booked });
    res.json({ success: true, message: "Appointment Booked" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

//api to get user Appointments for frontend my-appointments page
const listAppointment = async (req, res) => {
  try {
    const { userId } = req.body;
    const appointments = await appointmentModel.find({ userId });
    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

//api to cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    const { userId, appointmentId } = req.body;
    const appointmentData = await appointmentModel.findById(appointmentId);

    //verify appointment user
    if (appointmentData.userId !== userId) {
      return res.json({ success: false, message: "unauthorized action" });
    }
    await appointmentModel.findByIdAndUpdate(appointmentId, {
      cancelled: true,
    });

    //releasing doctor slot
    const { docId, slotDate, slotTime } = appointmentData;
    const doctorData = await doctorModel.findById(docId);
    let slots_booked = doctorData.slots_booked;
    slots_booked[slotDate] = slots_booked[slotDate].filter(
      (e) => e != slotTime
    );
    await doctorModel.findByIdAndUpdate(docId, { slots_booked });
    res.json({ success: true, message: "Appointment Cancelled" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const generateChecksum = (payloadBase64, saltKey, saltIndex) => {
  const stringToSign = payloadBase64 + "/pg/v1/pay" + saltKey;
  const hash = crypto.createHash("sha256").update(stringToSign).digest("hex");
  return `${hash}###${saltIndex}`;
};
const PaymentPhonepe = async (req, res) => {
  try {
    console.log("in requesting payment");
    const { appointmentId } = req.body;
    const appointment = await appointmentModel.findById(appointmentId);
    console.log("appointment data:", appointment);
    if (!appointment || appointment.cancelled) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or cancelled appointment" });
    }

    const amount = parseInt(appointment.amount) * 100;
    console.log("amount:", amount);
    const merchantTransactionId = appointment._id.toString(); // Unique txn ID
    console.log(merchantTransactionId.length);
    console.log(merchantTransactionId);
    const payload = {
      merchantId: process.env.PHONEPE_MERCHANT_ID,
      merchantTransactionId,
      merchantUserId: appointment.userId || "guest_user",
      amount,
      callbackUrl: process.env.CALLBACK_URL,
      redirectUrl: `${process.env.FRONTEND_URL}/my-appointments`,
      paymentInstrument: { type: "PAY_PAGE" },
    };
    console.log(process.env.CALLBACK_URL);
    console.log(payload);
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString(
      "base64"
    );
    const xVerify = generateChecksum(
      payloadBase64,
      process.env.PHONEPE_SALT_KEY,
      process.env.PHONEPE_SALT_INDEX
    );
    console.log(payloadBase64);
    console.log(xVerify);
    console.log(process.env.PHONEPE_API_ENDPOINT);

    const response = await axios.post(
      process.env.PHONEPE_API_ENDPOINT, // Use the endpoint from environment variable
      { request: payloadBase64 },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerify,
          "X-MERCHANT-ID": process.env.PHONEPE_MERCHANT_ID,
        },
      }
    );
    console.log(response.data);

    if (response.data.success && response.data.code === "PAYMENT_INITIATED") {
      const redirectUrl =
        response.data.data.instrumentResponse.redirectInfo.url;
      console.log(redirectUrl);
      return res.status(200).json({
        success: true,
        message: "Payment initiated. Redirecting to payment page.",
        redirectUrl: redirectUrl,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Failed to initiate payment.",
        data: response.data,
      });
    }
  } catch (err) {
    console.error(err.message);
    res
      .status(500)
      .json({ success: false, message: "Payment creation failed" });
  }
};
//server to server callback
const paymentcalllback = async (req, res) => {
  try {
    console.log("listening here after payment");
    console.log(req.body);
    const decodedResponse = JSON.parse(
      Buffer.from(req.body.response, "base64").toString("utf8")
    );

    console.log("Decoded Response:", decodedResponse);
    const responsecode = decodedResponse.data.responseCode;
    const merchantTransactionId = decodedResponse.data.merchantTransactionId;
    const appointment = await appointmentModel.findById(merchantTransactionId);
    console.log(appointment)
    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found." });
    }

    if (responsecode === "SUCCESS") {
      appointment.payment = true;
      appointment.isCompleted = true;
      await appointment.save();

      if (responsecode === "SUCCESS") {
        console.log(`${process.env.REDIRECT_URL}/my-appointments`)
        return res.redirect(
         `${process.env.REDIRECT_URL}/my-appointments`
        );
      } else {
        return res.redirect(
          `${process.env.FRONTEND_URL}/my-appointments?status=failed`
        );
      }
    } else {
      res.json({ success: false, message: "Payment failed or was cancelled." });
    }
  } catch (err) {
    console.error(err.message);
    res
      .status(500)
      .json({ success: false, message: "Error processing callback." });
  }
};
export {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  bookAppointment,
  listAppointment,
  cancelAppointment,
  PaymentPhonepe,
  paymentcalllback,
};
