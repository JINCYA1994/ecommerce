 const passport=require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const env=require('dotenv').config()
 const User=require('../models/userSchema')



 passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback'
    },

async (accessToken,refreshToken,profile,done) => {
    try {
        let user=await User.findOne({googleId:profile.id})
    if(user){
        return done(null,user)
    }
    const existingUser = await User.findOne({
          email: profile.emails[0].value,
        });

        if (existingUser) {
       
          existingUser.googleId = profile.id;
          await existingUser.save();
          return done(null, existingUser);
        }
    
    await newUser.save()
    return done(null,newUser)
    }
     catch (error) {
        console.error("Error in GoogleStrategy:", error);
            return done(error,null)
    }
}

))

passport.serializeUser((user,done)=>{
    done(null,user.id)
})
passport.deserializeUser((id,done)=>{
    User.findById(id)
    .then(user=>{
        done(null,user)
    })
    .catch((err)=>{
        done(err,null)
    })
})
  module.exports=passport