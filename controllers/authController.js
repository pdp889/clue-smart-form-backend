const dotenv = require('dotenv');
dotenv.config();
const jwt = require('jsonwebtoken');
let User = require('../models/user');
const { body,validationResult } = require('express-validator');
require('../passport.js');
const bcrypt = require('bcryptjs');

// helper method which generates access token when a user logs in
function generateAccessToken(user){
    return jwt.sign({
        username: user.username,
        sub: user.id
    }, process.env.TOKEN_SECRET)
}

exports.create_user_get = function (req,res,next){
    return res.json({ title: 'Create User'});
}

exports.create_user_post = async function (req, res, next) {
    const { username, password } = req.body;
    let foundUser = await User.findOne({ username });
    if (foundUser) {
        return res.status(403).json({ error: 'username is already in use'});
    }
    
    bcrypt.hash(password, 10, async (err, hashedPassword) => {
        if (err) {return next(err);}
        const newUser = new User({ username, "password": hashedPassword})
        await newUser.save()
        const token = generateAccessToken(newUser)
        res.json({token})
      });
}

exports.log_in_post = async function (req, res, next) {
    const { username, password } = req.body;
    let foundUser = await User.findOne({ username });
    if (!foundUser) {
        return res.status(403).json({ error: 'username not in use'});
    } else {

    bcrypt.compare(password, foundUser.password, (err, result) => {
        if (result) {
            // passwords match! log user in
            const token = generateAccessToken(foundUser)
            res.json({token})
        } else {
            // passwords do not match!
            res.status(403).json({ error: 'password incorrect'})
        }
        })

    }
}