/**
 * Created by KrizzyB on 27/10/2016.
 */

var mongoose = require("mongoose");

//Config Schema
var configSchema = mongoose.Schema({
   name: {
       type: String,
       required: true,
       index: true,
       unique: true
   },
    data: {
        type: Object,
        required: true
    },
    public: {
       type: Boolean,
        required: true,
        default: false
    }
});

var Config = module.exports = mongoose.model('Config', configSchema);

//Get All Config
module.exports.getAllConfig = function(callback, limit) {
    Config.find(callback).limit(limit);
};

//Get all Public Config
module.exports.getPublicConfig = function(callback, limit) {
    Config.find({public: true}, callback).limit(limit);
};

//Get One Config
module.exports.getConfig = function(config, callback) {
    Config.findOne({name: config}, callback);
};

//New Config
module.exports.newConfig = function(config, callback) {
    Config.create(config, callback);
};

//Update Config Name
module.exports.updateConfig = function(name, config, callback) {
    var query = {name: name};
    var update = {
        data: config.data
    };
    Config.findOneAndUpdate(query, update, callback);
};

//Delete Config
module.exports.deleteConfig = function(name, callback) {
    var query = {name: name};
    Config.remove(query, callback);
};