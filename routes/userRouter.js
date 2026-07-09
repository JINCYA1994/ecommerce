 const express = require('express');
 const router = express.Router();
 const userController=require('../controllers/user/userController')  
const shopController=require('../controllers/user/shopController')
const passport = require('../config/passport');
const productController=require('../controllers/user/productController')
const profileController=require('../controllers/user/profileController')
const addressController=require('../controllers/user/addressController')
const cartController=require('../controllers/user/cartController')
const wishlistController=require('../controllers/user/wishlistController')
const orderController=require('../controllers/user/orderController')
 const{userAuth}=require('../middlewares/auth')
const upload = require('../config/multer'); 
const preventLogin = require('../middlewares/preventLogin');
const checkoutController = require('../controllers/user/checkoutController');
const orderdetailsController=require('../controllers/user/orderdetailsController')
const paymentController=require('../controllers/user/paymentController')
const walletController=require('../controllers/user/walletController')
router.get('/login', preventLogin, userController.loadlogin);


router.get('/',userController.loadHomepage)  
router.get('/home',userAuth,userController.loadHomepage)  
 
router.post('/login',userController.loginpost) 
router.post('/signup',userController.registerSignup)
router.get('/signup',userController.loadSignup)
router.post('/verify-otp',userController.verifyOtp)
router.get('/resend_otp',userController.resendOtp)
router.get('/verify-otp', userController.loadVerifyOtp);
router.get(
  '/auth/google',

  passport.authenticate('google', { scope: ['profile','email'] })
)



router.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    req.session.user = req.user;
    res.redirect('/home');
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

router.get('/profile',userAuth,profileController.userProfile)
router.get('/edit-profile',userAuth,profileController.editProfile)
router.get('/edit-name',userAuth,profileController.editName)
router.patch('/edit-name',userAuth,profileController.updateName)
router.get('/edit-email',userAuth,profileController.editEmail)
router.patch('/edit-email',userAuth,profileController.updateEmail)
router.post('/verify-email-otp', profileController.verifyEmailOtp);
router.post('/email-resend-otp', profileController.updateEmailresend);
router.get('/change-password', userAuth, profileController.getChangePasswordPage);
router.patch('/change-password', userAuth, profileController.postChangePassword);
router.post('/update-profileimage', upload.single('profileImage'), profileController.updateProfileImage);
router.get('/verify-email-otp', profileController.getVerifyEmailOtpPage);


//address

router.get('/address',userAuth,addressController.getaddresspage)
router.post('/address',userAuth,addressController.saveAddress)
router.delete("/address/:id",userAuth, addressController.deleteAddress);
// wishlist
router.get('/wishlist',userAuth,wishlistController.getwishlistPage)
router.post("/add-wishlist",userAuth, wishlistController.addToWishlist);
router.delete("/wishlist/:id", wishlistController.removeWishlistItem);

// cart
router.get('/cart',userAuth,cartController.getcartpage)
router.post('/cart',userAuth,cartController.addToCart)
router.delete('/remove-cart/:id',userAuth,cartController.removeCartItem )
 router.post('/cart/update-quantity',userAuth ,cartController.updateQuantity);
router.get("/checkout/check-items",userAuth,cartController.checkCheckoutItems);

// order
router.post('/verify-payment', userAuth, orderController.verifyPayment);
router.get('/place-order-cod', userAuth, orderController.placeOrderCOD)
router.get('/order-success/:id', userAuth, orderController.getOrderSuccessPage)
router.get('/order-failure',userAuth,orderController.getOrderFailurePage)
router.get('/orders', userAuth, orderdetailsController.listorderDetails);
router.get('/orders/:orderID', userAuth,orderdetailsController.orderDetails);
router.get('/invoice/:id',userAuth,orderdetailsController.invoicePage)
router.post('/cancel-order',userAuth,orderdetailsController. cancelOrder);
router.post('/cancel-product',userAuth,orderdetailsController.cancelProduct)
router.post('/return-product',userAuth,orderdetailsController.returnProduct)
router.post( "/payment/razorpay/create-order",userAuth,paymentController.createRetryPayment)
router.post( "/update-payment-failed",paymentController.updatePaymentFailed);
router.get('/place-order-wallet', userAuth,paymentController.placeOrderWallet)



//checkout
router.get('/checkout',userAuth,checkoutController.viewcheckoutPage)
router.post("/apply-coupon",userAuth,checkoutController. applyCoupon);
router.post("/remove-coupon",userAuth,checkoutController. removeCoupon);
router.post('/place-order',userAuth,orderController.placeOrderpage)
// router.get('/coupons', userAuth, orderController.getCouponsPage)



// //shop
router.get('/shop',shopController.loadShop)
router.get("/getVariantSizes/:variantId", shopController.getVariantSizes);


//productdetails
router.get('/productDetails/:id',productController.loadProductDetails)

router.post('/product/:id/review', productController.submitReview);

router.get ('/pagenotfound',userController. pageNotFound )


// wallet
router.get('/wallet',userAuth,walletController.walletPage)







        module.exports  =router