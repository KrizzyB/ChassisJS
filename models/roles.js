/**
 * Created by KrizzyB on 27/10/2016.
 */

var mongoose = require("mongoose");

//Roles Schema
var rolesSchema = mongoose.Schema({
    role: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    permissions: {
        type: [String],
        required: true
    }
});

var Role = module.exports = mongoose.model('Role', rolesSchema);

//Get All Roles
module.exports.getRoles = function(callback, limit) {
    Role.find(callback).limit(limit);
};

//Get Role by Name
module.exports.getRole = function(role, callback) {
    Role.findOne( {role: role }, callback);
};

//New Role
module.exports.newRole = function(role, callback) {
    Role.create(role, callback);
};

//Update Role
module.exports.updateRole = function(role, permissions, callback) {
    var query = {role: role};
    var update = {
        data: permissions.data
    };
    Role.findOneAndUpdate(query, update, callback);
};

//Delete Config
module.exports.deleteRole = function(role, callback) {
    var query = {role: role};
    Role.remove(query, callback);
};
