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
    }
});

var Config = module.exports = mongoose.model('Config', configSchema);

//Get Config
module.exports.getConfig = function(callback, limit) {
    Config.find(callback).limit(limit);
};

//New Config
module.exports.newConfig = function(config, callback) {
    Config.create(config, callback);
};

//Update Configname
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