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
//   if(!admin){
//    return  res.render('adminlogin',{message:'Email does not exist'})
//   }
//   if(admin.role!=='admin'){
//    return  res.render("adminlogin",{message:'Access denied: Not an admin'})
//   }
//  const isMatch = await bcrypt.compare(password, admin.password);
// if(!isMatch){
//  return  res.render('adminlogin',{message:'Invalid Password'})
// }

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
    return res.redirect("/admin/users");


    }
    catch (error) {
    console.error("Admin login error:", error.message);
    res.render('adminlogin', { message: "Something went wrong. Please try again." });
  }
 }


 module.exports={loadLogin,verifyLogin,}