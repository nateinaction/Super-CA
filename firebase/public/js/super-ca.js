/*
 * Name: Super CA Mobile
 * Developer: Nate Gay (rngay@ncsu.edu)
 *
 * TOC:
 * 1. Set global variables
 * 2. Initialize
 * 3. Accepting user input from DOM
 * 4. Dynamic DOM manipulation
 * 5. Logic
 * 6. Firebase
 */

/*
 *
 * 1. Set global variables
 *
 */

// using v1 of database
var databaseVersion = 'v1',
	firebase = new Firebase('https://super-ca.firebaseio.com/' + databaseVersion),
	user,
	packages,
	deliveries,
	packageArray = [],
	deliveryArray = [],
	swiper = {};

/*
 *
 * 2. Initialize
 *
 */

$(document).ready(function(){
	firebaseAuthWatch();
	initializeUserInput();
});

/*
 *
 * 3. Accepting user input from DOM
 *
 */

// when user taps login button, authenticate
function userLogin() {
	$('#unauthenticated').on('click', '#loginButton', function () {
		authenticateFirebase();
	});
};

// when user types character into search field, run searchResultsHTML()
function userSearch() {
	$('#search-field').on('keyup', function () {
		var search = $('#search-field').val();
		if (search === '') {
			$('#search-results').empty();
		} else {
			console.log('user search is "' + search + '"');
			searchResultsHTML();
		};
	});
};

// when user taps search result, add to firebase.deliveries
function userTapResult() {
	$('#search-results').on('click', '.package', function () {
		var thisID = $(this).children('.packageID').text();
		packages.child(thisID).once('value', function(snapshot){
			deliveries.child(snapshot.key()).set(snapshot.val());
		});

		$(this).slideUp('fast', function() {$(this).remove();});

		if ($('#search-results').children().length === 0) {
			$('#search-field').val('');
		};
	});
};

// when user taps small logo, clear search field
function userTapLogo() {
	$('#logo-small').on('click', function () {
		console.log('search results cleared');
		$('#search-results').empty();
		$('#search-field').val('');
		$('html, body').animate({ scrollTop: 0 }, 'fast');
	});
};

// initialize user input after $(document).ready(function(){})
function initializeUserInput() {
	userLogin();
	userSearch();
	userTapResult();
	userTapLogo();
};

/*
 *
 * 4. Dynamic DOM manipulation
 *
 */

// on connect, display secure content
function authenticatedHTML() {
	$('#unauthenticated').hide();
	$('#authenticated').show();
};

// on disconnect, display login page
function unauthenticatedHTML() {
	$('#authenticated').hide();
	$('#unauthenticated').show();
};

// when character input is captured by userSearch() display results
function searchResultsHTML() {
	var response = packageArray.filter(searchFilter),
		html = '',
		addressee,
		id;

	$('#search-results').empty();
	for (var i = 0, n = response.length; i < n; i++) {
		addressee = response[i]['addressee'];
		id = response[i]['id'];

		// if package is not already in delivery list then display package in results
		if (deliveryArray.indexOf(id) === -1) {
			html = '<div class="package clickable-div">';
			html = html + '<p class="packageID">' + response[i]['id'] + '</p>';
			html = html + '<p class="addressee">' + response[i]['addressee'] + '</p>';
			html = html + '</div>';
			$('#search-results').prepend(html);
		};
	};
};

// add package to delivery list
function addPackageHTML(snapshot) {
	var id = snapshot.key(),
		addressee = snapshot.val().addressee,
		notes = snapshot.val().notes,
		url = snapshot.val().url,
		html = '';

	deliveryArray.push(id);

	if ($('#empty-delivery-list').length > 0) {
		$('#empty-delivery-list').remove();
	};

	html = html + '<div class="package swiper-container" id="' + id + '"><div class="swiper-wrapper">';
	html = html + '<div class="swiper-slide trash"><i class="fa fa-trash"></i></div>';
	html = html + '<div class="swiper-slide package-info">';
	html = html + '<span class="packageID">' + id + '</span>';
	html = html + '<span class="addressee">' + addressee + '</span>';
	html = html + '<span class="notes">' + notes + '</span>';
	html = html + '</div>';
	html = html + '<div class="swiper-slide complete"><i class="fa fa-check"></i></div>';
	html = html + '</div></div>';
	$('#delivery-list').prepend(html);

	// set height and initialize swiper
	setHeight(id);
	initializeSwiper(id);
};

// remove package from delivery list
function removePackageHTML(snapshot) {
	var id = snapshot.key();
	deliveryArray.splice(deliveryArray.indexOf(id), 1);
	$('#' + id).slideUp('fast', function() {
		$(this).remove();
		if ($('#delivery-list').children().length === 0) {
			$('#delivery-list').append('<h1 id="empty-delivery-list">No packages.</h1>');
		};
	});
};

// set dynamic element height for each package in deliveryArray, called by addPackageHTML()
function setHeight(id) {
	idHeight = $('#' + id + ' .packageid').outerHeight();
	addresseeHeight = $('#' + id + ' .addressee').outerHeight();
	notesHeight = $('#' + id + ' .notes').outerHeight();
	packageHeight = 24 + 4 + notesHeight; // vertical border of .package-info + 4 more (meh.)

	if (idHeight >= addresseeHeight) {
		packageHeight += idHeight;
	} else {
		packageHeight += addresseeHeight;
	};
	$('#' + id).height(packageHeight);
};

// initialize swiper for each package in deliveryArray, called by addPackageHTML()
function initializeSwiper(id) {
	swiper[id] = new Swiper('#' + id, {
		initialSlide: 1,
		observer: true,
		observeParents: true
	});
	swiper[id].on('SlideChangeEnd', function() {
		if (swiper[id].activeIndex === 0) {
			deliveries.child(id).remove();
		} else if (swiper[id].activeIndex === 2) {
			$('#' + id + ' .package-info').toggleClass('completed');
			$('#' + id + ' .trash').toggleClass('completed-border');
			$('#' + id + ' .complete').toggleClass('completed-border');

			swiper[id].slideTo(1);
		}
	});
};

function userEmailHTML(email) {
	$('#email-address').text(email);
};

/*
 *
 * 5. Logic
 *
 */

// return true if search appears in packageArray, called by searchResultsHTML()
function searchFilter(item) {
	var id = item['id'],
		addressee = item['addressee'].toLowerCase(),
		search = $('#search-field').val().toLowerCase(),
		regex = new RegExp('\\b' + search);

	if (id.match(regex) !== null || addressee.match(regex) !== null) {
		return true;
	} else {
		return false;
	};
};


/*
 *
 * 6. Firebase
 *
 */

function authenticateFirebase() {
	firebase.authWithOAuthRedirect('google', function(error) {
		if (error) {
			console.log('Authentication Failed!', error);
		};
	}, {scope: 'email'});
};

// on connect: create user profile info, set global vars packages and deliveries, run authenticatedHTML() and firebaseWatch()
// on disconnect: run unauthenticatedHTML()
// initialize firebase after $(document).ready(function(){}
function firebaseAuthWatch() {
	firebase.onAuth(function(authData) {
		if (authData) {
			console.log('firebase connected');
			user = firebase.child('users/' + authData.uid + '/info');
			packages = firebase.child('users/' + authData.uid + '/packages');
			deliveries = firebase.child('users/' + authData.uid + '/deliveries');

			// if there is no access to user's email address, force user to log out
			if (authData.google.email === undefined) {
				firebase.unauth();
			} else {
				authenticatedHTML();
				firebaseWatch();
				userEmailHTML(authData.google.email);
				updateUserInfo({name: authData.google.displayName, email: authData.google.email, avatar: authData.google.profileImageURL});
			};
		} else {
			console.log('firebase disconnected');
			unauthenticatedHTML();
		};
	});
};

// initialize firebase observers
function firebaseWatch() {
	packageAdded();
	packageRemoved();
	deliveryAdded();
	deliveryRemoved();
};

function updateUserInfo(userInfo) {
	user.update(userInfo);
};

// when package added to firebase.packages add to packageArray
function packageAdded() {
	packages.on('child_added', function(snapshot){
		var thisPackage = snapshot.val();
			thisPackage['id'] = snapshot.key();
		console.log('package', thisPackage['id'], 'added to firebase.packages');
		packageArray.push(thisPackage);
	});
};

// when package removed from firebase.packages remove from packageArray
function packageRemoved() {
	packages.on('child_removed', function(snapshot){
		var id = snapshot.key();
		for (thisPackage in packageArray) {
			console.log('package', thisPackage['id'], 'removed from firebase.packages');
			if (thisPackage['id'] === id) {
				packageArray.splice(id, 1);
			};
		};
	});
};

// when package added to firebase.deliveries run addPackageHTML()
function deliveryAdded() {
	deliveries.on('child_added', function(snapshot) {
		console.log('package', snapshot.key(), 'added to firebase.deliveries');
		addPackageHTML(snapshot);
	});
};

// when package removed from firebase.deliveries run removePackageHTML()
function deliveryRemoved() {
	deliveries.on('child_removed', function(snapshot) {
		console.log('package', snapshot.key(), 'removed from firebase.deliveries');
		removePackageHTML(snapshot);
	});
};