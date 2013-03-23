// Render Multiple URLs to file
phantom.injectJs("resque.js");

var heartbeat = 1,
    lastheartbeat = 0,
    webpage = require('webpage'),
    system = require('system'),
    fs = require('fs'),
    out_queue_name = "resultqueue",
    in_queue_name  = "crawlqueue",
    queue,
    create_page = function () {

        var page = webpage.create();

        page.viewportSize = {
            width: 800,
            height: 600
        };
        page.settings.loadImages = false;
        page.settings.userAgent = "Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US) AppleWebKit/532+ (KHTML, like Gecko) Version/4.0.2 Safari/530.19.1";
        page.settings.resourceTimeout = 10*1000;
        page.onConsoleMessage = function(msg) {};
        page.onError = function(msg, trace) {};

        return page;
    },
    // For now we can try just creating a single page object and reusing it,
    // but might need to fall back to creating one per request
    // a_page = create_page(),
    process_result = function (a_status, a_url, thispage) {

        var now = new Date().getTime();
        heartbeat++;

        queue.push(out_queue_name, {
            url: a_url,
            dom: thispage,
            visits: now
        });

        console.log("Rendered '" + a_url + "' at '" + now + "'");
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

                a_page = create_page();
                a_page.alreadyfinished = false;
                /*
                a_page.onResourceRequested = function(req){
                  console.log('requested: ' + JSON.stringify(req, undefined, 4));
                };

                a_page.onResourceReceived = function(res){
                  console.log('received: ' + JSON.stringify(res, undefined, 4));
                };
                */
                a_page.open(item.url, function (status) {
                    
                    if(!a_page.alreadyfinished){
                      a_page.alreadyfinished = true;
                      // give the page 3 seconds for any meta refresh redirects
                      // to complete

                      window.setTimeout(function () {

                          // Do something with rendered dom, why not?
                          dom_content = a_page.content;
                          process_result(status, item.url, dom_content);
                          a_page.close();
                          setTimeout(read_queue,25);
                          return;

                      }, 3000);
                    }
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


queue = new Resque("localhost", "7379", function (resque) {
  read_queue();
});
setInterval(function () {

    // page hasn't successfully loaded in N seconds, die and be reborn
    if (lastheartbeat === heartbeat) {
        console.log("exited due to lack of forward progress.");
        phantom.exit();
    }
    lastheartbeat = heartbeat;

}, 15000);
