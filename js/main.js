var client = new Usergrid.Client({
    URI: 'http://usergridstack.dnsdynamic.com:8080',
    orgName: 'deneme', //your orgname goes here (not case sensitive)
    appName: 'cowtip', //your appname goes here (not case sensitive)
    logging: true, //optional - turn on logging, off by default
    buildCurl: true //optional - turn on curl commands, off by default
});


var currentLocation;

$(document).ready(function () {

    //I handle doing GPS on addForm display
    if ($("#addTipBtn").length === 1) {
        currentLocation = null;
        navigator.geolocation.getCurrentPosition(function (pos) {
            //store the long/lat
            currentLocation = {longitude: pos.coords.longitude, latitude: pos.coords.latitude};
            $("#addTipBtn").removeAttr("disabled");
        }, function (err) {
            //Since geolocation failed, we can't allow the user to submit
            doAlert("Sorry, but we couldn't find your location.\nYou may not post a cow tip.");
        });

    }

    $("#addtipForm").on("submit", function (e) {
        e.preventDefault();

        //get values
        var numcows = $("#numcows").val();
        var howdangerous = $("#howdangerous").val();
        var comments = $("#comments").val();

        //TBD: Validation
        var tip = new Usergrid.Entity({'client':client,data:{'type':"tips"}});
        tip.set('numcows', numcows);
        tip.set('howdangerous', howdangerous);
        tip.set('comments', comments);
        tip.set('location', {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude
        });
        tip.save(function (err, retdata) {
            if (err) {
                console.log("Error saving");
            } else {
                console.log("Saved object");
                doAlert("Tip Saved!", function () {
                    document.location.href = 'index.html';
                });
            }
        });
    });

    if ($("#tipdisplay").length === 1) {

        //Update status to let the user know we are doing important things. Really important.
        $("#tipdisplay").html("Please stand by. Checking your location for nearby restaurants!");

        navigator.geolocation.getCurrentPosition(function (pos) {

            var myLocation = {latitude: pos.coords.latitude, longitude: pos.coords.longitude};
            //query.near("location", myLocation);
            //Only within 30 miles
            //only within last week
            var lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            var options = {
                type: 'tips',
                qs: {"ql": "select * where location within 16903 of " + myLocation.latitude + ", " + myLocation.longitude + " and created >= " + lastWeek.getTime()}
            }

            client.createCollection(options, function (err, tips) {
                if (err) {
                    alert("Error: " + err);
                } else {
                    //Success - new collection created
                    //we got the dogs, now display the Entities:
                    renderResults(tips, myLocation);

                }
            });
        }, function (err) {
            //Since geolocation failed, we can't allow the user to submit
            doAlert("Sorry, but we couldn't find your location.");
        }, {timeout: 20000, enableHighAccuracy: false});
    }
});

function renderResults(results, myLoc) {
    console.log("renderResults: " + results.length);

    if (results.hasNextEntity()) {
        $("#tipdisplay").html("Displaying restaurants within 30 miles of your location.");

        var map = L.map('map').setView([myLoc.latitude, myLoc.longitude], 8);
        var layerOpenStreet = new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 18, minZoom: 1, attribution: 'Map data &copy; 2012 OpenStreetMap'}).addTo(map);
        var dangerLevels = ["Totally Safe", "Some Risk", "Farmer with Shotgun!"];

        while (results.hasNextEntity()) {
            var result = results.getNextEntity();
            var marker = L.marker([result.get('location').latitude, result.get('location').longitude]).addTo(map);
            var markerLabel = "Restaurant: " + result.get('numcows') + "<br/>Rate: " + result.get('howdangerous') + "/5";
            if (result.get('comments') && result.get('comments').length) markerLabel += "<br>" + result.get('comments');
            marker.bindPopup(markerLabel);
        }
    } else {
        $("#tipdisplay").html("I'm sorry, but I couldn't find any tips within 30 miles and from the past 7 days.");
    }
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