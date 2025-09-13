 const User=require('../../models/userSchema')
const bcrypt = require('bcryptjs');





const loadLogin=async(req,res)=>{
  try{
   
    res.render('adminlogin',{message:''})
  console.log('Admin login page loaded successfully');
  }catch (error) {
    console.log("Error loading admin login:", error.message);
    res.render("404");
  }
}


const verifyLogin=async(req,res)=>{
const{email,password}=req.body
if(!email||!password){
return res.render('adminlogin',{message:'Email and Password are required'})
}
try{
const admin= await User.findOne({email})
  if(!admin){
   return  res.render('adminlogin',{message:'Email does not exist'})
  }
  if(admin.role!=='admin'){
   return  res.render("adminlogin",{message:'Access denied: Not an admin'})
  }
 const isMatch = await bcrypt.compare(password, admin.password);
if(!isMatch){
 return  res.render('adminlogin',{message:'Invalid Password'})
}
 req.session.admin =admin._id;
    return res.redirect("/customer");


    }
    catch (error) {
    console.error("Admin login error:", error.message);
    res.render('adminlogin', { message: "Something went wrong. Please try again." });
  }
 }


 module.exports={loadLogin,verifyLogin}