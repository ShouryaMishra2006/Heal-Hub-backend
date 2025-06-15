import express from 'express'
import { getProfile, loginUser, registerUser , updateProfile,bookAppointment,listAppointment,cancelAppointment,PaymentPhonepe,paymentcalllback} from '../controllers/userController.js'
import authUser from '../middlewares/authUser.js'
import upload from '../middlewares/multer.js'
//import appointmentModel from '../models/appointmentModel.js';

const userRouter = express.Router()

userRouter.post('/register',registerUser)
userRouter.post('/login',loginUser)
userRouter.get('/get-profile',authUser,getProfile)
userRouter.post('/update-profile', upload.single('image'),authUser,updateProfile)
userRouter.post('/book-appointment',authUser,bookAppointment)
userRouter.get('/appointments',authUser,listAppointment)
userRouter.post('/cancel-appointment',authUser,cancelAppointment)
userRouter.post('/payment-phonepe',authUser,PaymentPhonepe)
userRouter.post('/payment-callback',paymentcalllback)


export default userRouter
