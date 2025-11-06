 const express = require('express');
 const router = express.Router();
 const userController=require('../controllers/user/userController')  
const shopController=require('../controllers/user/shopController')
const passport = require('../config/passport');
const productController=require('../controllers/user/productController')
const profileController=require('../controllers/user/profileController')
 const{userAuth,adminAuth}=require('../middlewares/auth')



router.get('/',userController.loadHomepage)  
router.get('/login',userController.loadlogin)  
router.post('/login',userController.loginpost) 
router.post('/signup',userController.registerSignup)
router.get('/signup',userController.loadSignup)
router.post('/verify-otp',userController.verifyOtp)
router.get('/resend_otp',userController.resendOtp)
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
     res.redirect('/')
})
router.get('/logout',userController.logout)

//profile Management

router.get('/forgot-password',profileController.getForgotPassPage)
router.post('/forgot-email-valid',profileController.forgotEmailValid)
router.post('/forgot-verify-otp',profileController.forgotVerifyOtp)
router.post('/resend-otp', profileController.resendOtp);
router.post('/reset-password',profileController.resetPassword)

//shop
router.get('/shop',shopController.loadShop)

//productdetails
router.get('/productDetails/:id',productController.loadProductDetails)

router.post('/product/:id/review', productController.submitReview);

        module.exports  =router