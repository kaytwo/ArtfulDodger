// Render Multiple URLs to file
phantom.injectJs("resque.js");

var heartbeat = 1,
    lastheartbeat = 0;
var system = require('system'),
    fs = require('fs');
/**
 * Render given urls
 * @param array of URLs to render
 * @param callbackPerUrl Function called after finishing each URL, including the last URL
 * @param callbackFinal Function called after finishing everything
 */

function RenderUrlsToFile(callbackPerUrl, callbackFinal) {
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
    heartbeat++;
    queue.pop(inq,function(url){
      if (url){
        if ('url' in url) {
          urlIndex++;
          // page = webpage.create();
          page.viewportSize = { width: 800, height : 600 };
          page.settings.loadImages = false;
          page.settings.userAgent = "WEBKIT YOU GUISE";
          page.onConsoleMessage = function(msg) {};
          page.onError = function(msg,trace){};
          page.open(url['url'], function(status) {
            // page.evaluate(function() { document.body.bgColor = 'white';});
            var file = getFilename();
            if ( status === "success") {
              // todo: maybe take a breather and reboot the webpage if urlIndex % 100 = 99
              window.setTimeout(function() {
                renderedDom = page.evaluate(function(){return document.body.innerHTML;});
                // page.render(file);
                next(status, url['url'], renderedDom);
               }, 250);
            } else {
              console.log("load failed, taking a breather");
              setTimeout(function() {
                next(status, url['url'], file);
              },500);
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
  retrieve();
}

function work(status, url, dom){
	if ( status !== "success") {
		console.log("Unable to render '" + url + "'");
	} else {
    now = new Date().getTime();
    queue.push(outq,{"url":url,"dom":dom,"visitts":now});
		console.log("Rendered '" + url + "' at '" + now + "'");
	}
}

function waitrepeat(){
  console.log("exhausted queue. sleeping for it to refill");
  setTimeout(function(){RenderUrlsToFile(work,waitrepeat);},5000);
}

function startwork(resque) {
  RenderUrlsToFile(work, waitrepeat);
}
var outq = "resultqueue",
    inq  = "crawlqueue";

var queue = new Resque("localhost","7379",startwork);

setInterval(function(){
  console.log("heartbeat test: " + heartbeat + ", " + lastheartbeat);
  lastheartbeat = heartbeat;
},10000);

// var queue = new Resque("localhost","7379",function(){console.log("started");});
// setTimeout(function(){RenderUrlsToFile(work, waitrepeat)},500);
// RenderUrlsToFile(arrayOfUrls, work , waitrepeat);
