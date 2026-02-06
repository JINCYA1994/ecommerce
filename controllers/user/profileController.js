const User=require('../../models/userSchema')
const nodemailer = require("nodemailer");
const bcrypt = require('bcryptjs');
const env=require('dotenv').config()
const session=require('express-session')
const Otp=require('../../models/otpSchema')


// Load Forgot Password Page
const getForgotPassPage = async (req, res) => {
  try {
    res.render('forgotPassword');
  } catch (error) {
    console.log(error);
    res.redirect('/pageNotFound');
  }
};




function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}





// Email Validation + Send OTP
const forgotEmailValid = async (req, res) => {
  try {
    const { email } = req.body;

    const findUser = await User.findOne({ email });
    if (!findUser) {
      req.flash('error', 'Email not found');
      return res.redirect('/forgot-password');
    }

    const otp = generateOTP();

    await Otp.deleteMany({ email, purpose: "forgot_password" });

    const newOtp = new Otp({
      email,
      otp,
      purpose: "forgot_password"
    });

    await newOtp.save();

    const sent = await sendOtpEmail(email, otp);

    if (sent) {
      console.log(`OTP sent to ${email}: ${otp}`);

      //  Store in session (IMPORTANT FIX)
      req.session.forgotEmail = email;
      req.session.forgotPurpose = "forgot_password";

      return res.redirect('/forgot-verify-otp');
    } else {
      req.flash('error', 'Failed to send OTP. Try again.');
      return res.redirect('/forgot-password');
    }

  } catch (error) {
    console.error("Error in forgotEmailValid:", error);
    req.flash('error', 'Something went wrong');
    return res.redirect('/forgot-password');
  }
};

// OTP Email Sending Function
async function sendOtpEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
       tls: {
    ciphers: "SSLv3",
    rejectUnauthorized: false
  }
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "Forgot Password OTP",
      html: `<b>Your OTP: ${otp}</b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.log("Email sending error:", error);
    return false;
  }
}

// Load OTP Verify Page
const getForgotVerifyOtpPage = async (req, res) => {
  try {
    const email = req.session.forgotEmail;
    const purpose = req.session.forgotPurpose;

    if (!email || !purpose) {
      req.flash("error", "Session expired. Please try again.");
      return res.redirect("/forgot-password");
    }

    return res.render("forgotVerifyOtp", { email, purpose });
  } catch (error) {
    console.log(error);
    return res.redirect("/forgot-password");
  }
};

// Verify OTP
const forgotVerifyOtp = async (req, res) => {
  try {
    const email = req.session.forgotEmail;
    const purpose = req.session.forgotPurpose;

    if (!email || !purpose) {
      req.flash("error", "Session expired. Please try again.");
      return res.redirect("/forgot-password");
    }

    let otp = req.body.otp;
    if (Array.isArray(otp)) otp = otp.join("");

    const validOtp = await Otp.findOne({ email, otp, purpose });
  console.log("OTP found in DB:", validOtp);
    if (!validOtp) {
      req.flash("error", "Invalid or expired OTP");
      return res.redirect("/forgot-verify-otp");
    }

    await Otp.deleteOne({ _id: validOtp._id });

    console.log("OTP verified successfully");
req.flash("success", "OTP Verified Successfully! Now reset your password.");
    return res.redirect("/reset-password-page");

  } catch (error) {
    console.error("Error verifying OTP:", error);
    req.flash("error", "Something went wrong");
    return res.redirect("/forgot-password");
  }
};

// Load Reset Password Page
const getResetPasswordPage = async (req, res) => {
  try {
    const email = req.session.forgotEmail;
    if (!email) {
      req.flash("error", "Session expired.");
      return res.redirect("/forgot-password");
    }
return res.render("resetpassword", { 
  email,
  success: req.flash("success"),
  error: req.flash("error")
});

  } catch (error) {
    console.log(error);
    res.redirect("/forgot-password");
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const email = req.session.forgotEmail;

    if (!email) {
      req.flash("error", "Session expired.");
      return res.redirect("/forgot-password");
    }

    if (!password || !confirmPassword) {
      req.flash('error', 'All fields are required');
      return res.redirect('/reset-password-page');
    }

    if (password !== confirmPassword) {
      req.flash('error', 'Password does not match');
      return res.redirect('/reset-password-page');
    }

    const user = await User.findOne({ email });
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/forgot-password');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    //  Clear session after password reset
    req.session.forgotEmail = null;
    req.session.forgotPurpose = null;

    req.flash("success", "Password reset successfully. Please login.");
    return res.redirect("/login");

  } catch (error) {
    console.error("Error resetting password:", error);
    req.flash("error", "Something went wrong. Try again.");
    res.redirect("/forgot-password");
  }
};

// Resend OTP
const resendOtp = async (req, res) => {
  try {
    const { email, purpose } = req.body;
 console.log("Received resend OTP request:", req.body);
    if (!email || !purpose) {
      return res.json({ success: false, message: "Invalid request data" });
    }

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
      return res.json({ success: true, message: "OTP resent successfully!" });
    } else {
      return res.json({ success: false, message: "Failed to resend OTP." });
    }
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.json({ success: false, message: "Server error. Try again." });
  }
};

module.exports = {
  getForgotPassPage,
  forgotEmailValid,
  getForgotVerifyOtpPage,
  forgotVerifyOtp,
  resendOtp,
  getResetPasswordPage,
  resetPassword
};