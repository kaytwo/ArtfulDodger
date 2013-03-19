// Render Multiple URLs to file
phantom.injectJs("resque.js");

var system = require('system'),
    fs = require('fs');

/**
 * Render given urls
 * @param array of URLs to render
 * @param callbackPerUrl Function called after finishing each URL, including the last URL
 * @param callbackFinal Function called after finishing everything
 */

function RenderUrlsToFile(callbackPerUrl, callbackFinal) {
  console.log("rendering.");
	var urlIndex = 0, // only for easy file naming
    	webpage = require('webpage'),
		page = webpage.create();
	var getFilename = function() { return 'rendermulti-' + urlIndex + '.png'; }
	var next = function(status, url, file) {
		// page.close();
		callbackPerUrl(status, url, file);
		retrieve();
	}
	var retrieve = function() {
    console.log("popping");
    queue.pop("crawlqueue",function(url){
      console.log("popped.");
      // todo: check for nil, this might be sufficient?
      if (url){
        console.log("got something: " + url);
        if ('url' in url) {
          console.log("got url");
          urlIndex++;
          // page = webpage.create();
          page.viewportSize = { width: 800, height : 600 };
          page.settings.loadImages = false;
          page.settings.userAgent = "WEBKIT YOU GUISE";
          page.onConsoleMessage = function(msg) {};
          page.onError = function(msg,trace){};
          page.open(url['url'], function(status) {
            console.log("load finished");
            page.evaluate(function() { document.body.bgColor = 'white';});
            var file = getFilename();
            console.log("load finished");

            if ( status === "success") {
              console.log("load finished successfully");
              window.setTimeout(function() {
                page.render(file);
                next(status, url, file);
               }, 250);
            } else {
              console.log("load failed");
              next(status, url, file);
            }
          });
        }
        else{
          console.log("discarding garbage from queue.");
          // retrieve();
        }
      }
      else {
          console.log("got nothing, finishing");
          page.close();
          callbackFinal();
      }
    });
	}
  // todo: take a breather and reboot the webpage if urlIndex % 100 = 99
  console.log("starting retrieve");
	retrieve();
}

function work(status, url, file){
  console.log("working");
	if ( status !== "success") {
		console.log("Unable to render '" + url + "'");
	} else {
		console.log("Rendered '" + url + "' at '" + file + "'");
	}
}

function waitrepeat(){
  console.log("exhausted queue. sleeping for it to refill");
  setTimeout(function(){RenderUrlsToFile(work,waitrepeat);},5000);
}

function startwork(resque) {
  RenderUrlsToFile(work, waitrepeat);
}

var queue = new Resque("localhost","7379",startwork);
// RenderUrlsToFile(arrayOfUrls, work , waitrepeat);
