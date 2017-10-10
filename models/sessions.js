/**
 * Created by KrizzyB on 27/10/2016.
 */

var mongoose = require("mongoose");

//Session Schema
var sessionSchema = mongoose.Schema({
    sessionID: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    userID: {
        type: String,
        required: true,
        ref: "User"
    },
    createDate: {type: Date, expires: "30d", default: Date.now}
});

var Session = module.exports = mongoose.model('Session', sessionSchema);

//Get Session
module.exports.getSession = function(sessionID, callback) {
    Session.findOne( {sessionID: sessionID }, callback).populate("userID");
};

//New Session
module.exports.newSession = function(session, callback) {
    Session.create(session, callback);
};