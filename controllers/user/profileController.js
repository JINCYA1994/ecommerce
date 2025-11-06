
const User=require('../../models/userSchema')
const nodemailer = require("nodemailer");
const bcrypt = require('bcryptjs');
const env=require('dotenv').config()
const session=require('express-session')
const Otp=require('../../models/otpSchema')

const getForgotPassPage=async (req,res) => {

try {
    res.render('forgotPassword')
} catch (error) {
    res.redirect('/pageNotFound')
}

}

const resetPassword=async (req,res) => {

try {

const{email,password,confirmPassword}=req.body
if(!password || !confirmPassword){
req.flash('error','All fields are required')
return res.redirect('/forgot-password')
}
if(password!==confirmPassword){
  req.flash('error','Password do not match')
  return res.redirect('/forgot-password')
}

  const user = await User.findOne({ email });
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/forgot-password');
    }
  const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();
  console.log(" Password updated successfully for:", email);

    req.flash("success", "Password reset successfully. Please login.");
    return res.redirect("/login");

} catch (error) {
  console.error("Error resetting password:", error);
    req.flash("error", "Something went wrong. Try again.");
    res.redirect("/forgot-password");
}

}




function generateOTP() {
 return  Math.floor(100000+Math.random()*900000).toString()
  
}

const forgotEmailValid=async (req,res) => {
   try{
        const {email}=req.body
        const findUser=await User.findOne({email:email})
        if(!findUser){
            req.flash ('error','Email not found')
            return res.redirect('/forgot-password')
        }

 const otp= generateOTP()
await Otp.deleteMany({ email, purpose: "forgot_password" });
     const newOtp = new Otp({ 
              email,
              otp,
              purpose: "forgot_password" 
            });
          
           await newOtp.save(); 
  
           const sent=await sendOtpEmail(email,otp) 

if(sent){
  console.log(`OTP sent to ${email}:${otp}`)
  res.render('forgotVerifyOtp', { email, purpose: "forgot_password" });
}
else {
      req.flash('error', 'Failed to send OTP. Try again.');
      res.redirect('/forgot-password');
    }
} catch (error) {
    console.error("Error in forgotEmailValid:", error);
    req.flash('error', 'Something went wrong');
    res.redirect('/forgot-password');
  }
};




async function sendOtpEmail(email, otp) {
  const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, 
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  connectionTimeout: 10000 
});

const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "verify your account",
      html: `<b>Your OTP: ${otp}</b>`
    });
return info.accepted.length>0
  
       
  }
  

          
             


const forgotVerifyOtp = async (req, res) => {
  try {
const { email,purpose } = req.body;
const otpArray = req.body.otp; 
const otp = otpArray.join('');
   console.log("Email received:", email);
    console.log("Purpose received:", purpose);
    console.log("Entered OTP:", otp);


const validOtp = await Otp.findOne({ email, otp, purpose}); 
 console.log("OTP found in DB:", validOtp);
    if (!validOtp) {
      req.flash('error', 'Invalid or expired OTP');
    console.log(" OTP invalid or expired");
      return res.redirect('/forgot-verify-otp');
    }

await Otp.deleteOne({ _id: validOtp._id })
    console.log(" OTP verified successfully");
return res.render('resetpassword',{ email, purpose: "forgot_password" })
}

catch(error){
   console.error("Error verifying OTP:", error);
    req.flash('error', 'Something went wrong');
    res.redirect('/forgot-password');
}


}

const resendOtp = async (req, res) => {
  try {
    const { email, purpose } = req.body;
      console.log("Received resend OTP request:", req.body);
    
     if (!email || !purpose) {
      console.log(" Missing email or purpose");
      return res.json({ success: false, message: "Invalid request data" });
    }
    ;
    
      const newOtpCode = generateOTP();
    console.log(" Generated OTP:", newOtpCode)
    await Otp.deleteMany({ email, purpose });
   
     console.log("Old OTPs deleted");
    const newOtp = new Otp({ email, otp: newOtpCode, purpose });
    await newOtp.save();
   console.log(" New OTP saved to DB"); 
    const sent = await sendOtpEmail(email, newOtpCode);
  console.log(" Email send result:", sent);
    if (sent) {
      console.log(` Resent OTP to ${email}: ${newOtpCode}`);
      return res.json({ success: true, message: "OTP resent successfully!" });
    } else {

       console.log(" Failed to send email");
      return res.json({ success: false, message: "Failed to resend OTP." });
    }
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.json({ success: false, message: "Server error. Try again." });
  }
};







module.exports={getForgotPassPage,forgotEmailValid,forgotVerifyOtp,  resendOtp ,resetPassword}