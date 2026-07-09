 const passport=require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const env=require('dotenv').config()
 const User=require('../models/userSchema')
const session=require('express-session')


passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        
 const email = profile.emails[0].value;

    let user = await User.findOne({ email });

    if (user) {
      return done(null, user);   // already exists -> login
    }

    // create new user
    user = await User.create({
      username: profile.displayName,
      email: email,
      googleId: profile.id,
      isGoogleUser: true
    });
 
    
        return done(null, user); // Must pass user, not newUser or undefined
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Serialize user (store user._id in session)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

//  Deserialize user (fetch user by id from DB)
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});


  module.exports=passport