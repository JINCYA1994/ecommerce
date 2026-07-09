 const User=require('../../models/userSchema')
const bcrypt = require('bcryptjs');




const loadLogin = async (req, res) => {
  try {
    res.render("adminlogin", { message: res.locals.error_msg });
  } catch (error) {
    console.log("Error loading admin login:", error.message);
    res.render("admin404");
  }
};



const pageError=async(req,res)=>{
  res.render('admin404')
}

const verifyLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    req.flash("error_msg", "Email and Password are required");
    return res.redirect("/admin/login");
  }

  try {
    const admin = await User.findOne({ email });

    if (!admin) {
      req.flash("error_msg", "Email does not exist");
      return res.redirect("/admin/login");
    }

    if (admin.role !== "admin") {
      req.flash("error_msg", "Access denied: Not an admin");
      return res.redirect("/admin/login");
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      req.flash("error_msg", "Invalid Password");
      return res.redirect("/admin/login");
    }

 
    req.session.admin = {
      id: admin._id,
      email: admin.email,
      username: admin.username,
      role: admin.role
    };

  
    req.session.save(err => {
      if (err) {
        console.log("Session save error:", err);
       
        return res.redirect("/admin/login");
      }
      console.log("Admin session saved in DB:", req.session.admin);
      return res.redirect("/admin/dashboard");
    });

  } catch (error) {
    console.error("Admin login error:", error.message);
    req.flash("error_msg", "Something went wrong. Please try again.");
    return res.redirect("/admin/login");
  }
};



// const loadDashboard=async (req,res) => {

//     try {
//        console.log("Dashboard accessed by:", req.session.admin);
//       res.render('dashboard')
//     } catch (error) {
//         console.error("Admin login error:", error.message);
//          res.redirect('/admin/login');
//     }
  
  
// }


// const logout=async (req,res) => {
// try {
//   req.session.destroy(err=>{
//     if(err){
//       console.log('Error destroying session',err)
//       return res.redirect('/pageerror')
//     } 
//     res.redirect('/admin/login') 
//   })
// } catch (error) {
//  console.log('Unexpected error during logout',error) 
//  res.redirect('/pageerror')
// }
  
// }

const logout = (req, res) => {
    delete req.session.admin;

    req.session.save(err => {
        if (err) {
            console.log(err);
            return res.redirect("/pageerror");
        }

        res.redirect("/admin/login");
    });
};






 module.exports={loadLogin,verifyLogin,logout,pageError}