/*
var ref = new Firebase("https://super-ca.firebaseio.com");

chrome.identity.onSignInChanged.addListener(function(account, state) {
	if (state === true) {
		console.log("user logged in");
	} else {
		console.log("user logged out");
	};
});

chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
	if (token === undefined) {
		console.log("user not logged in");
	} else {
		console.log("user logged in");
		console.log(token);
		ref.authWithOAuthToken("google", token, function(error, authData) {
			if (error) {
				console.log("Login Failed!", error);
			} else {
				console.log("Authenticated successfully with payload:", authData);
			};
		});
	};
});
*/

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    //console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
    if (request.message == "getToken") {
    	chrome.identity.getAuthToken({'interactive': true}, function(token) {
    		//console.log(token);
    		sendResponse(token);
    	});
    	return true;
    };
});

/*
// I would like to this as a way to detect logged in status
chrome.identity.getProfileUserInfo(function(data) {
	if (data.id === undefined) {
		console.log(data.id);
	} else {
		console.log(data.id);
	};
});
*/

// shows "page action" e.g. icon in address bar
chrome.runtime.onInstalled.addListener(function() {
	chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
		chrome.declarativeContent.onPageChanged.addRules([
		{
			conditions: [
				new chrome.declarativeContent.PageStateMatcher({
					pageUrl: { urlContains: 'housing.ncsu.edu/apps/packtrack' },
				})
			],
			actions: [ new chrome.declarativeContent.ShowPageAction() ]
		}
		]);
	});
});