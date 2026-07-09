const User = require('../../models/userSchema')
const Otp = require('../../models/otpSchema')
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Wallet = require("../../models/walletSchema");
const session = require('express-session')
const Offer = require('../../models/offerSchema')
const bcrypt = require('bcryptjs');

const nodemailer = require("nodemailer");
const generateReferralCode = require('../../helpers/generateReferralCode');




const loadHomepage = async (req, res) => {
  try {

    let newArrivals = await Product.find({
      isListed: true,
      isDeleted: false
    })
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();

    const offers = await Offer.find({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    }).lean();

    newArrivals.forEach(product => {

      product.variants.forEach(variant => {

        let productOffer = offers.find(
          o =>
            o.offerType === "PRODUCT" &&
            o.product_id?.toString() === product._id.toString()
        );

        let categoryOffer = offers.find(
          o =>
            o.offerType === "CATEGORY" &&
            o.category_id?.toString() === product.category_id?.toString()
        );

        let discount = 0;

        if (productOffer && categoryOffer) {
          discount = Math.max(
            productOffer.discountPercentage,
            categoryOffer.discountPercentage
          );
        } else if (productOffer) {
          discount = productOffer.discountPercentage;
        } else if (categoryOffer) {
          discount = categoryOffer.discountPercentage;
        }

        variant.offerPercentage = discount;

        variant.finalPrice =
          discount > 0
            ? Math.round(
              variant.price -
              (variant.price * discount) / 100
            )
            : variant.price;
      });

    });

    const categories = await Category.find({
      isListed: true
    })
      .limit(3)
      .lean();

    const user = req.session.user;

    const homeMessage = req.session.cartMessage;
    req.session.cartMessage = null;

    if (user) {
      const userData = await User.findById(user._id);

      return res.render("home", {
        newArrivals,
        userData,
        categories,
        homeMessage
      });
    }

    return res.render("home", {
      newArrivals,
      categories,
      homeMessage
    });

  } catch (error) {
    console.log("Home page not found", error.message);
    res.status(500).send("Server error");
  }
};






const loadSignup = (req, res) => {
  try {
    res.render('signup', { message: "" });
  } catch (error) {
    console.error('Error rendering signup page:', error.message);
    res.status(500).send('Something went wrong!');
  }
};


const loginpost = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false,  message: 'User Not Found.'
      });
    }
    if (!user.password) {

      return res.json({ success: false, message: "Please login using Google" });

    }
    if (user.isBlocked) {
      return res.json({ success: false, message: 'Your account has been blocked by admin' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: 'Incorrect Password.' });
    }


    req.session.user = user;
    return res.json({ success: true })

  } catch (error) {
    console.error(error);
    res.json({ success: false, message: 'Server error during login.' });
  }
}


const loadlogin = (req, res) => {
  try {
    res.render('login', { message: "" });
  } catch (error) {
    console.error('Error rendering login page:', error.message);
    res.status(500).send('Something went wrong!');
  }
}



function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()

}

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
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: false
    }

  });

  const info = await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "verify your account",
    html: `<b>Your OTP: ${otp}</b>`
  });
  return info.accepted.length > 0


}

const registerSignup = async (req, res) => {
  try {
    const { username, email, password, confirmPassword, referredBy } = req.body;

    // validations
  if (!username) {
    return res.json({
        success: false,
        field: "username",
        message: "Username is required"
    });
}

if (!email) {
    return res.json({
        success: false,
        field: "email",
        message: "Email is required"
    });
}

if (!password) {
    return res.json({
        success: false,
        field: "password",
        message: "Password is required"
    });
}

if (!confirmPassword) {
    return res.json({
        success: false,
        field: "confirmPassword",
        message: "Confirm Password is required"
    });
}
if(password !== confirmPassword){

    return res.json({
        success:false,
        field:"confirmPassword",
        message:"Passwords do not match"
    });

}

   const existingUsername = await User.findOne({ username });

if(existingUsername){

    return res.json({
        success:false,
        field:"username",
        message:"Username already exists"
    });

}
  const existUser = await User.findOne({ email });

if(existUser){

    return res.json({
        success:false,
        field:"email",
        message:"Email already exists"
    });

}
    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
  if(!strongPassword.test(password)){

    return res.json({
        success:false,
        field:"password",
        message:"Password must contain uppercase, lowercase, number & special character"
    });

}

    const hashedpassword = await bcrypt.hash(password, 10);

    //  ALWAYS create new OTP
    const otp = generateOTP();

    await Otp.deleteMany({ email, purpose: "signup" });

    const newOtp = new Otp({
      email,
      otp,
      purpose: "signup"
    });

    await newOtp.save();

    console.log("New OTP created:", otp);

    const emailSent = await sendOtpEmail(email, otp);
   if (!emailSent) {
  return res.json({
    success: false,
    message: "Failed to send OTP. Please try again later."
  });
}
    // store temp user
    req.session.tempUser = {
      username,
      email,
      password: hashedpassword, referredBy
    };

   return res.json({
  success: true,
  email,
  purpose: "signup"
});
  } catch (error) {
    console.error("Signup error:", error);
  return res.json({
  success: false,
  message: "Something went wrong"
});
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, purpose } = req.body;

    // clean OTP
    const otpArray = req.body.otp;
    const otp = otpArray.filter(d => d !== '').join('').trim();

    console.log("Entered OTP:", otp);

    const record = await Otp.findOne({ email, purpose });

    if (!record) {
      return res.render('verifyOtp', {
        email,
        purpose,
        message: 'OTP expired'
      });
    }

    console.log("DB OTP:", record.otp);

    if (record.otp !== otp) {
      return res.render('verifyOtp', {
        email,
        purpose,
        message: 'Invalid OTP'
      });
    }

    // success
    await Otp.deleteOne({ _id: record._id });

    const tempUser = req.session.tempUser;

    if (!tempUser) {
      return res.render('signup', {
        message: 'Session expired. Please signup again.'
      });
    }

    const myReferralCode = generateReferralCode(tempUser.username);
    const newUser = new User({

      username: tempUser.username,

      email: tempUser.email,

      password: tempUser.password,

      referralCode: myReferralCode

    });

    await newUser.save();

    console.log("newUser:", newUser);
    console.log("newUser._id:", newUser._id);
    console.log("Creating wallet for:", newUser._id);
    await Wallet.create({ userId: newUser._id });

    if (tempUser.referredBy) {

      const referrer = await User.findOne({ referralCode: tempUser.referredBy });

      if (referrer && referrer._id.toString() !== newUser._id.toString()) {

        const wallet = await Wallet.findOne({ userId: referrer._id });

        if (wallet) {

          wallet.balance += 100;

          wallet.transactions.push({

            type: "credit",

            amount: 100,

            description:
              `Referral bonus from ${newUser.username}`

          });

          await wallet.save();
          const newUserWallet = await Wallet.findOne({ userId: newUser._id });

          if (newUserWallet) {

            newUserWallet.balance += 100;

            newUserWallet.transactions.push({

              type: "credit",

              amount: 100,

              description:
                "Welcome referral bonus"

            });

            await newUserWallet.save();
          }
        }

        newUser.referredBy = referrer._id;

        await newUser.save();



      }

    }


    req.session.tempUser = null;
    req.session.user = newUser;

    req.flash("success_msg", "Signup successful");

    return res.redirect("/home");

  } catch (error) {
    console.error("OTP verification error:", error);
    res.render('verifyOtp', {
      email: req.body.email,
      purpose: "signup",
      message: 'Something went wrong'
    });
  }
};

const loadVerifyOtp = (req, res) => {
    const { email, purpose } = req.query;

    res.render("verifyOtp", {
        email,
        purpose,
        message: ""
    });
};


const resendOtp = async (req, res) => {
  try {
    const email = req.session.tempUser?.email;

    if (!email) {
      return res.render('signup', {
        message: 'Session expired. Please signup again.'
      });
    }

    const newOtpCode = generateOTP();

    await Otp.deleteMany({ email, purpose: "signup" });

    const newOtp = new Otp({
      email,
      otp: newOtpCode,
      purpose: "signup"
    });

    await newOtp.save();

    console.log("Resent OTP:", newOtpCode);

    const emailSent = await sendOtpEmail(email, newOtpCode);

    if (!emailSent) {
      return res.render('verifyOtp', {
        email,
        purpose: "signup",
        message: 'Failed to resend OTP'
      });
    }

    return res.render('verifyOtp', {
      email,
      purpose: "signup",
      message: 'New OTP sent'
    });

  } catch (error) {
    console.error("Resend OTP error:", error);
    res.render('verifyOtp', {
      message: "Something went wrong"
    });
  }
};


// const logout = async (req, res) => {
//   try {
//     req.session.destroy(err => {
//       if (err) {
//         console.log('Error destroying session', err)
//         return res.redirect('/pageerror')
//       }
//       res.redirect('/login')
//     })
//   } catch (error) {
//     console.log('Unexpected error during logout', error)
//     res.redirect('/pageerror')
//   }
// }

const logout = (req, res) => {
    delete req.session.user;

    req.session.save(err => {
        if (err) {
            console.log(err);
            return res.redirect("/pagenotfound");
        }

        res.redirect("/login");
    });
};

const pageNotFound = (req, res) => {
  try {
    res.status(404).render('404');
  } catch (error) {
    console.error("404 error:", error.message);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  pageNotFound
};


module.exports = { loadHomepage, loadlogin, loadSignup, registerSignup, loginpost, verifyOtp, resendOtp, logout, pageNotFound ,loadVerifyOtp}   