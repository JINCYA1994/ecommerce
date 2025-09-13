 const User=require('../../models/userSchema')
 const Otp=require('../../models/otpSchema')
const bcrypt = require('bcryptjs');
const nodemailer=require('nodemailer')
const env=require('dotenv').config()



const loadHomepage=async (req,res)=>{
    try {
      return res.render('home')
    } catch (error) {
       console.log('Home page not found',error.message)
       res.status(500).send('Server error') 
    }
}
const loadSignup = (req, res) => {
  try {
   res.render('signup', { message: "" });
  } catch (error) {
    console.error('Error rendering signup page:', error.message);
    res.status(500).send('Something went wrong!');
  }
};


const loginpost= async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.render('login', { message: 'Email and password are required.' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('login', { message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('login', { message: 'Invalid credentials.' });
        }

   
        req.session.user = user;
        res.redirect('/home');

    } catch (error) {
        console.error(error);
        res.status(500).render('login', { message: 'Server error during login.' });
    }}







const loadlogin=(req,res)=>{
   try {
    res.render('login', { message: "" }); 
  } catch (error) {
    console.error('Error rendering login page:', error.message);
    res.status(500).send('Something went wrong!');
  }
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
async function sendVerificationEmail(email,otp){
try{
 const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER, 
    pass: process.env.SMTP_PASS  
  }
});
 const info = await transporter.sendMail({
  from:process.env.SMTP_USER,
  to:email,
  subject:"verify your account",
 html:`<b> Your OTP :${otp} </b>`
 })
return info.accepted.length>0

}
catch(error){
console.error('Error sending email',error)
return false
}

}



const registerSignup=async (req,res) => {
  try {
     const {username,email,password,confirmPassword}=req.body
if(!username||!email||!password||!confirmPassword){
  return res.render('signup',{message:'All fields are required'})
}
if(password!==confirmPassword){
  return res.render('signup', { message: 'Passwords do not match' });

}


const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.render('signup', { message: "Username already exists" });
    }
const existUser=await User.findOne({email})
  if(existUser){
    return res.render('signup',{message:"user already exist"})
  }
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
if (!strongPassword.test(password)) {
  return res.render('signup', { message: 'Password must contain at least 1 uppercase, 1 lowercase, 1 number, 1 special character, and be at least 6 characters long.' });
}

const hashedpassword=await bcrypt.hash(password,10)


const otp=generateOTP()
const newOtp = new Otp({
  email,
  otp,
  purpose: "signup"
});
await newOtp.save();
console.log("✅ OTP saved:", newOtp);

const emailSent=await sendVerificationEmail(email,otp)
if(!emailSent){
   return res.render('signup', { message: 'Failed to send OTP. Please try again later.' });
}
 req.session.tempUser = {
      username,
      email,
      password: hashedpassword,
      
    };
console.log("Signup passed, OTP sent to:", email);
 return res.render('verifyOtp', { email, message: 'OTP sent to your email' });


  } catch (error) {
    console.error("error in signup:",error)
    res.render('signup',{message:"Something went wrong"})
  }
   }



const verifyOtp = async (req, res) => {
  try {
const { email } = req.body;
const otpArray = req.body.otp; 
const otp = otpArray.join('');

    const record = await Otp.findOne({ email, otp, purpose: 'signup' });
    if (!record) {
      return res.render('verifyOtp', { email, message: 'Invalid OTP or expired' });
    }

 
    await Otp.deleteOne({ _id: record._id });

 
    const tempUser = req.session.tempUser;
    if (!tempUser) {
      return res.render('signup', { message: 'Session expired. Please signup again.' });
    }

    const newUser = new User(tempUser);
    await newUser.save();

    
    req.session.tempUser = null;

    res.render('login', { message: 'Signup successful. Please login.' });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.render('verifyOtp', { email: req.body.email, message: 'Something went wrong' });
  }
};

const resendOtp=async(req,res)=>{
  try{
const email=req.session.tempUser?.email
if(!email){
  res.render('signup',{message:'Session expired. Please signup again.' })
}
 const otp = generateOTP();

   const newOtp = new Otp({ email, otp, purpose: "signup" });
   console.log("✅ OTP saved:", newOtp);
    await newOtp.save();

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.render('verifyOtp', { email, message: 'Failed to resend OTP. Try again later.' });
    }

  
    res.render('verifyOtp', { email, message: 'New OTP sent to your email' });
  }catch (error) {
    console.error("Resend OTP error:", error);
    res.render("verifyOtp", { message: "Something went wrong while resending OTP" });
  }
}




module.exports={loadHomepage,loadlogin,loadSignup,registerSignup,loginpost,verifyOtp,resendOtp}   