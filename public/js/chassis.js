/**
 * Created by KrizzyB on 01/11/2016.
 */

var user, content;
var Config = {};

/**---------------------------------------------------------------------------------------------------------------------
 * Angular Code
 */
var pathname = window.location.pathname;    //get current page path
var path = pathname.substring(1, pathname.indexOf("/", 1));    //isolate the top level path
if (path !== "/") {
    var id = pathname.substring(path.length + 2);   //if it exists whatever immediately leads the path and use this as our query
}

var chassis = angular.module("chassis",[]).config(function($sceProvider) {
    $sceProvider.enabled(false);
});


chassis.controller("contentController", function($scope, $http){

    $http.get("/data/config", {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
        .success(function(response) {
            if (response.status == "success") {
                for(var i=0; i<response.data.length; i++) {
                    Config[response.data[i].name] = response.data[i].data;
                    appInit(Config);
                }
                $scope.config = Config;
                $scope.siteName = Config.siteName;
            } else {
                try {
                    throwError(response.data);
                } catch (error) {
                    console.log("Error occurred: " + error);
                    throwError(error);
                }
            }

        })
        .error(function(response) {
            try {
                throwError(response.data);
            } catch (error) {
                console.log("Error occurred: " + error);
                throwError(error);
            }
            console.log(response);
        });

    $http.get("/data/categories", {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
        .success(function(response) {
            if (response.status == "success") {
                $scope.categories = response.data;
            } else {
                try {
                    throwError(response.data);
                } catch (error) {
                    console.log("Error occurred: " + error);
                    throwError(error);
                }
            }

        })
        .error(function(response) {
            try {
                throwError(response.data);
            } catch (error) {
                console.log("Error occurred: " + error);
                throwError(error);
            }
            console.log(response);
        });

    var cookie = document.cookie;
    if (cookie.indexOf("session") >=0) {
        //session cookie exists
        var index = cookie.indexOf("session");
        cookie = cookie.slice(index+8);

        $http.get("/auth/session/" + cookie, {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
            .success(function(response) {
                if (response.status == "success" && response.data) {
                    $scope.user = response.data;
                    //get permissions
                    $http.get("/data/role/" + response.data.role)
                        .success(function (response) {
                            if (response.status == "success" && response.data) {
                                //check for permissions

                                if (response.data.permissions.indexOf("create-new-post") >= 0) {
                                    $scope.newPostText = "Create New Post";
                                    $scope.newPostUrl = "/publish/new";
                                }

                                if (response.data.permissions.indexOf("view-pending-posts") >= 0) {
                                    $scope.pendingPostsText = "Pending Posts";
                                    $scope.pendingPostsUrl = "/pending";
                                }

                                if (response.data.permissions.indexOf("admin-cp") >= 0) {
                                    $scope.controlPanelText = "Admin";
                                    $scope.controlPanelUrl = "/cp";
                                }
                            } else if (response.status == "success") {
                                $scope.signInText = "Sign In";
                                $scope.signInUrl = "/login";
                            } else {
                                throwError(response.data);
                            }
                        })
                }  else {
                    //no session cookie exists
                    $scope.signInText = "Sign In";
                    $scope.signInUrl = "/login";
                }

            })
            .error(function(response) {
                try {
                    throwError(response.data);
                } catch (error) {
                    console.log("Error occurred: " + error);
                    throwError(error);
                }
         });

    } else {
        //no session cookie exists
        $scope.signInText = "Sign In";
        $scope.signInUrl = "/login";
    }

});

chassis.controller("homeController", function($scope, $http) {

    NProgress.start();
    $http.get("/data/posts/", {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
        .success(function (response){
            if (response.status == "success") {
                console.log(response);
                //fill out the data on the page
                $scope.posts = response.data;
                NProgress.done();
            } else {
                NProgress.done();
                try {
                    throwError(response.data);
                } catch (error) {
                    console.log("Error occurred: " + error);
                    throwError(error);
                }
            }
        })
        .error(function(response) {
        try {
            throwError(response.data);
        } catch (error) {
            console.log("Error occurred: " + error);
            throwError(error);
        }
    });
});

chassis.controller("postController", function($scope, $http, $sce) {

    NProgress.start();
    $http.get("/data/posts/" + id, {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
        .success(function (response){
            console.log(response);
            if (response.status == "success" && response.data) {    //post with this name exists
                //fill out the data on the page
                $scope.post = response.data;
                $scope.post.content = $sce.trustAsHtml(response.data.content);
                $scope.author = response.data.author;

                //input page title
                var page = angular.element("#page").scope();
                page.siteName = response.data.title + " - " + Config.siteName;
                NProgress.done();

                //check if post is unpublished
                var permission = false;
                if (response.data.status == "unpublished") {    //if yes, check if current user has editorial privileges
                    var cookie = document.cookie;
                    var index = cookie.indexOf("session");
                    cookie = cookie.slice(index+8);
                    $http.get("/auth/session/" + cookie, {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
                        .success(function(response) {
                            if (response.status == "success" && response.data) {
                                $http.get("/data/role/" + response.data.role, {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
                                    .success(function(response) {
                                        if (response.status == "success" && response.data) {
                                            //check for permissions
                                            var permission = false;
                                            for (var i=0; i<response.data.permissions.length ; i++) {
                                                if (response.data.permissions[i] == "publish-post") {
                                                    permission = true
                                                }
                                            }
                                            if (permission) {
                                                $("#publishing-options").css("display", "initial");
                                            }
                                        } else {
                                            throwError(response.data);
                                        }
                                    })
                                    .error(function(response) {
                                        try {
                                            throwError(response.data);
                                        } catch (error) {
                                            console.log("Error occurred: " + error);
                                            throwError(error);
                                        }
                                    });
                            } else {
                                throwError(response.data);
                            }
                        })
                        .error(function(response) {
                            try {
                                throwError(response.data);
                            } catch (error) {
                                console.log("Error occurred: " + error);
                                throwError(error);
                            }
                        });
                }
            } else if (response.status == "success") {    //404
                window.location.replace("/404");
                NProgress.done();
            } else {
                try {
                    throwError(response.data);
                } catch (error) {
                    console.log("Error occurred: " + error);
                    throwError(error);
                }
            }
        })
        .error(function(response) {
            try {
                throwError(response.data);
            } catch (error) {
                console.log("Error occurred: " + error);
                throwError(error);
            }
        });
});

chassis.controller("postEditController", function($scope, $http) {

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
            if (response.status == "success") {
                $scope.categories = response.data;
            } else {
                try {
                    throwError(response.data);
                } catch (error) {
                    console.log("Error occurred: " + error);
                    throwError(error);
                }
            }

        })
        .error(function(response) {
            try {
                throwError(response.data);
            } catch (error) {
                console.log("Error occurred: " + error);
                throwError(error);
            }
            console.log(response);
        });
});

chassis.controller("userController", function($scope, $http) {

    NProgress.start();
    $http.get("/data/users/" + id, {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
        .success(function (response){
            if (response.status == "success" && response.data) {    //user with this username exists
                //fill out the data on the page
                $scope.user = response.data;

                var cookie = document.cookie;
                if (cookie.indexOf("session") >=0) {
                    //session cookie exists
                    var index = cookie.indexOf("session");
                    cookie = cookie.slice(index + 8);
                    $http.get("/auth/session/" + cookie, {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
                        .success(function (session) {
                            if (response.status == "success" && response.data) {
                                if (session.data.username == response.data.username) {
                                    $scope.editProfileText = "Edit Profile";
                                    $scope.editProfileUrl = "/edit/profile";
                                }
                            } else {
                                throwError(response.data);
                            }
                        })
                        .error(function (response) {
                            try {
                                throwError(response.data);
                            } catch (error) {
                                console.log("Error occurred: " + error);
                                throwError(error);
                            }
                        });
                }

                //input page title
                var page = angular.element("#page").scope();
                page.siteName = "User " + response.data.username + " - " + Config.siteName;
                NProgress.done();
            } else if (response.data == "success") {    //404
                window.location.replace("/404");
                NProgress.done();
            } else {
                try {
                    throwError(response.data);
                } catch (error) {
                    console.log("Error occurred: " + error);
                    throwError(error);
                }
            }
        })
        .error (function (response) {
        try {
            throwError(response.data);
        } catch (error) {
            console.log("Error occurred: " + error);
            throwError(error);
        }
    });

    $http.get("/data/postsby/" + id, {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
        .success(function (response){
            if (response.status == "success" && response.data.length > 0) {
                $("#posts-by-user").css("display", "block");

                //fill out the data on the page
                $scope.posts = response.data;
            } else if (response.status == "success" && response.data.length == 0){
                //do nothing
            } else {
                try {
                    throwError(response.data);
                } catch (error) {
                    console.log("Error occurred: " + error);
                    throwError(error);
                }
            }
        })
        .error(function (response) {
            try {
                throwError(response.data);
            } catch (error) {
                console.log("Error occurred: " + error);
                throwError(error);
            }
    });
});

chassis.controller("editProfileController", function($scope, $http) {

    var cookie = document.cookie;
    if (cookie.indexOf("session") >=0) {
        //session cookie exists
        var index = cookie.indexOf("session");
        cookie = cookie.slice(index+8);

        $http.get("/auth/session/" + cookie, {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
            .success(function(response) {
                if (response.status == "success" && response.data) {    //user with this username exists
                    //fill out the data on the page
                    $scope.user = response.data;

                    //input page title
                    var page = angular.element("#page").scope();
                    page.siteName = "User " + response.data.username + " - " + Config.siteName;
                } else if (response.status == "success") {    //404
                    window.location.replace("/404");
                } else {
                    try {
                        throwError(response.data);
                    } catch (error) {
                        console.log("Error occurred: " + error);
                        throwError(error);
                    }
                }
            })
            .error(function (response) {
                try {
                    throwError(response.data);
                } catch (error) {
                    console.log("Error occurred: " + error);
                    throwError(error);
                }
        });

    } else {
        //no session cookie exists
        window.location.replace("/login");
    }

});

chassis.controller("searchController", function($scope, $http, $sce) {

    $http.get("/data/search/" + id, {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
        .success(function (response){
            console.log(response);
            if (response.status == "success" && response.data.length > 0) {    //post with this name exists
                //fill out the data on the page
                $scope.message = "Search returned " + response.data.length + " results.";
                $scope.posts = response.data;

                //input page title
                var page = angular.element("#page").scope();
                page.siteName = "Search Results - " + Config.siteName;

            } else if (response.status == "success") {    //no posts
                $scope.message = "No results were found."
            } else {
                try {
                    throwError(response.data);
                } catch (error) {
                    console.log("Error occurred: " + error);
                    displayAlert("error", "An unknown error occurred");
                }
            }
        })
        .error(function (response) {
            try {
                throwError(response.data);
            } catch (error) {
                console.log("Error occurred: " + error);
                displayAlert("error", "An unknown error occurred");
            }
    });
});

chassis.controller("categoryController", function($scope, $http, $sce) {

    $http.get("/data/category/" + id, {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
        .success(function (response){
            console.log(response);
            if (response.status == "success" && response.data.length > 0) {    //post with this name exists
                //fill out the data on the page
                $scope.message = "Search returned " + response.data.length + " results.";
                $scope.posts = response.data;

                //input page title
                var page = angular.element("#page").scope();
                page.siteName = "Search Results - " + Config.siteName;

            } else if (response.status == "success") {    //no posts
                $scope.message = "No results were found."
            } else {
                try {
                    throwError(response.data);
                } catch (error) {
                    console.log("Error occurred: " + error);
                    displayAlert("error", "An unknown error occurred");
                }
            }
        })
        .error(function (response) {
            try {
                throwError(response.data);
            } catch (error) {
                console.log("Error occurred: " + error);
                displayAlert("error", "An unknown error occurred");
            }
        });
});

chassis.controller("pendingPostsController", function($scope, $http) {

    $http.get("/data/pending/", {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
        .success(function (response){
            console.log(response);
            if (response.status == "success" && response.data.length > 0) {
                //fill out the data on the page
                $scope.message = response.data.length + " posts pending approval.";
                $scope.posts = response.data;

                //input page title
                var page = angular.element("#page").scope();
                page.siteName = "Pending Posts - " + Config.siteName;

            } else if(response.status == "success") {    //no posts
                $scope.message = "No results were found."
            } else {
                try {
                    throwError(response.data);
                } catch (error) {
                    console.log("Error occurred: " + error);
                    displayAlert("error", "An unknown error occurred");
                }
            }
        })
        .error(function(response) {
            try {
                throwError(response.data);
            } catch (error) {
                console.log("Error occurred: " + error);
                displayAlert("error", "An unknown error occurred");
            }
        });
});

chassis.controller("controlPanelController", function($scope, $http) {

    NProgress.start();

    //get posts
    $http.get("/data/posts/", {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
        .success(function (response){
            if (response.status == "success") {
                //fill out the data on the page
                $scope.posts = response.data;
                NProgress.done();
            } else {
                NProgress.done();
                try {
                    throwError(response.data);
                } catch (error) {
                    console.log("Error occurred: " + error);
                    displayAlert("error", "An unknown error occurred");
                }
            }
        })
        .error(function(response) {
            try {
                throwError(response.data);
            } catch (error) {
                console.log("Error occurred: " + error);
                displayAlert("error", "An unknown error occurred");
            }
        });

    //get users
    $http.get("/data/users/", {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
        .success(function (response){
            if (response.status == "success") {
                //fill out the data on the page
                $scope.users = response.data;
                NProgress.done();
            } else {
                NProgress.done();
                try {
                    throwError(response.data);
                } catch (error) {
                    console.log("Error occurred: " + error);
                    displayAlert("error", "An unknown error occurred");
                }
            }
        })
        .error(function(response) {
            try {
                throwError(response.data);
            } catch (error) {
                console.log("Error occurred: " + error);
                displayAlert("error", "An unknown error occurred");
            }
        });

    //get roles
    $http.get("/data/roles/", {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
        .success(function (response){
            if (response.status == "success") {
                //fill out the data on the page
                $scope.roles = response.data;
                NProgress.done();
            } else {
                NProgress.done();
                try {
                    throwError(response.data);
                } catch (error) {
                    console.log("Error occurred: " + error);
                    displayAlert("error", "An unknown error occurred");
                }
            }
        })
        .error(function(response) {
            try {
                throwError(response.data);
            } catch (error) {
                console.log("Error occurred: " + error);
                displayAlert("error", "An unknown error occurred");
            }
        });

    //get advanced settings
    $http.get("/data/settings/", {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
        .success(function (response){
            if (response.status == "success") {
                console.log(response);
                //fill out the data on the page
                $scope.settings = response.data;
                NProgress.done();
            } else {
                NProgress.done();
                try {
                    throwError(response.data);
                } catch (error) {
                    console.log("Error occurred: " + error);
                    displayAlert("error", "An unknown error occurred");
                }
            }
        })
        .error(function(response) {
            try {
                throwError(response.data);
            } catch (error) {
                console.log("Error occurred: " + error);
                displayAlert("error", "An unknown error occurred");
            }
        });

    // get config
    $http.get("/data/config", {headers: { 'X-Requested-With' :'XMLHttpRequest' }})
        .success(function(response) {
            if (response.status == "success") {
                $scope.config = Config;
            } else {
                try {
                    throwError(response.data);
                } catch (error) {
                    console.log("Error occurred: " + error);
                    displayAlert("error", "An unknown error occurred");
                }
            }

        })
        .error(function(response) {
            try {
                throwError(response.data);
            } catch (error) {
                console.log("Error occurred: " + error);
                displayAlert("error", "An unknown error occurred");
            }
            console.log(response);
        });
});

function appInit(Config) {
    /**---------------------------------------------------------------------------------------------------------------------
     * Facebook API
     */

    (function(d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s); js.id = id;
        js.src = "//connect.facebook.net/en_GB/sdk.js#xfbml=1&version=v2.8&appId=" + Config.facebookAppID;
        fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
}

/**---------------------------------------------------------------------------------------------------------------------
 * Current User DB Request
 */

function checkUserStatus() {
    if (sessionStorage.session) {
        //session already stored in sessionStorage
        var session = JSON.parse(sessionStorage.session);
        $("#user-menu-info").html("<img src='" + session.img + "'>" + session.username).attr("href", "/users/" + session.username);
    } else {
        //no session data in sessionStorage
        var cookie = document.cookie;
        if (cookie.indexOf("session") >=0) {
            //session cookie exists
            var index = cookie.indexOf("session");
            cookie = cookie.slice(index+8);
            $.ajax({
                type: "GET",
                url: "/auth/session/" + cookie,
                contentType: "application/json",
                dataType: 'json',
                timeout: 5000,
                success: function (response) {
                    console.log(response);
                    if (response.status == "success" && response.data) {
                        var sessionData = {"username": response.data.username, "img": response.data.img};
                        sessionStorage.session = JSON.stringify(sessionData);
                        $("#user-menu-info").html("<img src='" + sessionData.img + "'>" + sessionData.username).attr("href", "/users/" + sessionData.username);
                    } else {
                        $("#user-menu-info").html("Sign In").attr("href", "/login");
                    }
                },
                error: function (response) {
                    console.log(response);
                }
            });
        } else {
            //no session cookie exists
            $("#user-menu-info").html("Sign In").attr("href", "/login");
        }
    }
}

/**---------------------------------------------------------------------------------------------------------------------
 * Database Code
 */

/* Database GET Request */

function databaseGet(table, record, callback) {
    var url;
    if (record == "" || record == undefined) {
        url = table;
    } else {
        url = table + "/" + record;
    }

    $.ajax({
        type: "GET",
        url: "/data/" + url,
        contentType: "application/json",
        dataType: 'json',
        timeout: 5000,
        success: function (response) {
            callback(response);
        },
        error: function (response) {
            try {
                throwError(response.data);
            } catch (error) {
                console.log("Error occurred: " + error);
                displayAlert("error", "An unknown error occurred");
            }
        }
    });
}

/* Database POST Request */

function databasePost(table, postData, callback) {
    $.ajax({
        type: "POST",
        url: "/data/" + table,
        contentType: "application/json",
        dataType: 'json',
        data: JSON.stringify(postData),
        timeout: 5000,
        success: function (response) {
            callback(response);
        },
        error: function (response) {
            try {
                throwError(response.data);
            } catch (error) {
                console.log("Error occurred: " + error);
                displayAlert("error", "An unknown error occurred");
            }
        }
    });
}

//delete category
function deleteCategory(category) {
    $.ajax({
        type: "DELETE",
        url: "/data/category/" + category,
        contentType: "application/json",
        dataType: 'json',
        timeout: 5000,
        success: function (response) {
            displayAlert("success", "Category deleted.");
        },
        error: function (response) {
            try {
                throwError(response.data);
            } catch (error) {
                console.log("Error occurred: " + error);
                displayAlert("error", "An unknown error occurred");
            }
        }
    });
}

/**---------------------------------------------------------------------------------------------------------------------
 * Event Listeners
 */

function bindElements() {

    //permalink generator

    $("#post-title").on("change keyup paste mouseup", function() {
        var permalink = $("#post-title").val().toLowerCase();
        //replace spaces with dashes
        var permalink = permalink.replace(/ /g, "-");
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
                var permalink = permalink.replace(/ /g, "-");
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

        for (var i=0; i<fields.length; i++) {
            if ($("#" + fields[i]).val() == "") {
                $("#" + fields[i]).closest(".form-group").addClass("has-error");
                $("#" + fields[i] + "-feedback").css("display", "inherit");
                valid = false;
            }
        }


        //format tags
        var tags = $("#post-tags").val();
        tags = tags.replace(/\s/g, ''); //remove spaces
        tags = tags.split(",");
        for (var i=0; i<tags.length; i++) {
            tags[i] = tags[i].replace(/\W/g, '');   //remove non-alphanumeric symbols
        }

        //grab category
        var category = $("#category").val();

        if (valid) {

            databaseGet("posts", $("#post-permalink").val(), function(response) {
                if (response.status == "success" && response.data != null) {
                    $("#post-permalink").closest(".form-group").addClass("has-error");
                    $("#post-permalink-feedback-unique").css("display", "inherit");
                } else if (response.status == "error") {
                    try {
                        throwError(response.data);
                    } catch (error) {
                        console.log("Error occurred: " + error);
                        displayAlert("error", "An unknown error occurred");
                    }
                } else {
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

                    databasePost("posts", post, function(response) {
                        if (response.status == "success") {
                            window.location.replace("/");
                        } else {
                            try {
                                throwError(response.data);
                            } catch (error) {
                                console.log("Error occurred: " + error);
                                displayAlert("error", "An unknown error occurred");
                            }
                            console.log(response);
                        }
                    })
                }
            });

        }

    });

    //submit profile

    $("#profile-submit").on("click", function() {

        var cookie = document.cookie;
        if (cookie.indexOf("session") >=0) {
            //session cookie exists
            var index = cookie.indexOf("session");
            cookie = cookie.slice(index+8);
            $.ajax({
                type: "GET",
                url: "/auth/session/" + cookie,
                contentType: "application/json",
                dataType: 'json',
                timeout: 5000,
                success: function (response) {
                    if (response.status == "success" && response.data) {
                        var post = {
                            website: $("#user-website").val(),
                            bio: $("#user-bio").val(),
                        };

                        $.ajax({
                            type: "PUT",
                            url: "/data/update/user/" + response.data._id,
                            contentType: "application/json",
                            dataType: 'json',
                            data: JSON.stringify(post),
                            timeout: 5000,
                            success: function (response) {
                                window.location.replace("/users");
                            },
                            error: function (response) {
                                console.log(response);
                            }
                        })
                    } else {
                        console.log("error");
                    }
                },
                error: function (response) {
                    console.log(response);
                }
            });
        } else {
            //no session cookie exists
            console.log("error");
        }
    });

    //submit search

    $("#search-submit").on("click", function() {

        window.location.assign("/search/" + $("#search-term").val());

    });

    //facebook comments URL
    var url = document.URL;
    if (url.indexOf(("?")) >= 0) {
        url = url.slice(0, url.indexOf(("?"))); //if facebook adds arguments to url remove them
    }
    $('.fb-comments').attr("data-href", url);

    //save new category

    $("#cp-new-category-save").on("click", function() {

        //check field isnt empty

        if ($("#cp-new-category-name").val() != "") {
            console.log($("#cp-new-category-name").val());
            databasePost("category", {name: $("#cp-new-category-name").val()}, function (response) {
                if(response.status == "success") {
                    displayAlert("success", "New category successfully added.");
                } else {
                    throwError(response.data);
                }
            })
        }

    });

}

/**---------------------------------------------------------------------------------------------------------------------
 * Error Handling
 */

function throwError(error) {
    console.log(error);
    displayAlert("error", error.message);
}

/**---------------------------------------------------------------------------------------------------------------------
 * Visual Effects
 */
function displayAlert(type, msg) {
    $(".alert").css("display", "none"); //hide any existing alerts

    if (msg == "" || msg == undefined) {
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

function showPopup(type, content) {
    $("#screen-cover").fadeIn(200).click(function() {hidePopup()});
    $("#popup-box").fadeIn(200).css("display", "table");
}

function hidePopup() {
    $("#screen-cover, #popup-box").fadeOut(200, function() {
        $("#popup-box").css({"width": "560px", "height": "430px"}).html('<a href="javascript:void(0)"><img src="/img/facebook-login-button.png" id="facebook-login" onclick="facebookLogin()"></a>');
    });
}


/**---------------------------------------------------------------------------------------------------------------------
 * NProgress Code
 */
/* NProgress, (c) 2013, 2014 Rico Sta. Cruz - http://ricostacruz.com/nprogress
 * @license MIT */

;(function(root, factory) {

    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.NProgress = factory();
    }

})(this, function() {
    var NProgress = {};

    NProgress.version = '0.2.0';

    var Settings = NProgress.settings = {
        minimum: 0.08,
        easing: 'linear',
        positionUsing: '',
        speed: 200,
        trickle: true,
        trickleSpeed: 200,
        showSpinner: true,
        barSelector: '[role="bar"]',
        spinnerSelector: '[role="spinner"]',
        parent: 'body',
        template: '<div class="bar" role="bar"><div class="peg"></div></div><div class="spinner" role="spinner"><div class="spinner-icon"></div></div>'
    };

    /**
     * Updates configuration.
     *
     *     NProgress.configure({
   *       minimum: 0.1
   *     });
     */
    NProgress.configure = function(options) {
        var key, value;
        for (key in options) {
            value = options[key];
            if (value !== undefined && options.hasOwnProperty(key)) Settings[key] = value;
        }

        return this;
    };

    /**
     * Last number.
     */

    NProgress.status = null;

    /**
     * Sets the progress bar status, where `n` is a number from `0.0` to `1.0`.
     *
     *     NProgress.set(0.4);
     *     NProgress.set(1.0);
     */

    NProgress.set = function(n) {
        var started = NProgress.isStarted();

        n = clamp(n, Settings.minimum, 1);
        NProgress.status = (n === 1 ? null : n);

        var progress = NProgress.render(!started),
            bar      = progress.querySelector(Settings.barSelector),
            speed    = Settings.speed,
            ease     = Settings.easing;

        progress.offsetWidth; /* Repaint */

        queue(function(next) {
            // Set positionUsing if it hasn't already been set
            if (Settings.positionUsing === '') Settings.positionUsing = NProgress.getPositioningCSS();

            // Add transition
            css(bar, barPositionCSS(n, speed, ease));

            if (n === 1) {
                // Fade out
                css(progress, {
                    transition: 'none',
                    opacity: 1
                });
                progress.offsetWidth; /* Repaint */

                setTimeout(function() {
                    css(progress, {
                        transition: 'all ' + speed + 'ms linear',
                        opacity: 0
                    });
                    setTimeout(function() {
                        NProgress.remove();
                        next();
                    }, speed);
                }, speed);
            } else {
                setTimeout(next, speed);
            }
        });

        return this;
    };

    NProgress.isStarted = function() {
        return typeof NProgress.status === 'number';
    };

    /**
     * Shows the progress bar.
     * This is the same as setting the status to 0%, except that it doesn't go backwards.
     *
     *     NProgress.start();
     *
     */
    NProgress.start = function() {
        if (!NProgress.status) NProgress.set(0);

        var work = function() {
            setTimeout(function() {
                if (!NProgress.status) return;
                NProgress.trickle();
                work();
            }, Settings.trickleSpeed);
        };

        if (Settings.trickle) work();

        return this;
    };

    /**
     * Hides the progress bar.
     * This is the *sort of* the same as setting the status to 100%, with the
     * difference being `done()` makes some placebo effect of some realistic motion.
     *
     *     NProgress.done();
     *
     * If `true` is passed, it will show the progress bar even if its hidden.
     *
     *     NProgress.done(true);
     */

    NProgress.done = function(force) {
        if (!force && !NProgress.status) return this;

        return NProgress.inc(0.3 + 0.5 * Math.random()).set(1);
    };

    /**
     * Increments by a random amount.
     */

    NProgress.inc = function(amount) {
        var n = NProgress.status;

        if (!n) {
            return NProgress.start();
        } else if(n > 1) {
            return;
        } else {
            if (typeof amount !== 'number') {
                if (n >= 0 && n < 0.2) { amount = 0.1; }
                else if (n >= 0.2 && n < 0.5) { amount = 0.04; }
                else if (n >= 0.5 && n < 0.8) { amount = 0.02; }
                else if (n >= 0.8 && n < 0.99) { amount = 0.005; }
                else { amount = 0; }
            }

            n = clamp(n + amount, 0, 0.994);
            return NProgress.set(n);
        }
    };

    NProgress.trickle = function() {
        return NProgress.inc();
    };

    /**
     * Waits for all supplied jQuery promises and
     * increases the progress as the promises resolve.
     *
     * @param $promise jQUery Promise
     */
    (function() {
        var initial = 0, current = 0;

        NProgress.promise = function($promise) {
            if (!$promise || $promise.state() === "resolved") {
                return this;
            }

            if (current === 0) {
                NProgress.start();
            }

            initial++;
            current++;

            $promise.always(function() {
                current--;
                if (current === 0) {
                    initial = 0;
                    NProgress.done();
                } else {
                    NProgress.set((initial - current) / initial);
                }
            });

            return this;
        };

    })();

    /**
     * (Internal) renders the progress bar markup based on the `template`
     * setting.
     */

    NProgress.render = function(fromStart) {
        if (NProgress.isRendered()) return document.getElementById('nprogress');

        addClass(document.documentElement, 'nprogress-busy');

        var progress = document.createElement('div');
        progress.id = 'nprogress';
        progress.innerHTML = Settings.template;

        var bar      = progress.querySelector(Settings.barSelector),
            perc     = fromStart ? '-100' : toBarPerc(NProgress.status || 0),
            parent   = document.querySelector(Settings.parent),
            spinner;

        css(bar, {
            transition: 'all 0 linear',
            transform: 'translate3d(' + perc + '%,0,0)'
        });

        if (!Settings.showSpinner) {
            spinner = progress.querySelector(Settings.spinnerSelector);
            spinner && removeElement(spinner);
        }

        if (parent != document.body) {
            addClass(parent, 'nprogress-custom-parent');
        }

        parent.appendChild(progress);
        return progress;
    };

    /**
     * Removes the element. Opposite of render().
     */

    NProgress.remove = function() {
        removeClass(document.documentElement, 'nprogress-busy');
        removeClass(document.querySelector(Settings.parent), 'nprogress-custom-parent');
        var progress = document.getElementById('nprogress');
        progress && removeElement(progress);
    };

    /**
     * Checks if the progress bar is rendered.
     */

    NProgress.isRendered = function() {
        return !!document.getElementById('nprogress');
    };

    /**
     * Determine which positioning CSS rule to use.
     */

    NProgress.getPositioningCSS = function() {
        // Sniff on document.body.style
        var bodyStyle = document.body.style;

        // Sniff prefixes
        var vendorPrefix = ('WebkitTransform' in bodyStyle) ? 'Webkit' :
            ('MozTransform' in bodyStyle) ? 'Moz' :
                ('msTransform' in bodyStyle) ? 'ms' :
                    ('OTransform' in bodyStyle) ? 'O' : '';

        if (vendorPrefix + 'Perspective' in bodyStyle) {
            // Modern browsers with 3D support, e.g. Webkit, IE10
            return 'translate3d';
        } else if (vendorPrefix + 'Transform' in bodyStyle) {
            // Browsers without 3D support, e.g. IE9
            return 'translate';
        } else {
            // Browsers without translate() support, e.g. IE7-8
            return 'margin';
        }
    };

    /**
     * Helpers
     */

    function clamp(n, min, max) {
        if (n < min) return min;
        if (n > max) return max;
        return n;
    }

    /**
     * (Internal) converts a percentage (`0..1`) to a bar translateX
     * percentage (`-100%..0%`).
     */

    function toBarPerc(n) {
        return (-1 + n) * 100;
    }


    /**
     * (Internal) returns the correct CSS for changing the bar's
     * position given an n percentage, and speed and ease from Settings
     */

    function barPositionCSS(n, speed, ease) {
        var barCSS;

        if (Settings.positionUsing === 'translate3d') {
            barCSS = { transform: 'translate3d('+toBarPerc(n)+'%,0,0)' };
        } else if (Settings.positionUsing === 'translate') {
            barCSS = { transform: 'translate('+toBarPerc(n)+'%,0)' };
        } else {
            barCSS = { 'margin-left': toBarPerc(n)+'%' };
        }

        barCSS.transition = 'all '+speed+'ms '+ease;

        return barCSS;
    }

    /**
     * (Internal) Queues a function to be executed.
     */

    var queue = (function() {
        var pending = [];

        function next() {
            var fn = pending.shift();
            if (fn) {
                fn(next);
            }
        }

        return function(fn) {
            pending.push(fn);
            if (pending.length == 1) next();
        };
    })();

    /**
     * (Internal) Applies css properties to an element, similar to the jQuery
     * css method.
     *
     * While this helper does assist with vendor prefixed property names, it
     * does not perform any manipulation of values prior to setting styles.
     */

    var css = (function() {
        var cssPrefixes = [ 'Webkit', 'O', 'Moz', 'ms' ],
            cssProps    = {};

        function camelCase(string) {
            return string.replace(/^-ms-/, 'ms-').replace(/-([\da-z])/gi, function(match, letter) {
                return letter.toUpperCase();
            });
        }

        function getVendorProp(name) {
            var style = document.body.style;
            if (name in style) return name;

            var i = cssPrefixes.length,
                capName = name.charAt(0).toUpperCase() + name.slice(1),
                vendorName;
            while (i--) {
                vendorName = cssPrefixes[i] + capName;
                if (vendorName in style) return vendorName;
            }

            return name;
        }

        function getStyleProp(name) {
            name = camelCase(name);
            return cssProps[name] || (cssProps[name] = getVendorProp(name));
        }

        function applyCss(element, prop, value) {
            prop = getStyleProp(prop);
            element.style[prop] = value;
        }

        return function(element, properties) {
            var args = arguments,
                prop,
                value;

            if (args.length == 2) {
                for (prop in properties) {
                    value = properties[prop];
                    if (value !== undefined && properties.hasOwnProperty(prop)) applyCss(element, prop, value);
                }
            } else {
                applyCss(element, args[1], args[2]);
            }
        }
    })();

    /**
     * (Internal) Determines if an element or space separated list of class names contains a class name.
     */

    function hasClass(element, name) {
        var list = typeof element == 'string' ? element : classList(element);
        return list.indexOf(' ' + name + ' ') >= 0;
    }

    /**
     * (Internal) Adds a class to an element.
     */

    function addClass(element, name) {
        var oldList = classList(element),
            newList = oldList + name;

        if (hasClass(oldList, name)) return;

        // Trim the opening space.
        element.className = newList.substring(1);
    }

    /**
     * (Internal) Removes a class from an element.
     */

    function removeClass(element, name) {
        var oldList = classList(element),
            newList;

        if (!hasClass(element, name)) return;

        // Replace the class name.
        newList = oldList.replace(' ' + name + ' ', ' ');

        // Trim the opening and closing spaces.
        element.className = newList.substring(1, newList.length - 1);
    }

    /**
     * (Internal) Gets a space separated list of the class names on the element.
     * The list is wrapped with a single space on each end to facilitate finding
     * matches within the list.
     */

    function classList(element) {
        return (' ' + (element && element.className || '') + ' ').replace(/\s+/gi, ' ');
    }

    /**
     * (Internal) Removes an element from the DOM.
     */

    function removeElement(element) {
        element && element.parentNode && element.parentNode.removeChild(element);
    }

    return NProgress;
});

/**---------------------------------------------------------------------------------------------------------------------
 * Main
 */
$(document).ready(function() {
    //checkUserStatus();
    bindElements();
});