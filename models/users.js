/**
 * Created by KrizzyB on 27/10/2016.
 */

var mongoose = require("mongoose");

//User Schema
var userSchema = mongoose.Schema({
   username: {
       type: String,
       unique: true,
       index: true
   },
    img: {
        type: String,
        required: false
    },
    firstName: {
        type: String,
        required: true
    },
    secondName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    website: {
       type: String
    },
    bio: {
       type: String
    },
    role: {
        type: String,
        default: "User",
        ref: "Roles"
    },
    facebookID: {
        type: String,
        required: false,
        unique: true
    },
    createDate: {
        type: Date,
        default: Date.now
    }
});

var User = module.exports = mongoose.model('User', userSchema);

//Get Users
module.exports.getUser = function(callback, limit) {
    User.find(callback).limit(limit);
};

//Get User by ID
module.exports.getUserByID = function(id, callback) {
    User.findOne( {_id: id }, callback);
};

//Get User by Username
module.exports.getUserByUsername = function(username, callback) {
    User.findOne( {username: username }, callback);
};

//Get User by Email
module.exports.getUserByEmail = function(email, callback) {
    User.findOne( {email: email }, callback);
};

//Get User by FacebookID
module.exports.getUserByFacebookID = function(facebookID, callback) {
    User.findOne( {facebookID: facebookID}, callback);
};

//New User
module.exports.newUser = function(user, callback) {
    User.create(user, callback);
};

//Update User
module.exports.updateUser = function(id, user, callback) {
    var query = {_id: id};
    var update = {
        username: user.username,
        img: user.img,
        firstName: user.firstName,
        secondName: user.secondName,
        email: user.email,
        role: user.role
    };
    User.findOneAndUpdate(query, update, callback);
};

//Update User Profile
module.exports.updateUserProfile = function(id, user, callback) {
    var query = {_id: id};
    var update = {
        website: user.website,
        bio: user.bio
    };
    User.findOneAndUpdate(query, update, callback);
};

//Set Username
module.exports.setUsername = function(id, username, callback) {
    var query = {_id: id};
    var update = {
        username: username.username
    };
    User.findOneAndUpdate(query, update, callback);
};

//Delete User
module.exports.deleteUser = function(id, callback) {
    var query = {_id: id};
    User.remove(query, callback);
};