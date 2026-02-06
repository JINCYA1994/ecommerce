 const express = require('express');
 const router = express.Router();
 const userController=require('../controllers/user/userController')  
const shopController=require('../controllers/user/shopController')
const passport = require('../config/passport');
const productController=require('../controllers/user/productController')
const profileController=require('../controllers/user/profileController')
 const{userAuth}=require('../middlewares/auth')

const preventLogin = require('../middlewares/preventLogin');

router.get('/login', preventLogin, userController.loadlogin);


router.get('/',userController.loadHomepage)  
router.get('/home',userAuth,userController.loadHomepage)  
// router.get('/login',userController.loadlogin)  
router.post('/login',userController.loginpost) 
router.post('/signup',userController.registerSignup)
router.get('/signup',userController.loadSignup)
router.post('/verify-otp',userController.verifyOtp)
router.get('/resend_otp',userController.resendOtp)

router.get(
  '/auth/google',

  passport.authenticate('google', { scope: ['profile','email'] })
)


router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
      console.log("Google login successful. User:", req.user);


    req.session.user = req.user;
     res.redirect('/home')
})

router.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/signup' }),
  (req, res) => {

    req.session.regenerate(err => {
      if (err) {
        console.log(err);
        return res.redirect('/login');
      }

      req.session.user =req.user

      res.redirect('/home');
    });
  }
);


router.get('/logout',userController.logout)

//profile Management

router.get('/forgot-password', profileController.getForgotPassPage);
router.post('/forgot-email-valid', profileController.forgotEmailValid);

router.get('/forgot-verify-otp', profileController.getForgotVerifyOtpPage);
router.post('/forgot-verify-otp', profileController.forgotVerifyOtp);

router.post('/resend-otp', profileController.resendOtp);

router.get('/reset-password-page', profileController.getResetPasswordPage);
router.post('/reset-password', profileController.resetPassword);

//shop
router.get('/shop',shopController.loadShop)

//productdetails
router.get('/productDetails/:id',productController.loadProductDetails)

router.post('/product/:id/review', productController.submitReview);

        module.exports  =router