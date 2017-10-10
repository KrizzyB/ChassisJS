function appInit() {
    /**---------------------------------------------------------------------------------------------------------------------
     * Facebook Login Code
     */

    window.fbAsyncInit = function() {   //on page load
        FB.init({
            appId      : Config.facebookAppID,
            cookie     : true,  // enable cookies to allow the server to access
                                // the session
            xfbml      : true,  // parse social plugins on this page
            version    : 'v2.8' // use graph api version 2.8
        });

        FB.getLoginStatus(function(response) {
            statusChangeCallback(response);
        });

    };

// handle facebook response

    function statusChangeCallback(response) {
        if (response.status === 'connected') {  // logged in
            FB.api('me?fields=picture.height(200),first_name,last_name,email', function(response) {
                console.log(response);
                databaseGet("users", "facebook", response.id, function(data) {
                    if(data.response.length == 0) { //user's facebook is not associated with an account on this site
                        databaseGet("users", "email", response.email, function(data) {
                            if(data.response.length == 0) { //user does not exist on site
                                //ask to create a username
                                showPopup();
                                $("#screen-cover").unbind("click"); //prevent user from dismissing popup at this stage
                                $("#popup-box").css({"width": "560px", "height": "430px"}).html(    //display username dialogue
                                    '<img src="' + response.picture.data.url + '">\
                                <h2>Welcome ' + response.first_name + ' ' + response.last_name + '</h2>\
                                <p>Please enter a unique username to use on this site:</p>\
                                <label for="username">Username: </label><input type="text" name="username" id="username"> <br>\
                                <button type="button" onclick="newFacebookUser(' + "'" + response.email + "','" + response.first_name + "','" + response.last_name + "','" + response.picture.data.url + "','" +  response.id + "')" + '">Done</button>'
                                )
                            }
                        })
                    } else {
                        //log in
                        hidePopup();
                    }
                })
            });
        } else if (response.status === 'not_authorized') {  //logged in but not connected to this site
            console.log(response);
        } else {    //not logged into facebook
            console.log(response);
        }
    }

// Load the SDK asynchronously
    (function(d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s); js.id = id;
        js.src = "//connect.facebook.net/en_US/sdk.js";
        fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));


//Login to Facebook
    function facebookLogin() {
        $("#popup-box").css({"width": "200px", "height": "200px"}).html("<img src=\"img/facebook-loading.gif\" class='centre'>");  //change login box to loading

        FB.login(function(response) {
                if (response.authResponse) {
                    statusChangeCallback(response);
                } else {
                    $("#popup-box").html("<img src=\"img/facebook-error.gif\" class='centre'>");  //display error icon
                    setTimeout(function() {
                        hidePopup();
                    }, 2000);
                }
            },
            {
                scope: 'public_profile,email'
            }
        );
    }

//Create new facebook user
    function newFacebookUser(email, firstName, secondName, img, facebookID) {
        var postData = {"username": $("#username").val(), "email": email, "firstName": firstName, "secondName": secondName, "img": img, "facebookID": facebookID};
        $("#popup-box").css({"width": "200px", "height": "200px"}).html("<img src=\"img/facebook-loading.gif\" class='centre'>");  //change login box to loading
        console.log(postData);
        databasePost("users", postData, function() {
            hidePopup();
        })
    }
}