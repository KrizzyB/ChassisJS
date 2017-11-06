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
const express = require("express");
const app = express();
const fs = require("fs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cookieParser = require('cookie-parser');
const passport = require("passport");
const FacebookStrategy = require("passport-facebook").Strategy;
const log = require("winston");
var listen, db, chassis;
var setup = false;  //set app to standard running mode by default

app.use(express.static('public'));  //enable access to static directory "public" from site
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(cookieParser());
log.add(log.transports.File, { filename: 'chassis.log' });
log.exitOnError = false;

//setup DB models
var Session = require("./models/sessions");
var Config = require("./models/config");
var Menu = require("./models/menu");
var Category = require("./models/categories");
var Role = require("./models/roles");
var User = require("./models/users");
var Post = require("./models/posts");

//read config file
function serverInit() {
    log.info("Reading config file...");
    fs.readFile('./config.json', function read(error, data) { //attempt to read the config file
        if (error) {
            log.info("Unable to read config file, starting Chassis in setup mode...");
            startSetup();    //start setup mode if no config file is found
        } else {
            log.info("Config file loaded, starting Chassis...");
            var config = JSON.parse(data);  //grab config data
            connectDB(config);  //connect to DB
        }
    });
}

/**---------------------------------------------------------------------------------------------------------------------
 * Setup Mode
 */
function startSetup() {
    //override port if included in command line
    if (Number(process.argv[2])) {
        listen = process.argv[2];
    } else {    //use default port 80
        listen = "80";
    }
    setup = [];   //enable setup mode
    log.info("Setup mode enabled.");
    chassis = app.listen(listen);   //start server
    log.info("Server listening on port " + listen + "...");
}

//create config
app.post("/setup/db-test", function(request, response){
    if (setup) {
        log.info("Attempting to connect to database using credentials provided...");
        try {
            //try settings entered by user
            var options = {user: request.body.mongodb.username, pass: request.body.mongodb.password, auth: {authdb: request.body.mongodb.dbName}};
            mongoose.connect(request.body.mongodb.host + ":" + request.body.mongodb.port + "/" + request.body.mongodb.dbName, options, function(error) {
                //settings have not worked
                if (error) {
                    db = mongoose.connection;
                    response.json('{"message": "Cannot connect to database, check your details.","status": "error"}');
                    db.close();
                    log.error("Failed to connect to database. Connection closed.");
                //settings are correct
                } else {
                    log.info("Successfully connected to database.");
                    //attempt to write to database
                    db = mongoose.connection;
                    var post = {title: "Test Post", author: "ChassisJS", content: "This post is a test, it should have been automatically deleted, check your database account has the correct permissions and restart the setup by deleting the config file", status: "published", permalink: "test", postDate: "2012-04-23T18:25:43.511Z", category: "test"};
                    log.info("Attempting to write data to database...");
                    Post.newPost(post, function(error, document) {
                        //error when attempting to post
                        if (error) {
                            response.json('{"message": "Error writing to the database, check the permissions of the user account.","status": "error"}');
                            console.log(error);
                            db.close();
                            log.error("Failed to write to database. Connection closed.");
                        } else {
                            log.info("Successfully written to database.");
                            //post creation successful, attempt to delete
                            log.info("Attempting to delete data from database...");
                            Post.deletePost(document._id, function(error) {
                                if (error) {
                                    response.json('{"message": "Error deleting from the database, check the permissions of the user account.","status": "error"}');
                                    db.close();
                                    log.error("Failed to delete from database. Connection closed.");
                                } else {
                                    //post deleted successfully
                                    response.json('{"message": "Database connected successfully!","status": "success"}');
                                    db.close();
                                    log.info("Successfully deleted from database.");
                                }
                            });

                        }
                    });
                }
            });
            log.info("Database test complete.");
        } catch(error) {
            response.json('{"message": "' + error.message + '","status": "error"}');
            log.error("Failed to connect database.");
        }
    }
});

app.post("/setup/save-config", function(request, response) {
    if (setup) {
        response.json({"status": "success"});
        setup.push({});
        //connect to db
        log.info("Connecting to database...");
        var options = {user: request.body.mongodb.username, pass: request.body.mongodb.password, auth: {authdb: request.body.mongodb.dbName}};
        mongoose.connect(request.body.mongodb.host + ":" + request.body.mongodb.port + "/" + request.body.mongodb.dbName, options, function(error) {
            //settings have not worked
            if (error) {
                db = mongoose.connection;
                db.close();
                log.error("Failed to connect to database. Connection closed.");
                setup[0].database = {status: "error", error: error};
                //settings are correct
            } else {
                log.info("Successfully connected to database.");
                db = mongoose.connection;
                setup[0].database = {status: "success", error: null};

                //begin writing data

                //admin account
                log.info("Attempting to create administrator account...");
                //check for existing Administrator
                User.getUserByUsername("Administrator", function(error, user) {
                    if (user){  //admin already exists
                        log.warn("Administrator account already exists, deleting account...");
                        User.deleteUser(user._id, function(error) {
                            if (error) {    //error
                                setup[0].admin = {status: "error", error: error};
                            } else {    //create new admin
                                log.info("Administrator account deleted.");
                                User.newUser(request.body.user, function(error) {
                                    if (error) {
                                        setup[0].admin = {status: "error", error: error};
                                    } else {
                                        setup[0].admin = {status: "success", error: null};
                                        log.info("New administrator account created.");
                                    }
                                })
                            }
                        })
                    } else if (error) { //error looking for Admin account
                        setup[0].admin = {status: "error", error: error};
                    } else {    //admin account does not exist
                        User.newUser(request.body.user, function(error) {
                            if (error) {
                                setup[0].admin = {status: "error", error: error};
                            } else {
                                setup[0].admin = {status: "success", error: null};
                                log.info("Administrator account created.");
                            }
                        })
                    }
                });

                log.info("Attempting to save site config...");

                //site name

                //check for existing config
                Config.deleteConfig("siteName", function(error) {
                    if (error) {
                        setup[0].siteName = {status: "error", error: error};
                    } else {
                        Config.newConfig({name: "siteName", data: request.body.siteName, public: true}, function(error) {
                            if (error) {
                                setup[0].siteName = {status: "error", error: error};
                            } else {
                                setup[0].siteName = {status: "success", error: null};
                                log.info("Site name saved.");
                            }
                        })
                    }
                });

                //listening port

                //check for existing config
                Config.deleteConfig("listen", function(error) {
                    if (error) {
                        setup[0].listen = {status: "error", error: error};
                    } else {
                        Config.newConfig({name: "listen", data: request.body.listen}, function(error) {
                            if (error) {
                                setup[0].listen = {status: "error", error: error};
                            } else {
                                setup[0].listen = {status: "success", error: null};
                                log.info("Site port saved.");
                            }
                        })
                    }
                });

                //facebook app id

                //check for existing config
                Config.deleteConfig("facebookAppID", function(error) {
                    if (error) {
                        setup[0].facebookAppID = {status: "error", error: error};
                    } else {
                        Config.newConfig({name: "facebookAppID", data: request.body.facebookAppID, public: true}, function(error) {
                            if (error) {
                                setup[0].facebookAppID = {status: "error", error: error};
                            } else {
                                setup[0].facebookAppID = {status: "success", error: null};
                                log.info("Facebook App ID saved.");
                            }
                        })
                    }
                });

                //facebook app secret

                //check for existing config
                Config.deleteConfig("facebookSecret", function(error) {
                    if (error) {
                        setup[0].facebookSecret = {status: "error", error: error};
                    } else {
                        Config.newConfig({name: "facebookSecret", data: request.body.facebookSecret}, function(error) {
                            if (error) {
                                setup[0].facebookSecret = {status: "error", error: error};
                            } else {
                                setup[0].facebookSecret = {status: "success", error: null};
                                log.info("Facebook Secret saved.");
                            }
                        })
                    }
                });

                // create required default data in database

                log.info("Attempting to initialise the database...");
                //create default roles
                var administrator = {role: "Administrator", permissions: ["admin-cp", "view-all-users", "update-any-user-profile", "publish-post", "view-pending-posts", "create-new-post", "delete-post", "edit-post", "edit-categories", "user"]};
                var editor = {role: "Editor", permissions: ["publish-post", "view-pending-posts", "create-new-post", "delete-post", "edit-categories", "edit-post", "user"]};
                var writer = {role: "Writer", permissions: ["view-pending-posts", "create-new-post", "edit-post", "user"]};
                var user = {role: "User", permissions: ["user"]};
                var role = [administrator, editor, writer, user];

                function postRole(role) {
                    Role.deleteRole(role.role, function (error) {
                        if (error) {
                            setup[0][role.role] = {status: "error", error: error};
                        } else {
                            Role.newRole(role, function(error) {
                                if (error) {
                                    setup[0][role.role] = {status: "error", error: error};
                                } else {
                                    setup[0][role.role] = {status: "success", error: null};
                                }
                            })
                        }
                    });
                }

                for (var i=0; i < role.length; i++) {
                    postRole(role[i]);
                }

                //create sample post
                log.info("Attempting to create the sample post...");
                Post.getPostByPermalink("my-first-post", function (error, post) {   //check if "my-first-post" already exists
                    if (error) {
                        setup[0].post = {status: "error", error: error};
                    } else {
                        if (!post) {
                            User.getUserByUsername("Administrator", function(error, user) {   //get id of admin to include as post author
                                if (error) {
                                    setup[0].post = {status: "error", error: error};
                                } else {
                                    var post = {title: "My First Post", author: user._id, content: "This post is a test, it should have been automatically deleted, check your database account has the correct permissions and restart the setup by deleting the config file", status: "published", permalink: "my-first-post", postDate: "2012-04-23T18:25:43.511Z", category: "test"};
                                    Post.newPost(post, function(error) {
                                        //error when attempting to post
                                        if (error) {
                                            setup[0].post = {status: "error", error: error};
                                        } else {
                                            log.info("Sample post created.");
                                            setup[0].post = {status: "success", error: null};
                                        }
                                    });
                                }
                            });
                        } else {
                            log.warn("The sample post already exists, skipping creation.");
                            setup[0].post = {status: "success", error: null};
                        }
                    }
                });

                //write config file
                log.info("Attempting to save config file...");
                var config = {mongodb: request.body.mongodb};
                fs.writeFile("config-temp.json", JSON.stringify(config), function (error) {   //make config temporary in the event that setup ends prematurely and requires to be run again
                    if (error) {
                        setup[0].config = {status: "error", error: error};
                    } else {
                        log.info("Config written.");
                        //check that config has been created
                        log.info("Verifying...");
                        fs.readFile('./config-temp.json', function read(error) { //attempt to read the config file
                            if (error) {
                                setup[0].config = {status: "error", error: error};
                            } else {
                                log.info("Config successfully written to disk.");
                                setup[0].config = {status: "success", error: null};
                            }
                        });
                    }
                })
            }
        });
    }
});

app.get("/setup/status", function(request, response){
    if (setup) {
        response.json(setup);
    }
});

app.get("/setup/complete", function(request, response){
    if (setup) {
        fs.rename("./config-temp.json", "./config.json", function(error) {
            if (error) {
                response.json({"status": "error", "error": error});
            } else {
                Config.getConfig("listen", function(error, port) {
                    if (error) {
                        //error
                    } else {
                        response.json({"status": "success", "port": port});
                        //restart server
                        listen = process.argv[2] = null;    //clear manually specified port, instead go with the one input during setup
                        log.info("Setup complete, restarting the server.");
                        db.close();
                        chassis.close();    //stop listening
                        setup = false;  //reset app to normal mode
                        serverInit();   //start again
                    }
                });
            }
        });
    }
});

/**---------------------------------------------------------------------------------------------------------------------
 * Connect To Database
 */

function connectDB(config) {
    log.info("Connecting to database " + config.mongodb.host + ":" + config.mongodb.port + "/" + config.mongodb.dbName + " as user: " + config.mongodb.username);
    try {
        var options = {user: config.mongodb.username, pass: config.mongodb.password, auth: {authdb: config.mongodb.dbName}, server: {socketOptions: {socketTimeoutMS: 0, connectionTimeout: 0}}};
        mongoose.Promise = global.Promise;
        mongoose.connect(config.mongodb.host + ":" + config.mongodb.port + "/" + config.mongodb.dbName, options);
    }
    catch(error) {
        log.error("An error occurred when attempting to connect to the database.", {error: error});
        process.exit();
    }
    db = mongoose.connection;

    //get config
    Config.getConfig("facebookAppID", function(error, appID) {
        if (error) {
            //error
        } else {
            Config.getConfig("facebookSecret", function(error, secret) {
                if (error) {
                    //error
                } else {
                    connectFacebook(appID.data, secret.data);
                }
            });
        }
    });

    if (!setup) {
        Config.getConfig("listen", function(error, listen) {
            if (error) {
                //error
            } else {
                startServer(listen.data);    //start server if we are not in setup mode
            }
        });
    }
}

/**---------------------------------------------------------------------------------------------------------------------
 * Login System
 */
//initialise facebook procedure
function connectFacebook(appID, secret) {
    passport.use(new FacebookStrategy({
        clientID: appID,
        clientSecret: secret,
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
                    return done(null, user);
                } else {
                    var newUser = {"email": profile.emails[0].value, "firstName": profile.name.givenName, "secondName": profile.name.familyName, "img": profile.photos[0].value, "facebookID": profile.id};

                    User.newUser(newUser, function(error, user) {
                        if (error) {
                            return done(error);
                        } else {
                            return done(null, user);
                        }
                    })
                }
            }

        });
    }));

    //TODO add more login options
}

//facebook login url
app.get("/auth/facebook", passport.authenticate("facebook", {scope: ["public_profile", "email"], session: false}));

//facebook callback
app.get("/auth/facebook/callback", passport.authenticate('facebook', {failureRedirect: '/login'}), function (request, response) {
    createSession(request, response);
});

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

function createSession(request, response) {

    var session = {sessionID: generateID(), userID: request.user._id};

    if (request.user.username) {

        Session.newSession(session, function(error) {
            if (error) {
                response.status(500).send(error);
            } else {
                response.cookie("chassis_session", session.sessionID, {maxAge: 1000 * 60 * 60 * 24 * 30});
                response.redirect(request.get("referer"));
            }
        })

    } else {

        Session.newSession(session, function(error) {
            if (error) {
                response.status(500).send(error);
            } else {
                response.cookie("temp_chassis_session", session.sessionID, {maxAge: 1000 * 60 * 5});
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

function checkPermission(permission, cookie, callback) {    //callback(error, permitted)
    Session.getSession(cookie, function(error, user) {  //get user session info from cookie data
        if (error) {
            callback(true, false);
        } else {
            var result = false;
            if (user) {  //if a session is currently active check the user's permissions
                Role.getRole(user.userID.role, function (error, role) {
                    var permitted;
                    if (error) {
                        callback(true, false);
                    } else {
                        permitted = role.permissions;
                        for (var i = 0; i < permitted.length; i++) {
                            if (permission === permitted[i]) {  //if permission requested = role permission
                                result = true;
                            }
                        }
                        callback(false, result);    //if any matches occur, "true" is returned
                    }
                });
            } else {    //no user session is active (user is not logged in)
                callback(false, false);
            }
        }
    });
}

//permission denied options
function permissionDenied(request, response) {
    if(request.cookies.chassis_session) {
        //user is logged in
        response.redirect("/401");
    } else {
        buildPage("login", response);
    }
}

//check permission api
app.get("/data/permission/:permission", function(request, response){
    checkPermission(request.params.permission, request.cookies.chassis_session, function(error, permitted) {
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

/**---------------------------------------------------------------------------------------------------------------------
 * Menu Endpoints
 */

//get menu
app.get("/data/menu", function(request, response){
    Menu.getMenu(function(error, menu) {
        if (error) {    //something went wrong
            response.json({"data": error, "status":"error"});
        } else {    //no user is logged in
            response.json({"data": menu, "status":"success"});
        }
    })
});

//add menu item
app.post("/data/menu", function(request, response){
    Menu.newMenu(request.body, function(error, menu) {
        if (error) {    //something went wrong
            response.json({"data": error, "status":"error"});
        } else {    //no user is logged in
            response.json({"data": menu, "status":"success"});
        }
    })
});

//edit menu item
app.put("/data/menu/:name", function(request, response){
    Menu.editMenu(request.params.name, request.body, function(error, menu) {
        if (error) {    //something went wrong
            response.json({"data": error, "status":"error"});
        } else {    //no user is logged in
            response.json({"data": menu, "status":"success"});
        }
    })
});

//delete menu item
app.delete("/data/menu/:name", function(request, response){
    Menu.deleteMenu(request.params.name, function(error, menu) {
        if (error) {    //something went wrong
            response.json({"data": error, "status":"error"});
        } else {    //no user is logged in
            response.json({"data": menu, "status":"success"});
        }
    })
});

//get session user details
app.get("/auth/session", function(request, response){
    Session.getSession(request.cookies.chassis_session, function(error, session) {
        if (error) {    //something went wrong
            response.json({"data": error, "status":"error"});
        } else if(session) {    //user is logged in
            //get user's role details
            Role.getRole(session.userID.role, function(error, role) {
                if (error) {
                    response.json({"data": error, "status":"error"});
                } else {
                    response.json({"data": {user: {username: session.userID.username, img: session.userID.img}, permissions: role.permissions}, "status":"success"});
                }
            })
        } else {    //no user is logged in
            response.json({"data": null, "status":"success"});
        }
    })
});

//get full settings
app.get("/data/settings", function(request, response){
    checkPermission("admin-cp", request.cookies.chassis_session, function(error, permitted) {
        if (error) {
            handleError(error, "An error occurred attempting to determine the user's permissions.", request, response);
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
    Config.getPublicConfig(function(error, config) {
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
    checkPermission("edit-categories", request.cookies.chassis_session, function(error, permission) {
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
    checkPermission("view-all-users", request.cookies.chassis_session, function(error, permission) {
        if (error) {
            handleError(error, "An error occurred attempting to determine the user's permissions.", request, response);
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
app.get("/data/user/:username", function(request, response){
    User.getUserByUsername(request.params.username, function(error, user) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else if(!user) {
            response.json({"data": null, "status":"success"});
        } else {
            Post.getPostsByAuthor(user._id, function(error, posts) {
                if (error) {
                    response.json({"data": error, "status":"error"});
                } else {
                    response.json({"data": {"profile": user, "posts": posts}, "status":"success"});
                }
            },5);
        }
    });
});

//create new user
app.post("/data/user", function(request, response){
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
app.put("/data/user/:id", function(request, response){
    var requestUser = request.params.id;
    var profile = request.body;

    Session.getSession(request.cookies.chassis_session, function(error, session) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            if (session.userID._id === requestUser) {
                User.updateUserProfile(request.params.id, profile, function(error, user) {
                    if (error) {
                        response.json({"data": error, "status":"error"});
                    } else {
                        response.json({"data": user, "status":"success"});
                    }
                })
            } else {
                checkPermission("update-any-user-profile", request.cookies.chassis_session, function(error, permitted) {
                    if (error) {
                        handleError(error, "An error occurred attempting to determine the user's permissions.", request, response);
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
    if (request.cookies.temp_chassis_session) {
        var username = request.body;

        Session.getSession(request.cookies.temp_chassis_sessio, function(error, session) {
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
app.delete("/data/user/:id", function(request, response){
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
app.get("/data/post/:category/:permalink", function(request, response){
    Post.getPostByPermalink(request.params.permalink, request.params.category, function(error, post) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            if (post) { //if a post is found
                if (post.status === "unpublished") {
                    //check the user has the permission to view unpublished posts
                    checkPermission("view-pending-posts", request.cookies.chassis_session, function(error, permission) {
                        if (error) {
                            handleError(error, "An error occurred attempting to determine the user's permissions.", request, response);
                        } else {
                            if (permission) {
                                response.json({"data": post, "status":"success"});
                            } else {    //if not, only show the post if the user is the author
                                Session.getSession(request.cookies.chassis_session, function(error, session) {  //get the users session
                                    if (error) {
                                        response.json({"data": error, "status":"error"});
                                    } else {
                                        if (JSON.stringify(post.author._id) === JSON.stringify(session.userID._id)) {
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
app.get("/data/post/:id", function(request, response){
    Post.getPostByID(request.params.id, function(error, post) {
        if (error) {
            response.json({"data": error, "status":"error"});
        } else {
            response.json({"data": post, "status":"success"});
        }
    })
});

//get posts by user
app.get("/data/posts/:user", function(request, response){
    User.getUserByUsername(request.params.user, function(error, user) {
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
    checkPermission("create-new-post", request.cookies.chassis_session, function(error, permission) {
        if (error) {
            handleError(error, "An error occurred attempting to determine the user's permissions.", request, response);
        } else {
            if (permission) {
                var post = request.body;
                //set post author to current user
                Session.getSession(request.cookies.chassis_session, function(error, session) {
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
    checkPermission("delete-post", request.cookies.chassis_session, function(error, permission) {
        if (error) {
            handleError(error, "An error occurred attempting to determine the user's permissions.", request, response);
        } else {
            if (permission) {
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

    checkPermission("create-new-post", request.cookies.chassis_session, function(error, permission) {
        if (error) {
            handleError(error, "An error occurred attempting to determine the user's permissions.", request, response);
        } else {
            if (permission) {

                Session.getSession(request.cookies.chassis_session, function(error, session) {
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
app.get("/post/:category/:post", function(request, response) {
    if (setup) {
        response.sendFile(__dirname + '/controlpanel/setup.html');
    } else {
        buildPage("posts", response);
    }
});

//display a user profile
app.get("/user/:user", function(request, response) {
    if (setup) {
        response.sendFile(__dirname + '/controlpanel/setup.html');
    } else {
        buildPage("profile", response);
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
app.get("/publish/:post", function(request, response) {
    if (setup) {
        response.sendFile(__dirname + '/controlpanel/setup.html');
    } else {
        if (request.params.post === "new") {
            checkPermission("create-new-post", request.cookies.chassis_session, function(error, permission) {
                if (error) {
                    handleError(error, "An error occurred attempting to determine the user's permissions.", request, response);
                } else {
                    if (permission) {
                        buildPage("new-post", response);
                    } else {
                        permissionDenied(request, response);
                    }
                }
            });
        } else {
            checkPermission("publish-post", request.cookies.chassis_session, function(error, permission) {
                if (error) {
                    handleError(error, "An error occurred attempting to determine the user's permissions.", request, response);
                } else {
                    if (permission) {
                        Post.publishPost(request.params.post, function(error, post) {
                            if (error) {
                                permissionDenied(request, response);
                            } else {
                                if (post) {
                                    response.set('Message', 'Jobby');
                                    response.redirect("/post/" + post.category + "/" + post.permalink);
                                } else {
                                    buildPage("500", response);
                                }
                            }
                        })
                    } else {
                        permissionDenied(request, response);
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
        checkPermission("delete-post", request.cookies.chassis_session, function(error, permission) {
            if (error) {
                handleError(error, "An error occurred attempting to determine the user's permissions.", request, response);
            } else {
                if (permission) {
                    Post.deletePost(request.params.param, function(error) {
                        if (error) {
                            permissionDenied(request, response);
                        } else {
                            if (response.status = "ok") {
                                response.redirect("/" + request.params.param);
                            } else {
                                buildPage("500", response);
                            }
                        }
                    })
                } else {
                    permissionDenied(request, response);
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
        if (request.params.content === "profile") {
            checkPermission("user", request.cookies.chassis_session, function(error, permission) {
                if (error) {
                    handleError(error, "An error occurred attempting to determine the user's permissions.", request, response);
                } else {
                    if (permission) {
                        buildPage("profile-edit", response);
                    } else {
                        response.redirect("/");
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
            case "post":
            case "user":
                if (request.cookies.chassis_session) {  //user is logged in
                    Session.getSession(request.cookies.chassis_session, function(error, session) {
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
                checkPermission("view-pending-posts", request.cookies.chassis_session, function(error, permitted) {
                    if (error) {
                        response.json({"data": "An error occurred attempting to determine the user's permissions.", "status":"error"});
                    } else {
                        if (permitted) {
                            buildPage("pending", response);
                        } else {
                            permissionDenied(request, response);
                        }
                    }
                });
                break;

            /**---------------------------------------------------------------------------------------------------------
             * Administrator
             */
            case "cp":
                checkPermission("admin-cp", request.cookies.chassis_session, function(error, permitted) {
                    if (error) {
                        response.json({"data": "An error occurred attempting to determine the user's permissions.", "status":"error"});
                    } else {
                        if (permitted) {
                            buildPage("cp", response);
                        } else {
                            permissionDenied(request, response);
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
            handleError(error, "Template file '" + error.path + "' missing.", request, response);
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
            case "profile":
                file = "profile.html";
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
            case "profile-edit":
                file = "profile-edit.html";
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
                handleError(error, "Template file '" + error.path + "' missing.", request, response);
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
                handleError(error, "Template file '" + error.path + "' missing.", request, response);
            } else {
                page += data;
                if (request === "404") {
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

function handleError(level, type, error, msg, request, response) {
    /*if(request && request.xhr) {
        switch(error) {
            default:
                response.json({"data": {"message": msg, "error": error}, "status":"error"});
        }
    } else {
        response.status(500).send("ERROR: " + error);
    }
    console.log("ERROR: " + error);
    */

    switch (type) {
        case "db":
            log.error("A " + level + " database error occurred: " + msg, {error: error});

            break;

        case "http":
            log.error("A " + level + " http error occurred: " + msg, {error: error});
    }

    if(request && request.xhr) {
        response.json({"data": {"message": msg, "error": error}, "status":"error"});
    }
}

/**---------------------------------------------------------------------------------------------------------------------
 * Start Server
 */

function startServer(listen) {
    //override port if included in command line
    if (Number(process.argv[2])) {
        listen = process.argv[2];
    } else {    //use default port in config
        //do nout
    }
    chassis = app.listen(listen);    //start listening for requests
    console.log("Listening on port " + listen);
}

//fetch settings from config file
serverInit();