/**
 * Created by KrizzyB on 27/10/2016.
 */

var mongoose = require("mongoose");

//Post Schema
var postSchema = mongoose.Schema({
   title: {
       type: String,
       required: true
   },
    subtitle: {
        type: String,
        required: false
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    content: {
        type: String,
        required: false
    },
    excerpt: {
        type: String,
        required: false
    },
    category: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        default: "unpublished"
    },
    permalink: {
        type: String,
        required: true,
        index: true
    },
    tags:
        [String]
    ,
    custom: {
        type: Object
    },
    postDate: {
        type: String,
        required: true
    },
    createDate: {
        type: Date,
        default: Date.now
    }
});

postSchema.index({permalink: 1, category: 1}, {"unique": true});

var Post = module.exports = mongoose.model('Post', postSchema);

//Get All Posts
module.exports.getPost = function(callback, limit) {
    Post.find({status: "published"}, callback).populate("author").limit(limit);
};

//Get Pending Posts
module.exports.getPendingPosts = function(callback) {
    Post.find({status: "unpublished"}, callback).populate("author");
};
//Get Post by permalink
module.exports.getPostByPermalink = function(permalink, category, callback) {
    Post.findOne( {permalink: permalink, category: category}, callback).populate("author", "username img bio website");
};

//Get Post by ID
module.exports.getPostByID = function(id, callback) {
    Post.findOne( {_id: id }, callback).populate("author");
};

//Get Posts by Author
module.exports.getPostsByAuthor = function(author, callback, limit) {
    Post.find( {author: author, status: "published"}, callback).limit(limit);
};

//New Post
module.exports.newPost = function(post, callback) {
    Post.create(post, callback);
};

//Update Post
module.exports.updatePost = function(id, user, callback) {
    var query = {_id: id};
    var update = {
        title: post.title,
        author: post.author,
        content: post.content,
        status: post.status,
        permalink: post.permalink,
        postDate: post.postDate
    };
    Post.findOneAndUpdate(query, update, callback);
};

//publish post
module.exports.publishPost = function(id, callback) {
    var query = {_id: id};
    var update = {
        status: "published"
    };
    Post.findOneAndUpdate(query, update, callback);
};

//Delete Post
module.exports.deletePost = function(id, callback) {
    var query = {_id: id};
    Post.remove(query, callback);
};

//Search posts for tags
module.exports.searchForPostTags = function(query, callback) {
    Post.find({tags: query}, callback).populate("author");
};

//Search posts for category
module.exports.searchForPostCategory = function(query, callback) {
    Post.find({categories: query}, callback).populate("author");
};