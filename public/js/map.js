$(init);

var currentTrip;

function init(){
  $(".confirm-dest-button").on("click", getNearbyPlaces);

  var moveLeft = 20;
  var moveDown = 10;

  $("body").on('mouseenter', ".place-hours-label", function(event) {
    $(this).next().show();
      // .css('top', e.pageY + moveDown)
      // .css('left', e.pageX + moveLeft)
      // .appendTo('body');
  }).on('mouseleave', ".place-hours-label", function( event ) {
    $(this).next().hide();
  });


  $("body").on("click", ".add-place-button", addPlace);
  $("body").on("click", ".remove-place-button", removePlace);

}


function addPlace() {
  var selectedPlaceId = $(this).data('place-id');

  $(this).parent().toggleClass('added-place');

  var addPlaceButton = $(".add-place-button[data-place-id='" + selectedPlaceId + "']")
  addPlaceButton.toggleClass('hidden-button');

  $.ajax({
    url: 'http://localhost:3000/trips/' + currentTrip + '/places',
    type: 'post',
    data: { place: {
      "place_id": selectedPlaceId,
      "trip": currentTrip
      }
    }
  }).done(function(place) {
    var removePlaceButton = $(".remove-place-button[data-place-id='" + selectedPlaceId + "']");
    removePlaceButton.data('place-db-id', place._id);
    removePlaceButton.toggleClass('hidden-button');

    //removeButton.css('display','inline-block');
  });
}


function removePlace() {
  var selectedPlaceDbId = $(this).data('place-db-id');
  var selectedPlaceId = $(this).data('place-id');

  $(this).parent().toggleClass('added-place');

  var removePlaceButton = $(".remove-place-button[data-place-id='" + selectedPlaceId + "']");
  removePlaceButton.toggleClass('hidden-button');

  $.ajax({
    url: 'http://localhost:3000/trips/' + currentTrip + '/places/' + selectedPlaceDbId,
    type: 'delete'
  }).done(function(place) {

    var addPlaceButton = $(".add-place-button[data-place-id='" + selectedPlaceId + "']");
    addPlaceButton.toggleClass('hidden-button');

  });
}


var markers = [];



function initMap() {
  var map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: -33.8688, lng: 151.2195},
    zoom: 13,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  // Create the search box and link it to the UI element.
  var input = document.getElementById('pac-input');
  var searchBox = new google.maps.places.SearchBox(input);
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

  // Bias the SearchBox results towards current map's viewport.
  map.addListener('bounds_changed', function() {
    searchBox.setBounds(map.getBounds());
  });

  // [START region_getplaces]
  // Listen for the event fired when the user selects a prediction and retrieve
  // more details for that place.
  searchBox.addListener('places_changed', function() {
    var places = searchBox.getPlaces();

    if (places.length == 0) {
      return;
    }

    // Clear out the old markers.
    markers.forEach(function(marker) {
      marker.setMap(null);
    });
    markers = [];

    // For each place, get the icon, name and location.
    var bounds = new google.maps.LatLngBounds();
    places.forEach(function(place) {
      var icon = {
        url: place.icon,
        size: new google.maps.Size(71, 71),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(17, 34),
        scaledSize: new google.maps.Size(25, 25)
      };

      // Create a marker for each place.
      markers.push(new google.maps.Marker({
        map: map,
        icon: icon,
        title: place.name,
        position: place.geometry.location
      }));

      if (place.geometry.viewport) {
        // Only geocodes have viewport.
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }
    });
    map.fitBounds(bounds);

    printPos();
  });
  // [END region_getplaces]

}

function printPos() {
	console.log("Lat: " + markers[0].position.lat());
	console.log("Long: " + markers[0].position.lng());
}

function getLat() {
	return markers[0].position.lat();
}

function getLng() {
	return markers[0].position.lng();
}



// GET STRING TITLE FROM GOOGLE AUTOCOMPLETE OBJECT

function getTitle() {
  return markers[0].title;
}


function getNearbyPlaces() {
  $("#map").css('display','none');
  $('.confirm-dest-button').remove();

  // Calling function to create trip once the user clicks confirm destination button
  createTrip();

  // Coordinates of destination
  var lat = getLat();
	var lng = getLng();

	var dest = {lat: lat, lng: lng}; 

	// 'service' shouldn't be global
  service = new google.maps.places.PlacesService(map);
	  service.nearbySearch({
	    location: dest,
	    radius: 500
	    //types: ['store']
	  }, callback);
}


// CREATING TRIP WITH INFO FROM GOOGLE AUTOCOMPLETE

function createTrip() {
  event.preventDefault();
  var currentUserId = getCurrentUserId();

  $.ajax({
    url: 'http://localhost:3000/trips',
    type: 'post',
    data: { trip: {
      "destination": getTitle(),
      "longitude" : getLng(),
      "latitude" : getLat(),
      "user" : currentUserId
    }
    }
    }).done(function(trip) {
      currentTrip = trip._id;
      $("#trips-list").empty();
      populateTripsList();
    });
}


function callback(results, status) {
  if (status === google.maps.places.PlacesServiceStatus.OK) {

    var tileContent = "<div class='row'>";

    // Add skeleton
    for (i=0; i<10; i++) {

      tileContent += "<div class='col-xs-4 suggestion-tile' data-grid-id='" + i + "'>";

      tileContent += "<h3 class='place-name' data-grid-id='" + i + "'></h3>";

      tileContent += "<img class='place-photo' data-grid-id='" + i + "'>";

      tileContent += "<p class='place-vicinity' data-grid-id='" + i + "'></p>";

      tileContent += "<p class='place-rating' data-grid-id='" + i + "'></p>";

      tileContent += "<a class='place-website' data-grid-id='" + i + "'></a><br>";

      // closing tile div
      tileContent += "</div>";

      if ((((i+1) % 3) == 0 )) {
        tileContent += "</div><div class='row'>";
      }

    }

    $("#suggestions").append(tileContent);


    for (i = 0; i < 10; i++) {

      // add delay to this
      service.getDetails(results[i], (function(j) { return function(result, status) {
        if (status !== google.maps.places.PlacesServiceStatus.OK) {
          console.error(status);
          return;
        }

        var tileContent = "";

        $(".place-name[data-grid-id='" + j + "']").text(result.name);

        var place_id = result.place_id

        var photos = result.photos
        if(typeof photos !== 'undefined'){
          var photo = photos[0].getUrl({'maxWidth': 180, 'maxHeight': 150});
          $(".place-photo[data-grid-id='" + j + "']").attr('src', photo);
        } else {
          $(".place-photo[data-grid-id='" + j + "']").attr('src', 'http://i.imgur.com/DwMWyOB.png');
          $(".place-photo[data-grid-id='" + j + "']").css('max-width', 180);
        }

        var vicinity = result.vicinity;
        if(typeof vicinity !== 'undefined'){
          $(".place-vicinity[data-grid-id='" + j + "']").text(vicinity);
        }

        var rating = result.rating;
        if(typeof rating !== 'undefined'){
          $(".place-rating[data-grid-id='" + j + "']").text("Rating: " + rating);
        }

        var website = result.website;
        if(typeof website !== 'undefined'){
          $(".place-website[data-grid-id='" + j + "']").text('Website');
          $(".place-website[data-grid-id='" + j + "']").attr('href',website);
        }

        
        var openingHours = result.opening_hours
        if(typeof openingHours !== 'undefined'){
          var hoursHTML = "<a href='#' class='place-hours-label' data-grid-id='" + j + "'>Opening Hours</a>";

          hoursHTML += "<div class='place-hours-pop-up'>";

          openingHours.weekday_text.forEach(function(day) {
            hoursHTML += "<p>" + day + "</p>";
          });

          hoursHTML += "</div><br>";

          $(".place-website[data-grid-id='" + j + "']").after(hoursHTML);

        }

        var addButton = "<input type='button' class='add-place-button' data-place-id='" + place_id + "'value='Add'>"
        var removeButton = "<input type='button' class='remove-place-button hidden-button' data-place-id='" + place_id + "'value='Remove'>";

        $(".suggestion-tile[data-grid-id='" + j + "']").append(addButton);
        $(".suggestion-tile[data-grid-id='" + j + "']").append(removeButton); 


      }})(i));
        	
    }

  }
}









