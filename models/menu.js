/**
 * Created by KrizzyB on 28/10/2017.
 */

var mongoose = require("mongoose");

//Menu Schema
var menuSchema = mongoose.Schema({
   name: {
       type: String,
       required: true,
       index: true,
       unique: true,
       ref: "Menu"
   },
    display: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    sortOrder: {
       type: Number,
        required: true
    },
    level: {
       type: Number,
        required: true,
        default: 0
    },
    children: {
       type: [String],
        default: null
    }
});

var Menu = module.exports = mongoose.model('Menu', menuSchema);

//Get All Menu Items
module.exports.getMenu = function(callback, limit) {
    Menu.find({level: 0}, callback).limit(limit).populate("children");
};

//New Menu Item
module.exports.newMenu = function(menu, callback) {
    Menu.create(menu, callback);
};

//Edit Menu Item
module.exports.editMenu = function(name, menu, callback) {
    var query = {name: name};
    var update = {
        data: config.data
    };
    Menu.findOneAndUpdate(query, update, callback);
};

//Delete Menu Item
module.exports.deleteMenu = function(name, callback) {
    var query = {name: name};
    Menu.remove(query, callback);
};