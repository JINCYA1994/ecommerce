const express=require('express')
const app=express()
const path=require('path')
const env=require('dotenv').config()
const connectDB=require('./config/db')
const cloudinary = require('../config/cloudinary');
const userRouter= require('./routes/userRouter')
const adminRouter=require('./routes/adminRouter')
const session=require('express-session')

const flash = require("connect-flash");



connectDB()

app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60, 
    secure: false,
    httpOnly: true
  }
}));




app.use(flash());
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  next();
});



app.set('view engine', 'ejs');
app.set('views',[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname, 'public')));
app.use("/",userRouter)
app.use("/admin",adminRouter)
//app.use((req,res)=>{
    //res.status(404).render('404')
//})                               

app.listen(process.env.PORT,()=>{
    console.log("server created");
console.log(".................")}
)