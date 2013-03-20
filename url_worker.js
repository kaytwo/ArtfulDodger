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
    process_result = function (a_status, a_url, a_dom) {

        var now = new Date().getTime();
        heartbeat++;

        queue.push(out_queue_name, {
            url: a_url,
            dom: a_dom,
            visits: now
        });

        console.log("Rendered '" + a_url + "' at '" + now + "'");
    },
    read_queue = function () {

        queue.pop(in_queue_name, function (item) {

            if (!item) {

                queue_empty();

            } else if (!item.url) {

                console.log("discarding garbage from queue.");

            } else {

                a_page.open(item.url, function (status) {

                    console.log("just finished reading " + item.url);
                    window.setTimeout(function () {

                        // Do something with rendered dom, why not?
                        process_result(status, item.url, a_page.content);
                        read_queue();

                    }, 25);
                });
            }
        });
    },
    create_page = function () {

        var page = webpage.create();

        page.viewportSize = {
            width: 800,
            height : 600
        };
        page.settings.loadImages = false;
        page.settings.userAgent = "Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US) AppleWebKit/532+ (KHTML, like Gecko) Version/4.0.2 Safari/530.19.1";
        page.onConsoleMessage = function(msg) {};
        page.onError = function(msg, trace) {};

        return page;
    },
    // For now we can try just creating a single page object and reusing it,
    // but might need to fall back to creating one per request
    a_page = create_page(),
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
        phantom.exit();
    }
    lastheartbeat = heartbeat;

}, 15000);
