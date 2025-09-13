 const express = require('express');
        const router = express.Router();
      const userController=require('../controllers/user/userController')  



        router.get('/',userController.loadHomepage)  

 router.get('/login',userController.loadlogin)  
router.post('/login',userController.loginpost)
 router.get('/signup',userController.loadSignup)  
router.post('/signup',userController.registerSignup)
router.post('/verify-otp',userController.verifyOtp)
router.get('/resend_otp',userController.resendOtp)




        module.exports  =router