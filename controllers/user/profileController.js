const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const nodemailer = require("nodemailer");
const bcrypt = require('bcryptjs');
const env=require('dotenv').config()
const session=require('express-session')
const Otp=require('../../models/otpSchema')
const cloudinary = require('../../config/cloudinary');
const fs = require('fs');

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
    
      return res.json({success:false,message:'Email not Found'});
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

      req.session.forgotEmail = email;
      req.session.forgotPurpose = "forgot_password";
 req.session.otpExpireTime = Date.now() + 60 * 1000;
      return res.json({success:true})
    } else {
    
      return res.json({success:false,message:'Failed to send OTP'})

  }} catch (error) {
    console.error("Error in forgotEmailValid:", error);
   
    return res.json({success:false,message:'Something went wrong'})
};
}
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
       req.session.otpExpireTime = Date.now() + 60 * 1000; 
      return res.json({ success: true, message: "OTP resent successfully!" });


    } else {
      return res.json({ success: false, message: "Failed to resend OTP." });
    }
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.json({ success: false, message: "Server error. Try again." });
  }
};

//profile 

const userProfile=async (req,res) => {
  try {
    const userId=req.session.user
const profileMessage=req.session.profileMessage
req.session.profileMessage=null

    const userData=await User.findById(userId)
         const defaultAddress = await Address.findOne({
      userId: userId,
      is_default: true,
      profileMessage
    })


res.render("profile",{
    userData,
    defaultAddress,profileMessage
})

  } catch (error) {
    console.error('Error for retrive profile data',error)
    res.redirect('/pageNotFound')
  }
  
}


 const editProfile=async (req,res) => {
  try {
    const userId=req.session.user
    const userData=await User.findById(userId)
    res.render('editProfile',{userData})
  } catch (error) {
    console.error('Error ',error)
    res.redirect('/pageNotFound')
  }
  
 }
const editName=async (req,res) => {
  try {
    const userId=req.session.user
    console.log(userId)
    const userData=await User.findById(userId)
    res.render('editname',{userData})
  } catch (error) {
    console.error('Error',error)
    res.redirect('/pageNotFound')
  }
  
}

const updateName=async (req,res) => {
try {
  const userId=req.session.user
  const {username}=req.body
console.log("New username:", username)
    await User.updateOne(
      { _id: userId },
      { $set: { username: username } }
    );
    req.session.profileMessage='Name Updated Successfully'
res.redirect('/profile')
} catch (error) {
  console.error('Error in editname',error)
  res.redirect('/pageNotFound')
}  

}
  
const editEmail=async (req,res) => 
  { try {
    const userId=req.session.user
    console.log(userId)
    const userData=await User.findById(userId)
    res.render('editemail',{userData})
  } catch (error) {
    console.error('Error',error)
    res.redirect('/pageNotFound')
  }
}

const updateEmail=async (req,res) => {
  try{
  const userId=req.session.user
  const{email}=req.body
     const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.session.profileMessage='Email already in use'
     
      console.log('email already exist')
      return res.redirect("/edit-email");
    }
      const otp = generateOTP();
      console.log(otp)
      await Otp.deleteMany({ email, purpose: "edit_email" });
    const newOtp = new Otp({
      email,
      otp,
      purpose: "edit_email",
    });
      await newOtp.save();
   const sent = await sendOtpEmail(email, otp);

    if (sent) {
      
      console.log(`OTP sent to ${email}: ${otp}`);
      // temporarily store email in session
      req.session.tempEmail = email;
      req.session.tempUserId = userId;
req.session.otpExpireTime = Date.now() + 60 * 1000; 
      // render verification page
      return res.render("verifyNewemail", { email, purpose: "edit_email" ,remainingTime:60});
    } else {
      req.flash("error", "Failed to send OTP. Try again.");
      return res.redirect("/edit-email");
    }
  } catch (error) {
    console.error("Error in updateEmail:", error);
    req.flash("error", "Something went wrong");
    res.redirect("/edit-email");
  }
}

const verifyEmailOtp = async (req, res) => {
  try {
    const { email, purpose } = req.body;
    const otpArray = req.body.otp;
    const otp = otpArray.join('');

    const validOtp = await Otp.findOne({ email, otp, purpose: "edit_email" });

    if (!validOtp) {
      req.flash('error', 'Invalid or expired OTP');
      return res.redirect('/verify-email-otp');
    }

  
    const userId = req.session.tempUserId;
    await User.updateOne({ _id: userId }, { $set: { email: email } });

    // delete OTP after verification
    await Otp.deleteOne({ _id: validOtp._id });

  
    delete req.session.tempEmail;
    delete req.session.tempUserId;
req.session.profileMessage='Email updated successfully!'
 
    return res.redirect('/profile');
  } catch (error) {
    console.error("Error verifying email OTP:", error);
    req.flash('error', 'Something went wrong');
    res.redirect('/edit-email');
  }
};

const updateEmailresend = async (req, res) => {
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
      req.session.otpExpireTime = Date.now() + 60 * 1000;
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


const getChangePasswordPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    res.render('changepassword', { userData });
  } catch (error) {
    console.error("Error loading change password page:", error);
    res.redirect('/pageNotFound');
  }
};





const postChangePassword = async (req, res) => {
  try {
    const userId = req.session.user;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Check that the form fields are provided
    if (!currentPassword || !newPassword || !confirmPassword) {
      req.flash('error_msg', 'Please fill all password fields');
      return res.redirect('/change-password');
    }

    const user = await User.findById(userId);

    if (!user || !user.password) { // ensure user and password exist
      req.flash('error_msg', 'User not found or password not set');
      return res.redirect('/change-password');
    }

    // verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      req.flash('error_msg', 'Current password is incorrect');
      return res.redirect('/change-password');
    }

    if (newPassword !== confirmPassword) {
      req.flash('error_msg', 'New passwords do not match');
      return res.redirect('/change-password');
    }

    // hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
req.session.profileMessage='Password changed successfully!'
    // req.flash('success_msg', 'Password changed successfully!');
    return res.redirect('/profile');

  } catch (error) {
    console.error("Error changing password:", error);
    req.flash('error_msg', 'Something went wrong');
    res.redirect('/change-password');
  }
};
const uploadToCloudinary = async (file) => {
  const uploaded = await cloudinary.uploader.upload(file.path, {
    folder: 'FootChic/ProfileImages',
  });
  fs.unlinkSync(file.path); // remove local file after upload
  return uploaded.secure_url;
};

const updateProfileImage = async (req, res) => {
  try {
    const userId = req.session.user
    if (!userId) {
      return res.redirect('/login');
    }

    if (!req.file) {
      return res.redirect('/profile');
    }

    // Upload to Cloudinary
    const imageUrl = await uploadToCloudinary(req.file);

    // Update in DByOtp
    await User.findByIdAndUpdate(userId, { profileImage: imageUrl });
req.session.profileMessage='Image Added Successfully'
    res.redirect('/profile');
  } catch (error) {
    console.error('Error updating profile image:', error);
    res.redirect('/pageNotFound');
  }
};

const getVerifyEmailOtpPage = async (req, res) => {
  try {
    const email = req.session.tempEmail;

    if (!email) {
      req.flash("error", "Session expired");
      return res.redirect("/edit-email");
    }
const expireTime = req.session.otpExpireTime;

let remainingTime = 0;
if (expireTime) {
  remainingTime = Math.max(0, Math.floor((expireTime - Date.now()) / 1000));
}

    res.render("verifyNewemail", { email, purpose: "edit_email" , remainingTime });
  } catch (error) {
    console.error(error);
    res.redirect("/edit-email");
  }
};








module.exports = {
  getForgotPassPage,
  forgotEmailValid,
  getForgotVerifyOtpPage,
  forgotVerifyOtp,
  resendOtp,
  getResetPasswordPage,
  resetPassword,userProfile,editProfile,
  editName,updateName,editEmail,updateEmail,verifyEmailOtp,updateEmailresend,getChangePasswordPage,postChangePassword , updateProfileImage,getVerifyEmailOtpPage
}
