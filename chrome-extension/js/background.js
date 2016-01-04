pageAction();
backgroundMessenger();

function backgroundMessenger() {
	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
		//console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
		if (request.message === 'getToken') {
			chrome.identity.getAuthToken({'interactive': true}, function(token) {
				console.log('responding with token');
				sendResponse(token);
			});
			return true;
		} else if (request.message === 'getEmail') {
			chrome.identity.getProfileUserInfo(function(userInfo) {
				console.log('responding with email');
				sendResponse(userInfo.email);
			});
			return true;
		};
	});
};

// shows "page action" i.e. icon in address bar
function pageAction() {
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
};