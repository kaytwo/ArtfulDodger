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
        // most popular browser to wikimedia sites
        page.settings.userAgent = "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.60 Safari/537.17";
        page.settings.resourceTimeout = 5*1000;
        page.onConsoleMessage = function(msg) {};
        page.onError = function(msg, trace) {};

        return page;
    },
    process_result = function (a_status, a_url, thispage, redirs) {
        var now = new Date().getTime();
        queue.push(out_queue_name, {
            url: a_url,
            dom: thispage,
            redirs: redirs,
            ts: now
        });
        // console.log("Rendered redirchain " + JSON.stringify(redirs) + " at " + now );
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
                a_page.redirchain = [];
                a_page.onResourceTimeout = function(req){
                };
                a_page.onResourceRequested = function(req){
                  heartbeat++;
                };
                a_page.onLoadFinished = function(status) {
                    if (a_page.tocb)
                      clearTimeout(a_page.tocb);
                    
                    // give the page 3 seconds for any sneaky redirects
                    a_page.tocb = setTimeout(function () {
                          dom_content = a_page.content;
                          redirs = a_page.redirchain.slice(0);
                          process_result(status, item.url, dom_content, redirs);
                          a_page.close();
                          setTimeout(read_queue,25);
                          return;
                    }, 3000);
                };
                a_page.onNavigationRequested = function(url, type, willNavigate, main) {
                  if (willNavigate && main){
                    a_page.redirchain.push(url);
                    if (a_page.tocb)
                      clearTimeout(a_page.tocb);

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
