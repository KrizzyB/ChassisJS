/**---------------------------------------------------------------------------------------------------------------------
 * Global Page Code
 */
//app settings
var config = {};
var chassis = angular.module("chassis",[]).config(function($sceProvider) {
    $sceProvider.enabled(false);    //disable html cleaning
});

//capture url params
var path = window.location.pathname.split("/"); //create array of URL path levels
if (path[path.length-1] === "") {   //check for empty index created by trailing slash in url
    path.pop(); //remove it
}

//global page controller
chassis.controller("global", function($scope, $http){

    //get public config
    loading();   //begin loading bar
    $http.get("/data/config", {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
        .success(function(response) {
            loading("inc"); //loading bar
            if (response.status === "success") {
                for(var i=0; i<response.data.length; i++) {
                    config[response.data[i].name] = response.data[i].data;
                }
                $scope.config = config;
            } else {
                httpError(response);
            }

            //config loaded
            $scope.$watch("config", function(user) {
                $scope.$broadcast('menuLoaded',user)
            })

        })
        .error(function(response) {
            httpError(response);
        });

    //get menu
    $http.get("/data/menu", {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
        .success(function(menu) {
            loading("inc"); //loading bar
            if (menu.status === "success") {
                $scope.menus = menu.data;

                $("#menu-container").on("mouseenter", ".parent", function() {
                    $scope.$apply($(this).children(".submenu").show());
                }).on("mouseleave", ".parent", function() {
                    $scope.$apply($(this).children(".submenu").hide());
                });

            } else {
                httpError(menu);
            }

            //menu loaded
            $scope.$watch("menus", function(user) {
                $scope.$broadcast('menuLoaded',user)
            })

        })
        .error(function(response) {
            httpError(response);
        });


    //render custom page elements for user
    $http.get("/auth/session", {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
        .success(function(response) {
            loading("inc"); //loading bar
            if (response.status === "success" && response.data) {
                $scope.user = response.data.user;

                //permission-specific elements
                //enable post creation
                if (response.data.permissions.indexOf("create-new-post") >= 0) {
                    $scope.create = true;
                }

                //enable post review
                if (response.data.permissions.indexOf("view-pending-posts") >= 0) {
                    $scope.pending = true;
                }

                //enable control panel
                if (response.data.permissions.indexOf("admin-cp") >= 0) {
                    $scope.cp = true;
                }

            }  else {
                //no session cookie exists
                $scope.login = true;
            }

            //user loaded
            $scope.$watch("user", function(user) {
                $scope.$broadcast('userLoaded',user)
            })

        })
        .error(function(response) {
            httpError(response);
        });

});

chassis.directive('menuEvents', ['$timeout', function ($timeout) {
    return {
        link: function ($scope, element, attrs) {

        }
    };
}]);

/**---------------------------------------------------------------------------------------------------------------------
 * Login Page Code
 */

chassis.controller("login", function($scope) {
    $scope.$on('userLoaded',function(event, data){
        if (data) {
            window.location.replace("/");
        } else {
            $scope.login = true;
        }
    });
    loading("done"); //loading bar
});

/**---------------------------------------------------------------------------------------------------------------------
 * Home Page Code
 */

chassis.controller("home", function($scope, $http) {
    $http.get("/data/posts/", {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
        .success(function (response){
            loading(0.5); //loading bar
            if (response.status === "success") {
                //fill out the data on the page
                $scope.posts = response.data;
                loading("done"); //loading bar
            } else {
                httpError(response);
            }
        })
        .error(function(response) {
            httpError(response);
        });
});

/**---------------------------------------------------------------------------------------------------------------------
 * Post Page Code
 */

chassis.controller("post", function($scope, $http, $sce) {
    $http.get("/data/post/"+ path[path.length-2] + "/" + path[path.length-1], {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
        .success(function (post){
            console.log(post);
            loading(0.5);   //loading bar
            if (post.status === "success" && post.data) {    //post with this name exists

                //fill out the data on the page
                $scope.post = post.data;

                //add post title to page title
                var page = angular.element("#page").scope();
                page.config.siteName = post.data.title + " - " + config.siteName;

                //check if post is unpublished
                if (post.data.status === "unpublished") {    //if yes, check if current user has editorial privileges
                    $http.get("/auth/session/", {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
                        .success(function(session) {
                            if (session.status === "success" && session.data) {
                                if (session.data.permissions.indexOf("publish-post") >= 0) {
                                    $scope.publisher = true;
                                }
                            } else {
                                httpError(session);
                            }
                        })
                        .error(function(response) {
                            httpError(response);
                        });
                }
                loading("done");   //loading bar
            } else if (post.status === "success") {    //successful request but no post data
                window.location.replace("/404");
            } else {
                httpError(post);
            }
        })
        .error(function(error) {
            httpError(error);
        });
});

/**---------------------------------------------------------------------------------------------------------------------
 * Edit Post Page Code
 */

chassis.controller("post-edit", function($scope, $http) {

    //insert today's date
    var date = new Date();
    var month;
    var day;

    if ((date.getMonth() + 1) < 10) {
        month = "0" + (date.getMonth() + 1);
    } else {
        month = date.getMonth() + 1;
    }

    if (date.getDate() < 10) {
        day = "0" + date.getDate()
    } else {
        day = date.getDate()
    }

    $("#post-date").val(date.getFullYear() + '-' + month + '-' + day);

    $http.get("/data/categories", {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
        .success(function(response) {
            loading(0.5);   //loading bar
            if (response.status === "success") {
                $scope.categories = response.data;
                loading("done");   //loading bar
            } else {
                httpError(response);
            }
        })
        .error(function(response) {
            httpError(response);
        });
    
    //event handlers

    //permalink generator
    $("#post-title").on("change keyup paste mouseup", function() {
        var permalink = $("#post-title").val().toLowerCase();
        //replace spaces with dashes
        permalink = permalink.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "-").replace(/^-+|-+$/g, ''); /* Source: https://gist.github.com/jzazove/1479763 */
        $("#post-permalink").val(permalink);
    });

    //manual permalink
    $("#post-permalink-manual-toggle").change(function() {
        if (this.checked) {
            $("#post-title").off("change keyup paste mouseup"); //disable auto-fill
            $("#post-permalink").removeAttr("readonly");
        } else {
            $("#post-title").on("change keyup paste mouseup", function() {
                var permalink = $("#post-title").val().toLowerCase();
                //replace spaces with dashes
                permalink = permalink.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "-").replace(/^-+|-+$/g, ''); /* Source: https://gist.github.com/jzazove/1479763 */
                $("#post-permalink").val(permalink);
            });
            $("#post-permalink").attr('readonly', true);
        }
    });

    //submit post
    $("#post-submit").on("click", function() {
        var fields = ["post-title", "post-permalink", "post-date", "post-catagories", "post-tags"];

        //clear any validation errors
        for (var i=0; i<fields.length; i++) {
            $("#" + fields[i]).closest(".form-group").removeClass("has-error");
            $(".form-feedback").css("display", "none");
        }


        //validate inputs
        var valid = true;

        //check for empty fields
        for (var j=0; j<fields.length; j++) {
            if ($("#" + fields[j]).val() === "") {
                $("#" + fields[j]).closest(".form-group").addClass("has-error");
                $("#" + fields[j] + "-feedback").css("display", "inherit");
                valid = false;
            }
        }


        //format tags
        var tags = $("#post-tags").tagsinput('items');

        //grab category
        var category = $("#category").val();

        //check
        if (valid) {

            var post = {
                title: $("#post-title").val(),
                subtitle: $("#post-subtitle").val(),
                content: $(".ql-editor").html(),
                excerpt: $("#post-excerpt").val(),
                tags: tags,
                category: category,
                permalink: $("#post-permalink").val(),
                postDate: formatDate(new Date())
            };

            //create post
            $http.post("/data/posts", post, {headers: { 'X-Requested-With' :'XMLHttpRequest' }})

                .success(function(response) {
                    loading(0.7);   //loading bar
                    if (response.status === "success") {
                        loading("done");   //loading bar
                        window.location.replace("/post/" + response.data.category + "/" + response.data.permalink);
                    } else {
                        if(response.data.code === 11000) {
                            $("#post-permalink").closest(".form-group").addClass("has-error");
                            $("#post-permalink-feedback-unique").css("display", "inherit");
                        } else {
                            httpError(response);
                        }
                    }
                })
                .error(function(response) {
                    if(response.data.code === 11000) {
                        $("#post-permalink").closest(".form-group").addClass("has-error");
                        $("#post-permalink-feedback-unique").css("display", "inherit");
                    } else {
                        httpError(response);
                    }
                });
        }
    });
});

function formatDate(date) {
    var hrs, mins;

    if (date.getHours() < 10) {
        hrs = "0" + date.getHours();
    } else {
        hrs = date.getHours();
    }

    if (date.getMinutes() < 10) {
        mins = "0" + date.getMinutes();
    } else {
        mins = date.getMinutes();
    }

    var day = ["Sunday", "Monday", "Tuesaday", "Wednesday", "Thursday", "Friday", "Saturday"];

    var month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    var ordinal;

    switch(date.getDate()) {
        case "1":
        case "21":
        case "31":
            ordinal = "st";
            break;
        case "2":
        case "22":
            ordinal = "nd";
            break;
        case "3":
        case "23":
            ordinal = "rd";
        default:
            ordinal = "th";
    }

    return day[date.getDay()] + " " + date.getDate() + ordinal + " " + month[date.getMonth()] + " " + date.getFullYear() + " - " + hrs + ":" + mins;
}

/**---------------------------------------------------------------------------------------------------------------------
 * Profile Page Code
 */

chassis.controller("profile", function($scope, $http) {

    $http.get("/data/user/" + path[path.length-1], {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
        .success(function (response){
            loading(0.5);   //loading bar
            if (response.status === "success" && response.data) {    //user with this username exists
                //fill out the data on the page
                $scope.profile = response.data.profile;
                $scope.posts = response.data.posts;

                //add username to page title
                var page = angular.element("#page").scope();
                page.config.siteName = $scope.profile.username + " - " + config.siteName;

                //enable edit link if this is the current user's profile
                $scope.$on('userLoaded',function(event, data){
                    if (data.username === $scope.profile.username) {
                        $scope.edit = true;
                    }
                });

                loading("done");   //loading bar
            } else if (response.status === "success") {    //404
                window.location.replace("/404");
            } else {
                httpError(response);
            }
        })
        .error (function (response) {
            httpError(response);
        });
});

/**---------------------------------------------------------------------------------------------------------------------
 * Edit Profile Page Code
 */

chassis.controller("profile-edit", function($scope, $http) {

    //grab details of logged in user
    $scope.$on('userLoaded',function(event, data){
        loading(0.5);   //loading bar
        if (data) {
            $http.get("/data/user/" + data.username, {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
                .success(function(response) {
                    if (response.status === "success" && response.data) {    //user with this username exists
                        //fill out the data on the page
                        $scope.user = response.data.profile;

                        //add username to page title
                        var page = angular.element("#page").scope();
                        page.config.siteName = data.username + " - " + config.siteName;
                        loading("done");   //loading bar
                    } else if (response.status === "success") {    //404
                        window.location.replace("/");
                    } else {
                        httpError(response);
                    }
                })
                .error(function (response) {
                    httpError(response);
                });
        } else {
            window.location.replace("/");
        }
    });

});

/**---------------------------------------------------------------------------------------------------------------------
 * Error Page Code
 */
chassis.controller("error", function() {
    loading("done");   //loading bar
});

/**---------------------------------------------------------------------------------------------------------------------
 * Error Handlers
 */

//HTTP request errors
function httpError(response) {
    try {
        if(response.status === "error") {
            handleError(response.data);
        } else {
            handleError({message: "An unknown error occurred"});
        }
    } catch(error) {
        console.log("Error occurred: " + error);
        handleError(error);
    }
}

function handleError(error) {
    console.log(error);
    displayAlert("error", error.message);
    loading("done"); //loading bar
}

/**---------------------------------------------------------------------------------------------------------------------
 * Visual Effects
 */

//Progress Bar
function loading(inc) {
    NProgress.configure({ easing: 'ease', speed: 500, trickleSpeed: 1000});
    if (!inc) {
        NProgress.start();
    } else if (Number(inc)) {
        if (NProgress.isStarted()) {    //only accept inc when progress bar is already active
            NProgress.set(inc);
        }
    } else if (inc === "inc") {
        if (NProgress.isStarted()) {    //only accept inc when progress bar is already active
            NProgress.inc();
        }
    } else {
        NProgress.set(0.99);    //set to 99% and wait 0.5 seconds before done
        setTimeout(function() {
            NProgress.done();
        }, 500);
    }
}

function displayAlert(type, msg) {
    $(".alert").css("display", "none"); //hide any existing alerts

    if (msg === "" || msg === undefined) {
        msg = "An unknown error occurred.";
    }

    switch (type) {
        case "success":
            $(".alert-success").css("display", "inherit");
            $("#success-msg").html(msg);
            break;
        case "info":
            $(".alert-info").css("display", "inherit");
            $("#info-msg").html(msg);
            break;
        case "warning":
            $(".alert-warning").css("display", "inherit");
            $("#warning-msg").html(msg);
            break;
        case "error":
            $(".alert-danger").css("display", "inherit");
            $("#danger-msg").html(msg);
            break;
    }
}