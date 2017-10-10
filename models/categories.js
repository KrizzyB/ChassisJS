/**
 * Created by KrizzyB on 27/10/2016.
 */

var mongoose = require("mongoose");

//Config Schema
var categorySchema = mongoose.Schema({
   name: {
       type: String,
       required: true,
       index: true,
       unique: true
   }
});

var Category = module.exports = mongoose.model('Category', categorySchema);

//Get Category
module.exports.getCategories = function(callback, limit) {
    Category.find(callback).limit(limit);
};

//New Category
module.exports.newCategory = function(config, callback) {
    Category.create(config, callback);
};

//Update Category
module.exports.updateCategory = function(name, config, callback) {
    var query = {name: name};
    var update = {
        data: config.data
    };
    Category.findOneAndUpdate(query, update, callback);
};

//Delete Category
module.exports.deleteCategory = function(name, callback) {
    var query = {name: name};
    Category.remove(query, callback);
};