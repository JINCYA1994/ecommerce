const express=require('express')
const app=express()
const path=require('path')
const env=require('dotenv').config()
const connectDB=require('./config/db')
const userRouter= require('./routes/userRouter')
const adminRouter=require('./routes/adminRouter')
const session=require('express-session')
const MongoStore = require('connect-mongo'); 
const passport=require('./config/passport')
const flash = require("connect-flash");
const methodOverride = require('method-override');
const cartCount = require('./middlewares/cartCount');
const wishlistCount=require('./middlewares/wishlistCount')


connectDB()

app.use(express.json())
app.use(express.urlencoded({ extended: true }));

app.use(methodOverride('_method'));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // ✅ Only save session when something stored
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URL, // ✅ Same DB connection
      collectionName: 'sessions',
      ttl: 7 * 24 * 60 * 60, // ✅ 7 days in seconds
    }),
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // ✅ 7 days in ms
      httpOnly: true,
      secure: false, // ✅ keep false in localhost, true in HTTPS
      sameSite: 'lax',
    },
  })
);
app.use(cartCount);
app.use(wishlistCount)
app.use(passport.initialize())
app.use(passport.session())


app.use((req, res, next) => {
  res.set(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, private'
  );
  next();
});


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