const passport = require('passport')
const passportJWT = require("passport-jwt");
const JWTStrategy   = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;
const User = require('./models/user');
const dotenv = require('dotenv');
dotenv.config();

passport.use(new JWTStrategy({
  jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
  secretOrKey   : process.env.TOKEN_SECRET
},
 function (jwtPayload, done) {
   return User.findById(jwtPayload.sub)
   .then(user => 
   {
     return done(null, user);
   }
 ).catch(err => 
 {
   return done(err);
 });
}
))