var client = new Usergrid.Client({
    URI: 'http://usergridstack.dnsdynamic.com:8080',
    orgName: 'deneme', //your orgname goes here (not case sensitive)
    appName: 'cowtip', //your appname goes here (not case sensitive)
    logging: true, //optional - turn on logging, off by default
    buildCurl: true //optional - turn on curl commands, off by default
});
var currentLocation;
var appUser;
var count;

$(document).ready(function () {

    $("#signup-form").on("submit", function (e) {
        e.preventDefault();
        var username = $("#username").val();
        var email = $("#email").val();
        var name = $("#name").val();
        var password = $("#password").val();

        var newuser = new Usergrid.Entity({'client':client, data:{'type':"users"}});
        newuser.set('username', username);
        newuser.set('name', name);
        newuser.set('email', email);
        newuser.set('password', password);
        newuser.save(function (err, retdata) {
            if(err) {
                console.log("Error in creating user");
            } else {
                console.log("User created");
                window.location = 'login.html';
            }
        });
    });

    $("#login-form").on("submit", function (e) {
        e.preventDefault();
        var username = $("#username").val();
        var password = $("#password").val();

        client.login(username, password, function (err, data) {
            if(err){
                console.log("Wrong username or password");
            } else {
                console.log("Logged in");
                window.location = 'index.html';
            }
        });
    });
    //I handle doing GPS on addForm display
    if ($("#addTipBtn").length === 1) {
        currentLocation = null;
        navigator.geolocation.getCurrentPosition(function (pos) {
            //store the long/lat
            currentLocation = {longitude: pos.coords.longitude, latitude: pos.coords.latitude};
            $("#addTipBtn").removeAttr("disabled");
        }, function (err) {
            //Since geolocation failed, we can't allow the user to submit
            doAlert("Sorry, but we couldn't find your location.\nYou may not post a restaurant review.");
        });

    }

    if ($("#addRestBtn").length === 1) {
        currentLocation = null;
        navigator.geolocation.getCurrentPosition(function (pos) {
            //store the long/lat
            currentLocation = {longitude: pos.coords.longitude, latitude: pos.coords.latitude};
            $("#addRestBtn").removeAttr("disabled");
        }, function (err) {
            //Since geolocation failed, we can't allow the user to submit
            doAlert("Sorry, but we couldn't find your location.\nYou may not add a restaurant.");
        });

    }

    $(document).on("click", "[data-id]", function (e) {
        e.preventDefault();
        var username = $(this).data("id");
        var unfollow = false;
        if($(this).hasClass("unfollowed")){
            unfollow = true;
        }
        client.getLoggedInUser(function (err, data, user){
            if(err){
                window.location = 'login.html';
            } else {
                if(client.isLoggedIn()){
                    appUser = user._data.username;
                    if(unfollow){
                        var options = {
                            method:'DELETE',
                            endpoint:'users/' + appUser + '/following/users/' + username
                        };
                        client.request(options, function (err, data) {
                            if(err){
                                console.log("Cannot unfollow user");
                            } else {
                                console.log("User unfollowed");
                                window.location = 'users.html';
                            }
                        });
                    } else {
                        var options = {
                            method:'POST',
                            endpoint:'users/' + appUser + '/following/users/' + username
                        };
                        client.request(options, function (err, data) {
                            if(err){
                                console.log("Cannot follow user");
                            } else {
                                console.log("User followed");
                                window.location = 'users.html';
                            }
                        });
                    }
                } else {
                    window.location = 'login.html';
                }
            }
        });
    });
    client.getLoggedInUser(function (err, data, user){
        if(err){
            //window.location = 'login.html';
        } else {
            appUser = user._data.username;
        }
    });
    $("#addtipForm").on("submit", function (e) {
        e.preventDefault();

        //get values
        var namerest = $("#namerest").val();
        var rate = $("#rate").val();
        var comments = $("#comments").val();

        //TBD: Validation
        var review = new Usergrid.Entity({'client':client,data:{'type':"tips"}});
        review.set('namerest', namerest);
        review.set('rate', rate);
        review.set('comments', comments);
        review.set('creator', appUser);
        review.save(function (err, retdata) {
            if (err) {
                console.log("Error saving");
            } else {
                console.log("Saved object");
                doAlert("Review Saved!", function () {
                    document.location.href = 'index.html';
                });
            }
        });
    });

    $("#addrestaurantForm").on("submit", function (e) {
        e.preventDefault();

        //get values
        var namerest = $("#namerest").val();

        //TBD: Validation
        var review = new Usergrid.Entity({'client':client,data:{'type':"restaurants"}});
        review.set('namerest', namerest);
        review.set('creator', appUser);
        review.set('location', {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude
        });
        review.save(function (err, retdata) {
            if (err) {
                console.log("Error saving");
            } else {
                console.log("Saved object");
                doAlert("Restaurant Saved!", function () {
                    document.location.href = 'index.html';
                });
            }
        });
    });

    var tipDisplay = $("#tipdisplay");

    if (tipDisplay.length > 0) {

        //Update status to let the user know we are doing important things. Really important.
        tipDisplay.html("Please stand by. Checking your location for nearby restaurants!");

        navigator.geolocation.getCurrentPosition(function (pos) {
            var myLocation = {latitude: pos.coords.latitude, longitude: pos.coords.longitude};
            //var lastWeek = new Date();
            //var lastWeek.setDate(lastWeek.getDate() - 7);
            //var ql = "select * where location within 16903 of " + myLocation.latitude + ", " + myLocation.longitude + " and created >= " + lastWeek.getTime() + " and creator = " + appUser};
            var ql = "select * where location within 169030 of " + myLocation.latitude + ", " + myLocation.longitude;
            var options = {
                type: 'restaurants',
                qs: {"ql": ql}
            };

            client.createCollection(options, function (err, reviews) {
                if (!err) {
                    renderResults(reviews, myLocation);
                }
            });
        }, function (err) {
            //Since geolocation failed, we can't allow the user to submit
            doAlert("Sorry, but we couldn't find your location.");
        }, {timeout: 20000, enableHighAccuracy: false});
    }
});

function renderResults(results, myLoc) {
    var tipDisplay = $("#tipdisplay");

    if (!results.hasNextEntity()) {
        tipDisplay.html("I'm sorry, but I couldn't find any restaurant within 30 miles and from the past 7 days.");

        return;
    }

    tipDisplay.html("Displaying restaurants within 30 miles of your location.");

    var map = L.map('map').setView([myLoc.latitude, myLoc.longitude], 8);
    var layerOpenStreet = new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 18, minZoom: 1});
    layerOpenStreet.addTo(map);

    while (results.hasNextEntity()) {
        var result = results.getNextEntity();
        var marker = L.marker([result.get('location').latitude, result.get('location').longitude], {
            restaurant: result
        }).addTo(map);
        marker.bindPopup("Restaurant: " + result.get('namerest'));

        marker.on('click', function(e) {
            var commentsContainer = $("#comments").hide();
            var followingList = [];

            jQuery.ajax({
                url: "http://usergridstack.dnsdynamic.com:8080/deneme/cowtip/users/me/following",
                async: false,
                data: {
                    access_token: client.getToken()
                },
                success:function (data){
                    jQuery.each(data.entities, function (i, val){
                        followingList.push(val.username);
                    });
                }
            });

            var ql = "select * where namerest = '" + e.target.options.restaurant.get('namerest') + "'";

            if (followingList.length) {
                ql += " and (creator = '" + followingList.join("' or creator = '") + "')";
            }

            var options = {
                type: 'tips',
                qs: {ql: ql}
            };

            client.createCollection(options, function (err, reviews) {
                if (err) {
                    alert("Error: " + err);

                    return;
                }

                if (!reviews.hasNextEntity()) {
                    return;
                }

                commentsContainer.show().find('blockquote').remove();

                var i = 0;

                while (reviews.hasNextEntity()) {
                    var review = reviews.getNextEntity();
                    var el = $('<blockquote>');

                    el.append("<p>Restaurant: " + review.get('namerest') + " <i> Comment:" + review.get('comments') + "</i><div class='Clear'>");

                    if( review.get('rate') == '1' )
                        el.append("<input class='star' type='radio' name='rate" + i + "' value='1' title='Worst' checked='checked' disabled='disabled'/>");
                    else el.append("<input class='star' type='radio' name='rate" + i + "' value='1' title='Worst' disabled='disabled'/>");
                    if( review.get('rate') == '2' )
                        el.append("<input class='star' type='radio' name='rate" + i + "' value='2' title='Bad' checked='checked' disabled='disabled'/>");
                    else el.append("<input class='star' type='radio' name='rate" + i + "' value='2' title='Bad' disabled='disabled'/>");
                    if( review.get('rate') == '3' )
                        el.append("<input class='star' type='radio' name='rate" + i + "' value='3' title='OK' checked='checked' disabled='disabled'/>");
                    else el.append("<input class='star' type='radio' name='rate" + i + "' value='3' title='OK' disabled='disabled'/>");
                    if( review.get('rate') == '4' )
                        el.append("<input class='star' type='radio' name='rate" + i + "' value='4' title='Good' checked='checked' disabled='disabled'/>");
                    else el.append("<input class='star' type='radio' name='rate" + i + "' value='4' title='Good' disabled='disabled'/>");
                    if( review.get('rate') == '5' )
                        el.append("<input class='star' type='radio' name='rate" + i + "' value='5' title='Best' checked='checked' disabled='disabled'/>");
                    else $("#rest-comments").append("<input class='star' type='radio' name='rate" + i + "' value='5' title='Best' disabled='disabled'/>");
                    el.append("</div></p> <small>User: " + review.get('creator')+ "</small>");

                    el.appendTo(commentsContainer);

                    $('.star').rating({
                        callback: function(value) {
                            $("#rate").val(value);
                        }
                    });

                    i++;
                }
            });
        });
    }

    var count = results._list.length;

    $("#likes").html("There " + (count > 1 ? 'are '+ count +' restaurants' : 'is only 1 restaurant') + " near you.");
}

//Wrapper for alert so I can dynamically use PhoneGap alert's on device
function doAlert(str, cb) {
    if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
        function alertDismissed() {
            // do something
        }
        navigator.notification.alert(
            str,  // message
            alertDismissed,         // callback
            "ERROR",            // title
            'DONE'                  // buttonName
        );
    } else {
        alert(str);
    }
}