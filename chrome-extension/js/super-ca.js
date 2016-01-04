/*
 * Name: Super CA Chrome Extension
 * Developer: Nate Gay (rngay@ncsu.edu)
 *
 * TOC:
 * 1. Set global variables
 * 2. Initial DOM setup
 * 3. Reading information from DOM
 * 4. Dynamic DOM manipulation
 * 5. Firebase API calls
 * 6. Chrome API calls
 */

/*
 *
 * 1. Set global variables
 *
 */

// using version 1 of Super CA database
var databaseVersion = 'v1',
	firebase = new Firebase('https://super-ca.firebaseio.com/' + databaseVersion),
	user,
	packages,
	deliveries,
	refreshTimer;

/*
 *
 * 2. Initial DOM setup
 *
 */

function setupSuperCA() {
	if ($('h1').text() === 'View New Packages' && $('#view_new_packages_not_delivered_wrapper').length > 0) { // or on the package log
		setupPackageLog();
		firebaseAuthWatch();
	} else if ($('h1').text() === 'Deliver Package' && $('#deliver_package').length > 0) { // or on deliver package screen
		setupDeliveryPage();
	} else if ($('h1').text() === 'View New Packages' && $('#hub').length > 0) { // or logging into packtrack
		setupLoginSelector();
	};
};
setupSuperCA();

function setupPackageLog() {
	$.get(chrome.extension.getURL('views/deliveries_list.html'), function(htmlDoc) {
		$('#view_new_packages_not_delivered_wrapper').prepend(htmlDoc);
	});
};

function setupLoginSelector() {
	$('#hub > [value="Gray Hall Service Desk"]').prop('selected', true);
};

function setupDeliveryPage() {
	var studentName = $('#deliver_package > table > tbody > tr:nth-child(4) > td:nth-child(2)').text(),
		nameArray = studentName.split(' '),
		firstName = nameArray.shift(),
		lastName = nameArray.join(' ');
	$('#first').val(firstName);
	$('#last').val(lastName);
};


/*
 *
 * 3. Reading information from DOM
 *
 */

// scan package log, upload new packages to firebase, remove delivered packages from firebase
function scanPackageLog() {
	var id = '',
		newPackagesArray = [],
		newPackagesObject = {};

	console.log('scanning package log');
	for (var n = 1, i = $('#view_new_packages_not_delivered > tbody > tr').length; n <= i; n++) {
		id = $('#view_new_packages_not_delivered > tbody > tr:nth-child(' + n + ') > td:nth-child(1)').text();
		newPackagesObject[id] = {
			'notes': $('#view_new_packages_not_delivered > tbody > tr:nth-child(' + n + ') > td:nth-child(5)').text(),
			'addressee': $('#view_new_packages_not_delivered > tbody > tr:nth-child(' + n + ') > td:nth-child(6)').text(),
			'url': 'https://housing.ncsu.edu/apps/packtrack/deliver.php?packageID=' + id
		};
		newPackagesArray.push(id);
	};
	addPackages(newPackagesObject);
	removePackages(newPackagesArray);
};

/*
 *
 * 4. Dynamic DOM manipulation
 *
 */

// refresh package log every minute, then rescan package log, called by global variable 'refresh'
function refreshList() {
	var url = 'https://housing.ncsu.edu/apps/packtrack/view_new.php?hub=Gray%20Hall%20Service%20Desk',
		str = '';

	$.get(url, function(data) {
		if (data.includes('#view_new_packages_not_delivered')) {
			// update table with new data
			str = $(data).filter('#view_new_packages_not_delivered')[0].innerHTML;
			$('#view_new_packages_not_delivered').html(str);
			// rescan package log
			scanPackageLog();
			console.log('table refreshed from packtrack');
		} else {
			console.log('table refresh could not be fetched from packtrack');
		};
	});
};

function addDeliveryHTML(id, notes, addressee, url) {
	var html = '<tr id="super-ca-id-' + id + '"><td>' + id + '</td><td>' + notes + '</td><td>' + addressee + '</td><td><a href="' + url + '">Deliver</a></td>';
	$('#super-ca-deliveries-list > tbody').append(html);
};
function removeDeliveryHTML(id) {
	$('#super-ca-id-' + id).remove();
};

function userEmailHTML(email) {
	$('#super-ca-email').text(email);
};

/*
 *
 * 5. Firebase
 *
 */

// called from setupSuperCA(), authenticate with firebase from google account info sent from background.js
function authenticateFirebase() {
	if (!firebase.getAuth()) {
		chromeGetToken(function(token) {
			// authenticates with firebase
			firebase.authWithOAuthToken('google', token, function(error, authData) {
				if (error) {
					console.log('Login Failed!', error);
				} else {
					console.log('Authenticated successfully with payload:', authData);
				};
			});
		});	
	};	
};

// on connect, define firebase.packages and firebase.deliveries, watch for changes to firebase, scan the package log, setup refresh timer
// on disconnect, stop refresh timer and attempt to reauthenticate
function firebaseAuthWatch() {
	firebase.onAuth(function(authData) {
		if (authData) {
			console.log('firebase connected');
			user = firebase.child('users/' + authData.uid + '/info');
			packages = firebase.child('users/' + authData.uid + '/packages');
			deliveries = firebase.child('users/' + authData.uid + '/deliveries');
			firebaseWatch();
			scanPackageLog();
			chromeGetEmail();
			updateUserInfo({name: authData.google.displayName, avatar: authData.google.profileImageURL });
			refreshTimer = setInterval(refreshList, 60000);
		} else {
			console.log('firebase disconnected');
			clearInterval(refreshTimer);
			authenticateFirebase();
		};
	});
};

function updateUserInfo(userInfo) {
	user.update(userInfo);
};

// when package is added to firebase.deliveries, run addDeliveryHTML()
function deliveryAdded () {
	deliveries.on('child_added', function(snapshot) {
		var id = snapshot.key(),
			notes = snapshot.val().notes,
			addressee = snapshot.val().addressee,
			url = snapshot.val().url;
		console.log('package', id, 'added to firebase.deliveries');
		addDeliveryHTML(id, notes, addressee, url);
	});
};

// when package is removed from firebase.deliveries, run removeDeliveryHTML()
function deliveryRemoved() {
	deliveries.on('child_removed', function(snapshot) {
		var id = snapshot.key();
		console.log('package', id, 'removed from firebase.deliveries');
		removeDeliveryHTML(id);
	});
};

// post to console log when package is added to firebase.packages
function packageAdded() {
	packages.on('child_added', function(snapshot) {
		var id = snapshot.key();
		console.log('package', id, 'added to firebase.packages');
	});
};

// if a package is in firebase.deliveries when it is removed from firebase.packages then remove it from firebase.deliveries 
function packageRemoved() {
	packages.on('child_removed', function(snapshot) {
		var id = snapshot.key(),
			deliveryArray = [];

		console.log('package', id, 'removed from firebase.packages');
		deliveries.once('value', function(snapshot) {
			for (delivery in snapshot.val()) {
				deliveryArray.push(delivery);
			};
			if (deliveryArray.indexOf(id) !== -1) {
				deliveries.child(id).remove();
			};
		})
	});
};

// empty delivery table before watching for firebase changes
function firebaseWatch() {
	$('#super-ca-deliveries-list > tbody').empty();
	deliveryAdded();
	deliveryRemoved();
	packageAdded();
	packageRemoved();
};

// add all packages in the object to firebase.packages
function addPackages(newPackagesObject) {
	packages.update(newPackagesObject);
};

// any packages not in the latest scan will be removed from firebase.packages
function removePackages(newPackagesArray) {
	packages.once('value', function(snapshot) {
		for (id in snapshot.val()) {
			if (newPackagesArray.indexOf(id) === -1) {
				console.log('removed package', id, 'from firebase.packages');
				packages.child(id).remove();
			};
		};
	});
};

/*
 *
 * 6. Chrome API calls
 *
 */

// messages background page for access to google oAuth token, returns token
function chromeGetToken(callback) {
	chrome.runtime.sendMessage({message: 'getToken'}, function(token) {
		console.log('requesting token from background page')
		callback(token);
	});
};

// messages background page for access to google user email
function chromeGetEmail() {
	chrome.runtime.sendMessage({message: 'getEmail'}, function(email) {
		console.log('requesting email from background page')
		updateUserInfo({'email': email});
		userEmailHTML(email)
	});
};