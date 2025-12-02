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
        // ✅ Find existing user
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // ✅ Create new user
          user = new User({
            googleId: profile.id,
            username: profile.displayName,
            email: profile.emails[0].value,
          });
          await user.save();
        }

        return done(null, user); // ✅ Must pass user, not newUser or undefined
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// ✅ Serialize user (store user._id in session)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// ✅ Deserialize user (fetch user by id from DB)
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});


  module.exports=passport