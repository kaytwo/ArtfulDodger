// pull URLs to load from crawlqueue, load them,
// then store the resulting DOM and redirchain to resultqueue
phantom.injectJs("resque.js");

var heartbeat = 1,
    lastheartbeat = 0,
    webpage = require('webpage'),
    system = require('system'),
    fs = require('fs'),
    out_queue_name = "resultqueue",
    in_queue_name = "crawlqueue",
    retry_table_name = "retriestable",
    redis,
    current_url,
    a_page,
    total_timeout_time = 300, //CHANGED THIS TO SEE WHAT HAPPENS WHEN TIMEOUT. THE VALUE DOESN'T INCREMENT
    max_retries = 3,
    start_time,
    current_time,
    time_left,
    headers,
    browser_array = JSON.parse(fs.open('.browserProfiles.json', 'r').read()),
    thisBrowser,
    create_page = function () {
        start_time = new Date().getTime();
        thisBrowser = browser_array[Math.floor(Math.random() * browser_array.length)];
        var page = webpage.create();

        page.viewportSize = {
            width: thisBrowser.screen.width,
            height: thisBrowser.screen.height
        };
        // page.settings.loadImages = false;
        // most popular browser to wikimedia sites
        page.settings.userAgent = thisBrowser.navigator.userAgent;
        time_left = total_timeout_time;
        //page.settings.resourceTimeout = 7.5 * 1000;
        page.settings.resourceTimeout = time_left;
        //console.log("RESOURCE TIMEOUT: " +page.settings.resourceTimeout);
        page.onConsoleMessage = function (msg) { console.log(msg); };
        page.onError = function (msg, trace) {};
        
        headers = {
            'Accept': thisBrowser.acceptHeaders['accept'],
            'Accept-Language': thisBrowser.acceptHeaders['accept-language'],
            'Accept-Encoding': thisBrowser.acceptHeaders['accept-encoding'],
            'Connection': 'Keep-Alive'
        };
        //Change this
        //headers['Referer'] = ref;

        page.customHeaders = headers;

        headers = {
            'Accept': thisBrowser.acceptHeaders['accept'],
            'Accept-Language': thisBrowser.acceptHeaders['accept-language'],
            'Accept-Encoding': thisBrowser.acceptHeaders['accept-encoding'],
            'Connection': 'Keep-Alive'
        };

        return page;
    },
    load_page = function (url) {
	    //console.log(url);
        heartbeat++;
        var metadata = new Object();

        var a_page = create_page();
        a_page.origURL = url;
        a_page.redirChain = [];
        a_page.allResourceURLs = [];
        a_page.allResourcesAndStatus = new Array();
        a_page.allResourcesAndContent = new Array();
        a_page.failreason = 'unknown error';

        a_page.onInitialized = function () {
            page.evaluate(function (thisBrowser) {
                console.log("initialized");
                (function () {
                    var plugins = navigator.plugins;
                    var mimeTypes = navigator.mimeTypes;
                    var geolocation = navigator.geolocation;
                    var webkitPersistentStorage = navigator.webkitPersistentStorage;
                    var webkitTemporaryStorage = navigator.webkitTemporaryStorage;
                    var __proto__ = navigator.__proto__;
                    navigator = browseObject.navigator;
                    navigator.geolocation = geolocation;
                    navigator.webkitPersistentStorage = webkitPersistentStorage;
                    navigator.webkitTemporaryStorage = webkitTemporaryStorage;
                    navigator.plugins.refresh = plugins.refresh;
                    navigator.plugins.item = plugins.item;
                    navigator.plugins.namedItem = plugins.namedItem;
                    navigator.mimeTypes.item = mimeTypes.item;
                    navigator.mimeTypes.namedItem = mimeTypes.namedItem;
                    if (Object.keys(screen).length > 0) {
                        screen = browseObject.screen;
                    }
                })();
            }, thisBrowser);
        };

        a_page.onResourceTimeout = function (req) {
            console.log("RESOURCE timeout");
            if (a_page.redirChain.slice(-1)[0]["url"] === req.url) {
                //a_page.failreason = "RESOURCE TIMEOUT\nRESOURCETIMEOUT";
                redis.get_value(retry_table_name, a_page.redirChain.slice(0)[0]["url"], function(value) {
                    if (value["HGET"] === null || parseInt(value["HGET"] < max_retries)) {
                        redis.push(in_queue_name, current_url);
                        redis.inc_value(retry_table_name, a_page.redirChain.slice(0)[0]["url"], 1);
                        console.log(a_page.redirChain.slice(0)[0]["url"])
                        //a_page.close();
                        setTimeout(read_queue, 25);
                        //redis.inc_value(retry_table_name, a_page.redirChain.slice(0)[0]["url"], 1);
                    } else {
                        a_page.failreason = "Page failed to load after multiple retries";
                    }
                });
            }
        };

        a_page.onResourceRequested = function (req) {console.log(a_page.settings.resourceTimeout);/*console.log("resource requested: " + req.url)*/};

        a_page.onResourceReceived = function (resp) {

            /*redis.inc_value(retry_table_name, url, 1);
            redis.get_value(retry_table_name, url, function(value) {
                //console.log("HASHTABLE VALUE: " + JSON.stringify(value));
            });*/
            //console.log("resource received: " + resp.url);
            //console.log("resource received");
            a_page.allResourceURLs.push(resp.url);

            // First, update the page content if needed. Note. This is the content of the PARENT OBJECT PAGE, NOT THE RESPONSE
            // Note: The a_page.url for the original fetch is about:blank. Why? Because fuck phantomjs that's why.
            page_url = a_page.url
            if (page_url === "about:blank") {
                page_url = a_page.origURL;
            }

            // We store all possible decodings, because webservers suck

            // Note: This never gets called on the final link in the chain. Have to handle that in onLoadFinished.            
            a_page.allResourcesAndContent[page_url] = a_page.content;
            a_page.allResourcesAndContent[decodeURI(page_url)] = a_page.content;
            a_page.allResourcesAndContent[unescape(decodeURI(page_url))] = a_page.content;
            a_page.allResourcesAndContent[unescape(page_url)] = a_page.content;

            // Now, update this URL's status. 
            a_page.allResourcesAndStatus[resp.url] = resp.status;
            a_page.allResourcesAndStatus[decodeURI(resp.url)] = resp.status;
            a_page.allResourcesAndStatus[unescape(decodeURI(resp.url))] = resp.status;
            a_page.allResourcesAndStatus[unescape(resp.url)] = resp.status;

            // Loop over all the items in our chain and update as needed.
            for (var i in a_page.redirChain) {

                datum = a_page.redirChain[i];

                if (!datum["status"] && a_page.allResourcesAndStatus[datum["url"]]) {
                    datum["status"] = a_page.allResourcesAndStatus[datum["url"]];
                }

                if (!datum["content"] && a_page.allResourcesAndContent[datum["url"]]) {
                    datum["content"] = a_page.allResourcesAndContent[datum["url"]];
                }

            }

            if (!resp.redirectURL) {
                a_page.customHeaders = headers;
            }

            //console.log(JSON.stringify(resp));

        };

        a_page.onResourceError = function (resourceError) {
            //console.log("resource error");
            // if the last navigated-to url load failed, keep track of why
            if ((a_page.redirChain.slice(-1)[0]["url"] === resourceError.url) && (a_page.failreason === 'unknown error')) {
                a_page.failreason = resourceError.errorString;
            }
        };

        a_page.onLoadFinished = function (status) {

            console.log("load finished");
            if (metadata.tocb) {
                //console.log("in this url");
                clearTimeout(metadata.tocb);
                delete metadata.tocb;
            }

            // wiggle the mouse - sendEvent interrupts this thread of execution???
            setTimeout(function () {
                a_page.sendEvent('mousemove', 200, 200);
            }, 10);

            // give the page 1.2 seconds for any sneaky redirects
            metadata.tocb = setTimeout(function () {
                console.log("in tocb!!")
                if (status !== 'success') {
                    status = a_page.failreason;
                }

                // Cleanup poor behavior on onResourceRecieved
                page_url = a_page.url
                if (page_url === "about:blank") {
                    page_url = a_page.origURL;
                }

                a_page.allResourcesAndContent[page_url] = a_page.content;

                for (var i in a_page.redirChain) {

                    if (!a_page.redirChain[i]["status"] && a_page.allResourcesAndStatus[a_page.redirChain[i]["url"]]) {
                        a_page.redirChain[i]["status"] = a_page.allResourcesAndStatus[a_page.redirChain[i]["url"]];
                    }

                    if (!a_page.redirChain[i]["content"] && a_page.allResourcesAndContent[a_page.redirChain[i]["url"]]) {
                        a_page.redirChain[i]["content"] = a_page.allResourcesAndContent[a_page.redirChain[i]["url"]];
                    }

                    //out = [datum["ts"], datum["url"], datum["status"], datum["content"]]
                    //console.log(JSON.stringify(out));
                }

                metadata.url = page_url;
                metadata.dom = a_page.content;
                metadata.sshot = a_page.renderBase64('PNG');
                metadata.redirs = a_page.redirChain.slice(0);
                metadata.status = status;
                metadata.ts = new Date().getTime();
                //console.log(JSON.stringify(a_page.allResourceURLs));

                //console.log(JSON.stringify(a_page.allResourcesAndContent));
                console.log(JSON.stringify(metadata.redirs));
                /*
                out = []
                for (var i in a_page.allResourcesAndStatus) {
                    out.push([i, a_page.allResourcesAndStatus[i]])
                }
                console.log(JSON.stringify(out));
                */

                delete metadata.tocb;

                redis.push(out_queue_name, metadata);
                a_page.close();
                setTimeout(read_queue, 25);
                return;

            }, 1200);
        };

        a_page.onNavigationRequested = function (url, type, willNavigate, main) {
            //console.log("navigation requested");
            if (willNavigate && main) {
                current_time = new Date().getTime();

                time_left = current_time - start_time;
                //console.log("TIME LEFT: " + start_time + " " + current_time)
                a_page.settings.resourceTimeout = total_timeout_time - time_left;
                if (a_page.settings.resourceTimeout < 0)
                    a_page.settings.resourceTimeout = 0;
                //console.log(a_page.settings.resourceTimeout);
                datum = new Object();
                datum["ts"] = new Date().getTime();
                datum["url"] = url;

                a_page.redirChain.push(datum)
                console.log(datum)

                if (metadata.tocb) {
                    clearTimeout(metadata.tocb);
                }
            }
        };

        a_page.open(url);
        //a_page.open(url, function (status) {});
    },


    read_queue = function () {
        //console.log("going to read queue");
        //console.log(in_queue_name);
        redis.pop(in_queue_name, function (item) {
            if (!item) {
                //console.log("!item");
                setTimeout(queue_empty, 25);
                return;
            } else if (!item.url) {
                //console.log("!item.url");
                setTimeout(read_queue, 25);
                return;
            } else {
                console.log("going to load page");
                current_url = item;
                load_page(item.url);
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

redis = new Resque(hostname, portnum, function (resque) {
    read_queue();
});
setInterval(function () {
    // page hasn't successfully loaded in N seconds, die and be reborn
    if (lastheartbeat === heartbeat) {
        console.log("exiting due to lack of forward progress.");
        phantom.exit();
    }
    lastheartbeat = heartbeat;
}, 30000);