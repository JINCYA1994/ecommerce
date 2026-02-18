 const User=require('../models/userSchema')
const userAuth = async (req, res, next) => {
  try {
    if (req.session.user && req.session.user._id) {
      const userData = await User.findById(req.session.user._id);

      if (userData && !userData.isBlocked) {
       
        req.session.user = userData;
        next();
      } else {
        req.session.user = null;
        req.session.save((err) => {
          if (err) {
            console.log("Session save error after blocking user:", err);
          }
          res.redirect('/login');
        });
      }
    } else {
      res.redirect('/login');
    }
  } catch (error) {
    console.log("Error in user auth middleware", error);
    res.status(500).send('Internal server error');
  }
};

const adminAuth = (req, res, next) => {
  if (req.session && req.session.admin && req.session.admin.role === 'admin') {
    next();
  } else {
    res.redirect('/admin/login');
  }
};



 module.exports={userAuth,adminAuth}