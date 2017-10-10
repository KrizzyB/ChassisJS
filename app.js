// Display a cool logo in the console
console.log();
console.log();
console.log("MM'\"\"\"\"'YMM dP                                  oo          MMMMMMMM\"\"M MP\"\"\"\"\"\"`MM");
console.log("M' .mmm. `M 88                                              MMMMMMMM  M M  mmmmm..M");
console.log("M  MMMMMooM 88d888b. .d8888b. .d8888b. .d8888b. dP .d8888b. MMMMMMMM  M M.      `YM ");
console.log("M  MMMMMMMM 88'  `88 88'  `88 Y8ooooo. Y8ooooo. 88 Y8ooooo. MMMMMMMM  M MMMMMMM.  M ");
console.log("M. `MMM' .M 88    88 88.  .88       88       88 88       88 M. `MMM' .M M. .MMM'  M");
console.log("MM.     .dM dP    dP `88888P8 `88888P' `88888P' dP `88888P' MM.     .MM Mb.     .dM ");
console.log("MMMMMMMMMMM                                                 MMMMMMMMMMM MMMMMMMMMMM ");
console.log();
console.log();
console.log("Created By: Kris Sinclair                                             Version: 0.2.0");
console.log();
console.log();

//setup modules
var express = require("express");
var app = express();
var fs = require("fs");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var db;
var cookieParser = require('cookie-parser');
var passport = require("passport");
var FacebookStrategy = require("passport-facebook").Strategy;
var setup = false;  //set app to standard running mode by default
var chassis;
var session;

app.use(express.static('public'));  //enable access to static directory "public" from site
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(cookieParser());

//setup DB models
var Session = require("./models/sessions");
var Config = require("./models/config");
var Category = require("./models/categories");
var Role = require("./models/roles");
var User = require("./models/users");
var Post = require("./models/posts");

//read config file
function serverInit() {
    fs.readFile('./config.json', function read(error, data) { //attempt to read the config file
        if (error) {
            startSetup();    //start setup mode if no config file is found
        } else {
            var config = JSON.parse(data);  //grab config data
            connectDB(config);  //connect to DB
            connectFacebook(config);
        }
    });
}

/**---------------------------------------------------------------------------------------------------------------------
 * Setup Mode
 */
function startSetup() {
    chassis = app.listen("25569");
    console.log();
    console.log("Setup Mode - Server listening on port 80...");
    console.log();
    setup = true;
}

//create config
app.post("/setup/db-test", function(request, response){
    var success = true;
    if (setup) {
        try {
            //try settings entered by user
            var options = {user: request.body.mongodb.username, pass: request.body.mongodb.password, auth: {authdb: request.body.mongodb.dbName}};

            mongoose.connect(request.body.mongodb.host + ":" + request.body.mongodb.port + "/" + request.body.mongodb.dbName, options, function(error) {
                //settings have not worked
                if (error) {
                    db = mongoose.connection;
                    response.json('{"message": "Cannot connect to database, check your details.","status": "error"}');
                    db.close();
                //settings are correct
                } else {
                    //attempt to write to database
                    db = mongoose.connection;
                    var post = {title: "Test Post", author: "ChassisJS", content: "This post is a test, it should have been automatically deleted, check your database account has the correct permissions and restart the setup by deleting the config file", status: "published", permalink: "test", postDate: "2012-04-23T18:25:43.511Z", category: "test"};
                    Post.newPost(post, function(error, document) {
                        //error when attempting to post
                        if (error) {
                            response.json('{"message": "Error writing to the database, check the permissions of the user account.","status": "error"}');
                            console.log(error);
                            db.close();
                        } else {
                            //post creation successful, attempt to delete
                            Post.deletePost(document._id, function(error) {
                                if (error) {
                                    response.json('{"message": "Error deleting from the database, check the permissions of the user account.","status": "error"}');
                                    db.close();
                                } else {
                                    //post deleted successfully
                                    response.json('{"message": "Database connected successfully!","status": "success"}');
                                    db.close();
                                }
                            });

                        }
                    });
                }
            });
        } catch(error) {
            response.json('{"message": "' + error.message + '","status": "error"}');
            success = false;
        }
    }
});

app.post("/setup/save-config", function(request, response){
    if (setup) {
        var newConfig = request.body;
        fs.writeFile("config-temp.json", JSON.stringify(newConfig), function () {   //make config temporary in the event that setup ends prematurely and requires to be run again
            //check that config has been created
            fs.readFile('./config-temp.json', function read(error, data) { //attempt to read the config file
                if (error) {
                    response.json('{"message": "Chassis was unable to write the config data to disk.", "status": "error"}');
                } else {
                    console.log("New config saved!");
                    response.json('{"status": "success"}');
                    //connect to db
                    var config = JSON.parse(data);  //grab config data
                    connectDB(config);  //connect to DB
                }
            });
        })
    }
});

app.post("/setup/create-admin", function(request, response){
    if (setup) {

        //check for existing Administrator
        User.getUserByUsername("Administrator", function(error, user) {
            if (user){  //admin already exists
                User.deleteUser(user._id, function(error) {
                    if (error) {    //error
                        response.json({"data": "An Administrator account already exists and cannot be deleted.", "status":"error"});
                    } else {    //create new admin
                        var user = request.body;
                        User.newUser(user, function(error) {
                            if (error) {
                                response.json({"data": "Cannot create new user, please check your database permissions.", "status":"error"});
                            } else {
                                response.json({"status": "success"});
                            }
                        })
                    }
                })
            } else if (error) { //error looking for Admin account
                response.json({"data": "An error occurred attempting to read the user database.", "status":"error"});
            } else {    //admin account does not exist
                var user = request.body;
                User.newUser(user, function(error) {
                    if (error) {
                        response.json({"data": "Cannot create new user, please check your database permissions.", "status":"error"});
                    } else {
                        response.json({"status": "success"});
                    }
                })
            }
        });
    }
});

app.post("/setup/sitename", function(request, response){
    if (setup) {

        //check for existing config
        Config.deleteConfig("siteName", function(error) {
            if (error) {
                response.json({"data": "An error occurred trying to overwrite the site name property.", "status":"error"});
            } else {
                var config = request.body;
                Config.newConfig(config, function(error) {
                    if (error) {
                        response.json({"data": "An error occurred trying to overwrite the site name property.", "status":"error"});
                    } else {
                        response.json({"status": "success"});
                        fs.rename("./config-temp.json", "./config.json", function() {
                            createRoles();
                        });

                    }
                })
            }
        });

    }
});

function createRoles() {
    if (setup) {

        //create default roles
        var administrator = {role: "Administrator", permissions: ["admin-cp", "view-all-users", "update-any-user-profile", "publish-post", "view-pending-posts", "create-new-post", "delete-post", "edit-post", "edit-categories", "user"]};
        var editor = {role: "Editor", permissions: ["publish-post", "view-pending-posts", "create-new-post", "delete-post", "edit-categories", "edit-post", "user"]};
        var writer = {role: "Writer", permissions: ["view-pending-posts", "create-new-post", "edit-post", "user"]};
        var user = {role: "User", permissions: ["user"]};
        var role = [administrator, editor, writer, user];

        for (var i=0; i<3; i++) {
            Role.newRole(role[i], function(error) {
                //handle errors?
            })
        }

        //restart server
        console.log();
        console.log("Restarting server...");
        console.log();
        db.close();
        chassis.close();    //stop listening
        setup = false;  //reset app to normal mode
        serverInit();   //start again
    }

}

/**---------------------------------------------------------------------------------------------------------------------
 * Connect To Database
 */

function connectDB(config) {
    console.log("Connecting to database " + config.mongodb.host + ":" + config.mongodb.port + "/" + config.mongodb.dbName + " as user: " + config.mongodb.username);
    try {
        var options = {user: config.mongodb.username, pass: config.mongodb.password, auth: {authdb: config.mongodb.dbName}, server: {socketOptions: {socketTimeoutMS: 0, connectionTimeout: 0}}};
        mongoose.Promise = global.Promise;
        mongoose.connect(config.mongodb.host + ":" + config.mongodb.port + "/" + config.mongodb.dbName, options);
    }
    catch(error) {
        console.log(error.message);
        process.exit();
    }
    db = mongoose.connection;

    if (!setup) {
        startServer(config);    //start server if we are not in setup mode
    }
}

/**---------------------------------------------------------------------------------------------------------------------
 * Login System
 */

//login url
app.get("/auth/facebook", passport.authenticate("facebook", {scope: ["public_profile", "email"], session: false}));

function connectFacebook(config) {
    passport.use(new FacebookStrategy({
        clientID: config.facebook.appId,
        clientSecret: config.facebook.secret,
        callbackURL: "/auth/facebook/callback",
        profileFields: ["email", "id", "first_name", "last_name", "gender", "picture.type(large)"],
        passReqToCallback: true
    }, function(request, accessToken, refreshToken, profile, done) {
        //check db for user
        User.getUserByFacebookID(profile.id, function(error, user) {
            if (error) {
                response.status(500).send(error);
            } else {
                if (user) {
                    console.log("User Found");
                    return done(null, user);
                } else {
                    var newUser = {"email": profile.emails[0].value, "firstName": profile.name.givenName, "secondName": profile.name.familyName, "img": profile.photos[0].value, "facebookID": profile.id};

                    User.newUser(newUser, function(error, user) {
                        if (error) {
                            return done(error);
                        } else {
                            console.log("User Created");
                            return done(null, user);
                        }
                    })
                }
            }

        });
    }));
}

//login callback url
app.get("/auth/facebook/callback", passport.authenticate('facebook', {failureRedirect: '/login'}),
    function (request, response) {
        createSession(request.user, response);
    });

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

function createSession(user, response) {

    var session = {sessionID: generateID(), userID: user._id};

    if (user.username) {

        Session.newSession(session, function(error) {
            if (error) {
                response.status(500).send(error);
            } else {
                console.log("New Session Created. Cookie ID: " + session.sessionID);
                response.cookie("session", session.sessionID, {maxAge: 1000 * 60 * 60 * 24 * 30});
                response.redirect("/");
            }
        })

    } else {

        Session.newSession(session, function(error) {
            if (error) {
                response.status(500).send(error);
            } else {
                console.log("New Temporary Session Created. Cookie ID: " + session.sessionID);
                response.cookie("tempSession", session.sessionID, {maxAge: 1000 * 60 * 5});
                buildPage("username", response);
            }
        })

    }

}

function generateID()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 16; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

/**---------------------------------------------------------------------------------------------------------------------
 * Permission Checks
 */

function checkPermission(permission, cookie, callback) {
    Session.getSession(cookie, function(error, user) {
        if (error) {
            callback(true, false);
        } else {
            var result = false;
            if (user != null) {  //if a session is currently active check the user's permissions
                Role.getRole(user.userID.role, function (error, role) {
                    var permitted;
                    if (error) {
                        callback(true, false);
                    } else {
                        permitted = role.permissions;
                        for (var i = 0; i < permitted.length; i++) {
                            if (permission == permitted[i]) {
                                result = true;
                            }
                        }
                        callback(false, result);
                    }
                });
            } else {    //no user session is active (user is not logged in)
                callback(false, false);
            }
        }
    });
}

//check permission api
app.get("/data/permission/:permission", function(request, response){
    checkPermission(request.params.permission, request.cookies.session, function(error, permitted) {
        if (error) {
            response.json({"data": "An error occurred attempting to determine the user's permissions.", "status":"error"});
        } else {
            response.json({"data": permitted, "status":"success"});
        }
    });
});

/**---------------------------------------------------------------------------------------------------------------------
 * Database Request Handlers
 */

//get session
app.get("/auth/session/:sessionID", function(request, response){
    Session.getSession(request.params.sessionID, function(error, session) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            User.getUserByID(session.userID, function(error, user) {
                if (error) {
                    response.json({"data": error, "status":"error"});
                }
                response.json({"data": user, "status":"success"});
            });
        }
    })
});

//get full settings
app.get("/data/settings", function(request, response){
    checkPermission("admin-cp", request.cookies.session, function(error, permitted) {
        if (error) {
            throwError(error, "An error occurred attempting to determine the user's permissions.", request, response);
        } else {
            if (permitted) {
                fs.readFile('./config.json', function read(error, data) {
                    if (error) {
                        response.json({"data": error, "status":"error"});
                    } else {
                        response.json({"data": JSON.parse(data), "status":"success"});
                    }
                });
            } else {
                response.json({"data": "You do not have permission to view this content", "status": "error"});
            }
        }
    });
});

//get config
app.get("/data/config", function(request, response){
    Config.getConfig(function(error, config) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            response.json({"data": config, "status":"success"});
        }
    })
});

//add config
app.post("/data/config", function(request, response){
    var config = request.body;
    Config.newConfig(config, function(error, config) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            response.json({"data": config, "status":"success"});
        }
    })
});

//update config
app.put("/data/config/:name", function(request, response){
    var config = request.body;
    Config.updateConfig(request.params.name, config, function(error, config) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            response.json({"data": config, "status":"success"});
        }
    })
});

//delete config
app.delete("/data/config/:name", function(request, response){
    Config.deleteConfig(request.params.name, function(error, config) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            response.json({"data": config, "status":"success"});
        }
    })
});

//get all categories
app.get("/data/categories", function(request, response){
    Category.getCategories(function(error, role) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            response.json({"data": role, "status":"success"});
        }
    })
});

//add category
app.post("/data/category", function(request, response){
    checkPermission("edit-categories", request.cookies.session, function(error, permission) {
        if (permission) {
            var category = request.body;
            Category.newCategory(category, function(error, category) {
                if (error) {
                    response.json({"data": error, "status":"error"});
                } else {
                    response.json({"data": category, "status":"success"});
                }
            })
        } else {
            response.json({"data": "You do not have permission to view this content", "status": "error"});
        }
    });

//delete category
    app.delete("/data/category/:name", function(request, response){
        Category.deleteCategory(request.params.name, function(error, config) {
            if (error) {
                response.json({"data": error, "status":"error"});
            } else {
                response.json({"data": config, "status":"success"});
            }
        })
    });

});

//get all roles
app.get("/data/roles", function(request, response){
    Role.getRoles(function(error, role) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            response.json({"data": role, "status":"success"});
        }
    })
});

//get role
app.get("/data/role/:role", function(request, response){
    Role.getRole(request.params.role, function(error, role) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            response.json({"data": role, "status":"success"});
        }
    })
});

//add role
app.post("/data/role", function(request, response){
    var role = request.body;
    Role.newRole(role, function(error, role) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            response.json({"data": role, "status":"success"});
        }
    })
});

//update role
app.put("/data/role/:role", function(request, response){
    var permissions = request.body;
    Role.updateRole(request.params.role, permissions, function(error, role) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            response.json({"data": role, "status":"success"});
        }
    })
});

//delete role
app.delete("/data/role/:role", function(request, response){
    Role.deleteRole(request.params.role, function(error, role) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            response.json({"data": role, "status":"success"});
        }
    })
});

//get all users
app.get("/data/users", function(request, response){
    checkPermission("view-all-users", request.cookies.session, function(error, permission) {
        if (error) {
            throwError(error, "An error occurred attempting to determine the user's permissions.", request, response);
        } else {
            if (permission) {
                User.getUser(function(error, user) {
                    if (error) {
                        response.json({"data": error, "status":"error"});
                    } else {
                        response.json({"data": user, "status":"success"});
                    }
                })
            } else {
                response.json({"data": "You do not have permission to view this content", "status": "error"});
            }
        }
    });
});

//get user by username
app.get("/data/users/:username", function(request, response){
    User.getUserByUsername(request.params.username, function(error, user) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            response.json({"data": user, "status":"success"});
        }
    })
});

//create new user
app.post("/data/users", function(request, response){
    var user = request.body;
    User.newUser(user, function(error, user) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            response.json({"data": user, "status":"success"});
        }
    })
});

//update user
app.put("/data/update/user/:id", function(request, response){
    var requestUser = request.params.id;
    var profile = request.body;

    Session.getSession(request.cookies.session, function(error, session) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            if (session.userID._id == requestUser) {
                User.updateUserProfile(request.params.id, profile, function(error, user) {
                    if (error) {
                        response.json({"data": error, "status":"error"});
                    } else {
                        response.json({"data": user, "status":"success"});
                    }
                })
            } else {
                checkPermission("update-any-user-profile", request.cookies.session, function(error, permitted) {
                    if (error) {
                        throwError(error, "An error occurred attempting to determine the user's permissions.", request, response);
                    } else {
                        if (permitted) {
                            User.getUser(function (error, user) {
                                if (error) {
                                    response.json({"data": error, "status": "error"});
                                } else {
                                    response.json({"data": user, "status": "ok"});
                                }
                            })
                        } else {
                            response.json({
                                "data": "You do not have permission to carry out this action",
                                "status": "error"
                            });
                        }
                    }
                });
            }
        }
    });

});

//set user username
app.put("/data/username", function(request, response){
    if (request.cookies.tempSession) {
        var username = request.body;

        Session.getSession(request.cookies.tempSession, function(error, session) {
            if (error) {
                response.json({"data": error, "status":"error"});
            } else {
                User.setUsername(session.userID._id, username, function(error) {
                    if (error) {
                        response.json({"data": error, "status":"error"});
                    } else {
                        response.json({"status":"success"});
                    }
                });
            }
        });
    } else {
        response.location("/auth/facebook");    //If cookie has expired go back and authorise again
    }
});

//delete user
app.delete("/data/users/:id", function(request, response){
    User.deleteUser(request.params.id, function(error, user) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            response.json({"data": user, "status":"success"});
        }
    })
});

//get all posts
app.get("/data/posts", function(request, response){
    Post.getPost(function(error, post) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            response.json({"data": post, "status":"success"});
        }
    })
});

//get pending posts
app.get("/data/pending", function(request, response){
    Post.getPendingPosts(function(error, post) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            response.json({"data": post, "status":"success"});
        }
    })
});

//get post by permalink
app.get("/data/posts/:permalink", function(request, response){
    Post.getPostByPermalink(request.params.permalink, function(error, post) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            if (post) { //if a post is found
                if (post.status == "unpublished") {

                    //check the user has the permission to view unpublished posts
                    checkPermission("view-pending-posts", request.cookies.session, function(error, permission) {
                        if (error) {
                            throwError(error, "An error occurred attempting to determine the user's permissions.", request, response);
                        } else {
                            if (permission) {
                                response.json({"data": post, "status":"success"});
                            } else {    //if not, only show the post if the user is the author
                                Session.getSession(request.cookies.session, function(error, session) {  //get the users session
                                    if (error) {
                                        response.json({"data": error, "status":"error"});
                                    } else {
                                        if (JSON.stringify(post.author._id) == JSON.stringify(session.userID._id)) {
                                            response.json({"data": post, "status":"success"});
                                        } else {
                                            response.json({"data": null, "status":"success"});
                                        }
                                    }
                                });
                            }
                        }
                    });

                } else {    //if the post is published carry on as normal
                    response.json({"data": post, "status":"success"});
                }
            } else {    //if no post is found
                response.json({"data": null, "status":"success"});
            }
        }
    })
});

//get post by ID
app.get("/data/posts/:id", function(request, response){
    Post.getPostByID(request.params.id, function(error, post) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            response.json({"data": post, "status":"success"});
        }
    })
});

app.get("/data/postsby/:username", function(request, response){
    User.getUserByUsername(request.params.username, function(error, user) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            if (user) {
                Post.getPostsByAuthor(user._id, function(error, post) {
                    if (error) {
                        response.json({"data": error, "status":"error"});
                    } else {
                        response.json({"data": post, "status":"success"});
                    }
                })
            } else {
                response.json({"data": null, "status":"success"});
            }

        }
    });
});

//create new post
app.post("/data/posts", function(request, response){
    checkPermission("create-new-post", request.cookies.session, function(error, permission) {
        if (error) {
            throwError(error, "An error occurred attempting to determine the user's permissions.", request, response);
        } else {
            if (permission) {
                var post = request.body;
                //set post author to current user
                Session.getSession(request.cookies.session, function(error, session) {
                    if (error) {
                        response.json({"data": error, "status":"error"});
                    } else {
                        post["author"] = session.userID;

                        Post.newPost(post, function(error, post) {
                            if (error) {
                                response.json({"data": error, "status":"error"});
                            } else {
                                response.json({"data": post, "status":"success"});
                            }
                        })
                    }
                });

            } else {
                response.json({"data": "You do not have permission to post content", "status": "error"});
            }
        }
    });
});

//update post
app.put("/data/posts/:id", function(request, response){
    var post = request.body;
    Post.updatePost(request.params.id, post, function(error, post) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            response.json({"data": post, "status":"success"});
        }
    })
});

//delete post
app.delete("/data/posts/:permalink", function(request, response){
    checkPermission("delete-post", request.cookies.session, function(error, permission) {
        if (error) {
            throwError(error, "An error occurred attempting to determine the user's permissions.", request, response);
        } else {
            if (permission) {
                var post = request.body;
                //delete the post
                Post.deletePost(request.params._id, function(error, post) {
                    if (error) {
                        response.json({"data": error, "status":"error"});
                    } else {
                        response.json({"data": post, "status":"success"});
                    }
                })

            } else {
                response.json({"data": "You do not have permission to post content", "status": "error"});
            }
        }
    });
});

//search for posts by tag
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

app.get("/data/search/:query", function(request, response){
    var regex = new RegExp(escapeRegex(request.params.query), 'gi');
    Post.searchForPostTags(regex, function(error, posts) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            response.json({"data": posts, "status":"success"});
        }
    });
});

//search for posts by category
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

app.get("/data/category/:query", function(request, response){
    var regex = new RegExp(escapeRegex(request.params.query), 'gi');
    Post.searchForPostCategory(regex, function(error, posts) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            response.json({"data": posts, "status":"success"});
        }
    });
});

//upload image
app.post("/data/img", function(request, response){

    checkPermission("create-new-post", request.cookies.session, function(error, permission) {
        if (error) {
            throwError(error, "An error occurred attempting to determine the user's permissions.", request, response);
        } else {
            if (permission) {

                Session.getSession(request.cookies.session, function(error, session) {
                    if (error) {
                        response.json({"data": error, "status":"error"});
                    } else {

                        var parent = __dirname + '/public/img/uploads';
                        var dir = __dirname + '/public/img/uploads/' + session.userID.facebookID;

                        if (!fs.existsSync(parent)) {
                            fs.mkdir(parent, function () {

                            });if (!fs.existsSync(dir)) {
                                fs.mkdir(dir, function () {
                                    startUpload();
                                });
                            } else {
                                startUpload();
                            }
                        } else {
                            if (!fs.existsSync(dir)) {
                                fs.mkdir(dir, function () {
                                    startUpload();
                                });
                            } else {
                                startUpload();
                            }
                        }

                        function startUpload() {
                            // create an incoming form object
                            var form = new formidable.IncomingForm();

                            form.parse(request);

                            form.on('fileBegin', function (name, file){
                                file.path = dir + "/" + file.name;
                            });

                            form.on('file', function (name, file){
                                console.log('Uploaded ' + file.name);
                                response.send('<img src = "/img/uploads/' + session.userID.facebookID +  '/' + file.name + '" height="100%">');
                            });
                        }

                    }
                });

            } else {
                response.json({"data": "You do not have permission to perform this action", "status": "error"});
            }
        }
    });

});

/**---------------------------------------------------------------------------------------------------------------------
 * URL Request Handlers
 */

//display a post
app.get("/posts/:post", function(request, response) {
    if (setup) {
        response.sendFile(__dirname + '/controlpanel/setup.html');
    } else {
        buildPage("posts", response);
    }
});

//display a user profile
app.get("/users/:user", function(request, response) {
    if (setup) {
        response.sendFile(__dirname + '/controlpanel/setup.html');
    } else {
        buildPage("users", response);
    }
});

//search for posts
app.get("/search/:query", function(request, response) {
    if (setup) {
        response.sendFile(__dirname + '/controlpanel/setup.html');
    } else {
        buildPage("search", response);
    }
});

//display posts in category
app.get("/category/:category", function(request, response) {
    if (setup) {
        response.sendFile(__dirname + '/controlpanel/setup.html');
    } else {
        buildPage("category", response);
    }
});

//publish requests
app.get("/publish/:param", function(request, response) {
    if (setup) {
        response.sendFile(__dirname + '/controlpanel/setup.html');
    } else {
        if (request.params.param == "new") {
            checkPermission("create-new-post", request.cookies.session, function(error, permission) {
                if (error) {
                    throwError(error, "An error occurred attempting to determine the user's permissions.", request, response);
                } else {
                    if (permission) {
                        buildPage("new-post", response);
                    } else {
                        buildPage("401", response);
                    }
                }
            });
        } else {
            checkPermission("publish-post", request.cookies.session, function(error, permission) {
                if (error) {
                    throwError(error, "An error occurred attempting to determine the user's permissions.", request, response);
                } else {
                    if (permission) {
                        Post.publishPost(request.params.param, function(error) {
                            if (error) {
                                buildPage("401", response);
                            } else {
                                if (response.status = "ok") {
                                    response.redirect("/posts/" + request.params.param);
                                } else {
                                    buildPage("500", response);
                                }
                            }
                        })
                    } else {
                        buildPage("401", response);
                    }
                }
            });
        }
    }
});

//delete request

app.get("/delete/:param", function(request, response) {
    if (setup) {
        response.sendFile(__dirname + '/controlpanel/setup.html');
    } else {
        checkPermission("delete-post", request.cookies.session, function(error, permission) {
            if (error) {
                throwError(error, "An error occurred attempting to determine the user's permissions.", request, response);
            } else {
                if (permission) {
                    Post.deletePost(request.params.param, function(error) {
                        if (error) {
                            buildPage("401", response);
                        } else {
                            if (response.status = "ok") {
                                response.redirect("/" + request.params.param);
                            } else {
                                buildPage("500", response);
                            }
                        }
                    })
                } else {
                    buildPage("401", response);
                }
            }
        });
    }
});

//edit requests
app.get("/edit/:content", function(request, response) {
    if (setup) {
        response.sendFile(__dirname + '/controlpanel/setup.html');
    } else {
        if (request.params.content == "profile") {
            checkPermission("user", request.cookies.session, function(error, permission) {
                if (error) {
                    throwError(error, "An error occurred attempting to determine the user's permissions.", request, response);
                } else {
                    if (permission) {
                        buildPage("edit-profile", response);
                    } else {
                        buildPage("401", response);
                    }
                }
            });
        }

    }
});

//Simple Requests
app.get("/:path?", function(request, response) {
    if (setup) {    //catch request if application is in setup mode
        response.sendFile(__dirname + '/controlpanel/setup.html');  //send setup wizard
    } else {        //handle request
        switch (request.params.path) {

            /**---------------------------------------------------------------------------------------------------------
             * No permissions
             */
            case undefined:
                buildPage("home", response);
                break;
            case "404":
            case "login":
                buildPage (request.params.path, response);
                break;

            /**---------------------------------------------------------------------------------------------------------
             * User Logged In
             */
            //url without id to be redirected to logged in user
            case "posts":
            case "user":
                if (request.cookies.session) {  //user is logged in
                    Session.getSession(request.cookies.session, function(error, session) {
                        if (error) {
                            response.json({"data": error, "status":"error"});
                        } else {
                            response.redirect("/" + request.params.path + "/" + session.userID.username); //redirect to search posts by user
                        }
                    });
                } else {
                    response.redirect("/");
                }
                break;

            /**---------------------------------------------------------------------------------------------------------
            * User Logged In
            */
            case "pending":
                checkPermission("view-pending-posts", request.cookies.session, function(error, permitted) {
                    if (error) {
                        response.json({"data": "An error occurred attempting to determine the user's permissions.", "status":"error"});
                    } else {
                        if (permitted) {
                            buildPage("pending", response);
                        } else {
                            buildPage("401", response);
                        }
                    }
                });
                break;

            /**---------------------------------------------------------------------------------------------------------
             * Administrator
             */
            case "cp":
                checkPermission("admin-cp", request.cookies.session, function(error, permitted) {
                    if (error) {
                        response.json({"data": "An error occurred attempting to determine the user's permissions.", "status":"error"});
                    } else {
                        if (permitted) {
                            buildPage("cp", response);
                        } else {
                            buildPage("401", response);
                        }
                    }
                });
                break;

            /**---------------------------------------------------------------------------------------------------------
             * Unrecognised URL
             */
            default:
                buildPage ("404", response);
        }//end switch
    }//end if (setup)
});//end app.get

//unmatched requests
app.use(function redirectUnmatched(request, response) {
    if (request.xhr) {
        response.status(404).json({"data": {"message": "An XHR request returned a 404 error.", "status":"error"}});
    } else {
        buildPage("404", response);
    }

});

/**---------------------------------------------------------------------------------------------------------------------
 * Build Page
 */
function buildPage(request, response) {
    var page ="";

    //get header template
    fs.readFile('./templates/header.html', function read(error, data) {
        if (error) {
            throwError(error, "Template file '" + error.path + "' missing.", request, response);
        } else {
            page += data;
            getBody(request);
        }

    });

    //get body template
    function getBody(request) {
        var file;
        switch (request) {
            case "home":
                file = "home.html";
                break;
            case "posts":
                file = "posts.html";
                break;
            case "users":
                file = "users.html";
                break;
            case "search":
                file = "search.html";
                break;
            case "category":
                file = "category.html";
                break;
            case "login":
                file = "login.html";
                break;
            case "edit-profile":
                file = "edit-profile.html";
                break;
            case "new-post":
                file = "post-edit.html";
                break;
            case "image-upload":
                file = "image-upload.html";
                break;
            case "username":
                file = "../controlpanel/username.html";
                break;
            case "pending":
                file = "pending.html";
                break;
            case "cp":
                file = "../controlpanel/control-panel.html";
                break;
            case "401":
                file = "401.html";
                break;
            case "404":
                file = "404.html";
                break;
            default:
                file = "404.html";
                break;
        }

        fs.readFile('./templates/' + file, function read(error, data) {
            if (error) {
                throwError(error, "Template file '" + error.path + "' missing.", request, response);
            } else {
                page += data;
                getFooter();
            }
        });
    }

    //get footer template
    function getFooter() {
        fs.readFile('./templates/footer.html', function read(error, data) {
            if (error) {
                throwError(error, "Template file '" + error.path + "' missing.", request, response);
            } else {
                page += data;
                if (request == "404") {
                    response.status(404).send(page);
                } else {
                    response.send(page);
                }
            }
        });
    }
}

/**---------------------------------------------------------------------------------------------------------------------
 * Handle Errors
 */

function throwError(error, msg, request, response) {
    if(request && request.xhr) {
        switch(error) {
            default:
                response.json({"data": {"message": msg, "error": error}, "status":"error"});
        }
    } else {
        response.status(500).send("ERROR: " + error);
    }
    console.log("ERROR: " + error);
}

/**---------------------------------------------------------------------------------------------------------------------
 * Start Server
 */

function startServer(config) {
    chassis = app.listen(config.listen);    //start listening for requests
    console.log("Listening on port " +  config.listen);
}

//fetch settings from config file
serverInit();