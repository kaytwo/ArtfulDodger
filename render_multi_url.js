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
          page.settings.userAgent = "Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US) AppleWebKit/532+ (KHTML, like Gecko) Version/4.0.2 Safari/530.19.1";
          page.onConsoleMessage = function(msg) {};
          page.onError = function(msg,trace){};
          page.open(url['url'], function(status) {
            // page.evaluate(function() { document.body.bgColor = 'white';});
            // var file = getFilename();
            // todo: maybe take a breather and reboot the webpage if urlIndex % 100 = 99
            window.setTimeout(function() {
              renderedDom = page.content;
              // page.render(file);
              next(status, url['url'], renderedDom);
             }, 25);
            
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
    now = new Date().getTime();
    queue.push(outq,{"url":url,"dom":dom,"visitts":now});
		console.log("Rendered '" + url + "' at '" + now + "'");
}

function waitrepeat(){
  heartbeat++;
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
  // page hasn't successfully loaded in N seconds, die and be reborn
  if(lastheartbeat == heartbeat){
    phantom.exit();
  }
  lastheartbeat = heartbeat;
},15000);

// var queue = new Resque("localhost","7379",function(){console.log("started");});
// setTimeout(function(){RenderUrlsToFile(work, waitrepeat)},500);
// RenderUrlsToFile(arrayOfUrls, work , waitrepeat);
