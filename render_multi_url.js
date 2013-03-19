// Render Multiple URLs to file

var system = require('system'),
    fs = require('fs');

/**
 * Render given urls
 * @param array of URLs to render
 * @param callbackPerUrl Function called after finishing each URL, including the last URL
 * @param callbackFinal Function called after finishing everything
 */
function RenderUrlsToFile(urls, callbackPerUrl, callbackFinal) {
	var urlIndex = 0, /* only for easy file naming */
    	webpage = require('webpage'),
		page = webpage.create();
	var getFilename = function() { return 'rendermulti-' + system.args[1].replace('in','out') + '-' + urlIndex + '.png'; }
	var next = function(status, url, file) {
		// page.close();
		callbackPerUrl(status, url, file);
		retrieve();
	}
	var retrieve = function() {
		if (urls.length > 0) {
			url = urls.shift();
			urlIndex++;
			// page = webpage.create();
			page.viewportSize = { width: 800, height : 600 };
      page.settings.loadImages = false;
			page.settings.userAgent = "WEBKIT YOU GUISE";
      page.onConsoleMessage = function(msg) {};
      page.onError = function(msg,trace){};
			page.open(url, function(status) {
        page.evaluate(function() { document.body.bgColor = 'white';});
				var file = getFilename();
				if ( status === "success") {
					window.setTimeout(function() {
						page.render(file);
						next(status, url, file);
				   }, 250);
				} else {
					next(status, url, file);
				}
			});
		} else {
			callbackFinal();
		}
	}
	retrieve();
}

var arrayOfUrls;
if ( system.args.length > 1 ) {
   fd = fs.open(system.args[1],'r');
   arrayOfUrls = fd.read().split("\n");
    // arrayOfUrls = Array.prototype.slice.call(system.args, 1);
} else {
    // Default (no args passed)
    console.log("Usage: phantomjs render_multi_url.js [domain.name1, domain.name2, ...]");
    arrayOfUrls = [
      'http://www.google.com',
      'http://www.bbc.co.uk',
      'http://www.phantomjs.org'
    ];
}
var i = 0;
setInterval(function(){
  arrayOfUrls.push('http://ckanich.uicbits.net/?new=' + i); i++},500);

function work(status, url, file){
	if ( status !== "success") {
		console.log("Unable to render '" + url + "'");
	} else {
		console.log("Rendered '" + url + "' at '" + file + "'");
	}
}

function waitrepeat(){
  console.log("exhausted queue. sleeping for it to refill");
  setTimeout(function(){RenderUrlsToFile(arrayOfUrls,work,waitrepeat);},5000);
}

RenderUrlsToFile(arrayOfUrls, work , waitrepeat);
