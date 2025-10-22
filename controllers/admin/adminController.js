 const User=require('../../models/userSchema')
const bcrypt = require('bcryptjs');








// const loadLogin=async(req,res)=>{
//   try{
   
//     res.render('adminlogin',{message:''})
//   console.log('Admin login page loaded successfully');
//   }catch (error) {
//     console.log("Error loading admin login:", error.message);
//     res.render("404");
//   }
// }

const loadLogin = async (req, res) => {
  try {
    res.render("adminlogin", { message: res.locals.error_msg });
  } catch (error) {
    console.log("Error loading admin login:", error.message);
    res.render("404");
  }
};







const verifyLogin=async(req,res)=>{
const{email,password}=req.body
if(!email||!password){
return res.render('adminlogin',{message:'Email and Password are required'})
}
try{
const admin= await User.findOne({email})

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



 req.session.admin =admin._id;
    return res.redirect("/admin/dashboard");


    }
    catch (error) {
    console.error("Admin login error:", error.message);
    res.render('adminlogin', { message: "Something went wrong. Please try again." });
  }
 }



const loadDashboard=async (req,res) => {
  if(req.session.admin){
    try {
      res.render('dashboard')
    } catch (error) {
        console.error("Admin login error:", error.message);
    }
  }
  
}


const logout=async (req,res) => {
try {
  req.session.destroy(err=>{
    if(err){
      console.log('Error destroying session',err)
      return res.redirect('/pageerror')
    } 
    res.redirect('/admin/login') 
  })
} catch (error) {
 console.log('Unexpected error during logout',error) 
 res.redirect('/pageerror')
}
  
}








 module.exports={loadLogin,verifyLogin,loadDashboard,logout}