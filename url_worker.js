// pull URLs to load from crawlqueue, load them,
// then store the resulting DOM and redirchain to resultqueue
phantom.injectJs("resque.js");

var heartbeat = 1,
    lastheartbeat = 0,
    webpage = require('webpage'),
    system = require('system'),
    fs = require('fs'),
    out_queue_name = "resultqueue",
    in_queue_name  = "crawlqueue",
    queue,
    a_page,
    create_page = function () {

        var page = webpage.create();

        page.viewportSize = {
            width: 800,
            height: 600
        };
        // page.settings.loadImages = false;
        // most popular browser to wikimedia sites
        page.settings.userAgent = "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.60 Safari/537.17";
        page.settings.resourceTimeout = 7.5*1000;
        page.onConsoleMessage = function(msg) {};
        page.onError = function(msg, trace) {};

        return page;
    },
    read_queue = function () {

        queue.pop(in_queue_name, function (item) {
            if (!item) {
                setTimeout(queue_empty,25);
                return;
            } else if (!item.url) {
                setTimeout(read_queue,25);
                return;
            } else {
                heartbeat++;
                a_page = create_page();
                a_page.redirchain = [];
                a_page.redircodes = [];
                a_page.failreason = 'unknown error';
                a_page.onResourceTimeout = function(req){
                  if (a_page.redirchain.slice(-1)[0] == req.url)
                    a_page.failreason = "Resource timeout";
                };
                a_page.onResourceRequested = function(req){
                };
                a_page.onResourceReceived = function(resp){
                  if(resp.url === a_page.redirchain.slice(-1)[0] && resp.stage === "start")
                    a_page.redircodes.push(resp.status);
                };
                a_page.onResourceError = function(resourceError) {
                  // if the last navigated-to url load failed, keep track of why
                  if ((a_page.redirchain.slice(-1)[0] === resourceError.url) && (a_page.failreason === 'unknown error')){
                    a_page.failreason = resourceError.errorString;
                  }
                };
                a_page.onLoadFinished = function(status) {
                    if (item.tocb){
                      clearTimeout(item.tocb);
                      delete item.tocb;
                    }
                    // wiggle the mouse - sendEvent interrupts this thread of execution???
                    setTimeout(function() {a_page.sendEvent('mousemove',200,200);},10);
                    // give the page 1.2 seconds for any sneaky redirects
                    item.tocb = setTimeout(function () {
                          if (status != 'success'){
                            status = a_page.failreason;
                          }
                          item.dom = a_page.content;
                          item.sshot = a_page.renderBase64('PNG');
                          item.redirs = a_page.redirchain.slice(0);
                          item.status = status;
                          item.redircodes = a_page.redircodes.slice(0);
                          item.ts = new Date().getTime();
                          delete item.tocb;
                          queue.push(out_queue_name,item);
                          
                          a_page.close();
                          setTimeout(read_queue,25);
                          return;
                    }, 1200);
                };
                a_page.onNavigationRequested = function(url, type, willNavigate, main) {
                  if (willNavigate && main){
                    heartbeat++;
                    a_page.redirchain.push(url);
                    if (item.tocb)
                      clearTimeout(item.tocb);
                  }
                };

                a_page.open(item.url, function (status) {
                });
            }
        });
    },
    queue_empty = function () {

        heartbeat++;
        console.log("exhausted queue. sleeping for it to refill");
        setTimeout(function () {
            read_queue();
        }, 5000);
    };

var args = require('system').args;
var hostname, portnum;
if (args.length > 1)
  hostname = args[1];
else
  hostname = "localhost";
if (args.length > 2)
  portnum = args[2];
else
  portnum = "7379";

queue = new Resque(hostname, portnum, function (resque) {
  read_queue();
});
setInterval(function () {

    // page hasn't successfully loaded in N seconds, die and be reborn
    if (lastheartbeat === heartbeat) {
        console.log("exiting due to lack of forward progress.");
        phantom.exit();
    }
    lastheartbeat = heartbeat;

}, 15000);
