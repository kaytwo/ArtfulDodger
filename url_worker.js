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
    is_timed_out,
    total_timeout_time = 30000,
    max_retries = 3,
    start_time,
    current_time,
    time_left,
    headers,
    browsers = JSON.parse(fs.open('.browser_profiles.json', 'r').read()),
    this_browser,
    create_page = function () {
        start_time = new Date().getTime();
        var page = webpage.create();
        // page.settings.loadImages = false;
        // most popular browser to wikimedia sites
        page.settings.userAgent = this_browser.navigator.userAgent;

        //Resource timeout starts as the total timeout time.
        time_left = total_timeout_time;
        page.settings.resourceTimeout = time_left;
        page.onConsoleMessage = function (msg) { console.log(msg); };
        page.onError = function (msg, trace) {};
        
        headers = {
            'Accept': this_browser.acceptHeaders['accept'],
            'Accept-Language': this_browser.acceptHeaders['accept-language'],
            'Connection': 'Keep-Alive'
        };
        
        //Remove 'gzip' from the Accept-Encoding header, phantomjs is intolerant
	var accept_encoding = this_browser.acceptHeaders['accept-encoding'].split(",");
        accept_encoding.splice(this_browser.acceptHeaders['accept-encoding'].indexOf("gzip"), 1);
        headers['Accept-Encoding'] = accept_encoding.join();

	//sruti: not sure why we need to have a referer at initial request
        //headers['Referer'] = ref;
        
        page.customHeaders = headers;

        headers = {
            'Accept': this_browser.acceptHeaders['accept'],
            'Accept-Language': this_browser.acceptHeaders['accept-language'],
            'Connection': 'Keep-Alive'
        };
        headers['Accept-Encoding'] = accept_encoding.join();

        return page;
    },
    load_page = function (url) {
	console.log("Crawling: " + url);
        heartbeat++;
        var metadata = new Object();

        var a_page = create_page();
        is_timed_out = false;
        a_page.origURL = url;
        a_page.redirChain = [];
        a_page.allResourceURLs = [];
        a_page.allResourcesAndStatus = new Object();
        a_page.allResourcesAndContent = new Object();
        a_page.failreason = 'unknown error';

        a_page.onInitialized = function () {
            page.evaluate(function (this_browser) {
                (function () {

                    //Make phantom browser imitate selected browser persona
                    var plugins = navigator.plugins;
                    var mimeTypes = navigator.mimeTypes;
                    var geolocation = navigator.geolocation;
                    var webkitPersistentStorage = navigator.webkitPersistentStorage;
                    var webkitTemporaryStorage = navigator.webkitTemporaryStorage;
                    var __proto__ = navigator.__proto__;
                    navigator = this_browser.navigator;
                    navigator.geolocation = geolocation;
                    navigator.webkitPersistentStorage = webkitPersistentStorage;
                    navigator.webkitTemporaryStorage = webkitTemporaryStorage;
                    navigator.plugins.refresh = plugins.refresh;
                    navigator.plugins.item = plugins.item;
                    navigator.plugins.namedItem = plugins.namedItem;
                    navigator.mimeTypes.item = mimeTypes.item;
                    navigator.mimeTypes.namedItem = mimeTypes.namedItem;
                    if (Object.keys(screen).length > 0) {
                        screen = this_browser.screen;
                    }
                    a_page.viewportSize = {
            	        width: screen.width,
                        height: this_browser.screen.height
                    };
                })();
            }, this_browser);
        };

        a_page.onResourceTimeout = function (req) {
            console.log("Resource timeout!");
            if (a_page.redirChain.slice(-1)[0]["url"] === req.url ||  a_page.origURL === req.url) {
		is_timed_out = true;
                console.log("RESOURCE TIMEOUT");
	    }
        };

        a_page.onResourceRequested = function (req) {
	    //console.log("Resource requested: " + req.url);
        };

        a_page.onResourceReceived = function (resp) {
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
        };

        a_page.onResourceError = function (resourceError) {
            // if the last navigated-to url load failed, keep track of why
            if ((a_page.redirChain.slice(-1)[0]["url"] === resourceError.url) && (a_page.failreason === 'unknown error')) {
                a_page.failreason = resourceError.errorString;
            }
        };

        a_page.onLoadFinished = function (status) {

            //console.log("load finished");
            if (metadata.tocb) {
                clearTimeout(metadata.tocb);
                delete metadata.tocb;
            }

            // wiggle the mouse - sendEvent interrupts this thread of execution???
            setTimeout(function () {
                a_page.sendEvent('mousemove', 200, 200);
            }, 10);

            // give the page 1.2 seconds for any sneaky redirects
            metadata.tocb = setTimeout(function () {
                if (is_timed_out) {
                    redis.get_value(retry_table_name, a_page.origURL, function(result) {
                        var retries = parseInt(result["HGET"]);
                        if (retries !== null && retries === max_retries) {
                            metadata.url = page_url;
			    metadata.browser_ID = this_browser.ID;
                            metadata.dom = a_page.content;
			    metadata.status = "Page failed to load fully in " + total_timeout_time + " ms";
                            metadata.ts = new Date().getTime();
                            metadata.allResourceURLs = a_page.allResourceURLs;
                            delete metadata.tocb;
                            console.log("Writing to result queue (timed out object)...");
                            redis.push(out_queue_name, metadata);
			    //a_page.close();
                            setTimeout(read_queue, 25);
			    return;
                        } else {
			    redis.inc_value(retry_table_name, a_page.origURL, 1);
			    redis.push(in_queue_name, current_url);
                            //a_page.close();
                            setTimeout(read_queue, 25);
                            return;
                        }
                    });     
		} else {

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
		    }
		    metadata.url = page_url;
	            metadata.browser_ID = this_browser.ID;
		    metadata.dom = a_page.content;
		    metadata.sshot = a_page.renderBase64('PNG');
		    metadata.redirs = a_page.redirChain.slice(0);
		    metadata.status = status;
		    metadata.ts = new Date().getTime();
		    metadata.iframeDoms = a_page.evaluate(function() {
                        var iframes = document.getElementsByTagName('iframe');
			var iframeArray = [];
                        for (var i = 0; i < iframes.length; ++i) {
                            if (iframes[i].src && iframes[i].contentWindow.document) {
			        iframeArray.push({'src': iframes[i].src, 'document': iframes[i].contentWindow.document.documentElement.innerHTML });
			    }
                        }
                        return iframeArray;
                    });
		    metadata.allResourceURLs = a_page.allResourceURLs;
		    delete metadata.tocb;
		    console.log("Writing to result queue...");
		    redis.push(out_queue_name, metadata);
		    a_page.close();
		    setTimeout(read_queue, 25);
		    return;
                }
            }, 1200);
        };

        a_page.onNavigationRequested = function (url, type, willNavigate, main) {
            if (willNavigate && main) {
                current_time = new Date().getTime();

                time_left = current_time - start_time;
                a_page.settings.resourceTimeout = total_timeout_time - time_left;
                if (a_page.settings.resourceTimeout < 0)
                    a_page.settings.resourceTimeout = 0;
                datum = new Object();
                datum["ts"] = new Date().getTime();
                datum["url"] = url;

                a_page.redirChain.push(datum)
                if (metadata.tocb) {
                    clearTimeout(metadata.tocb);
                }
            }
        };
        a_page.open(url);
    },
    read_queue = function () {
        redis.pop(in_queue_name, function (item) {
            if (!item) {
                setTimeout(queue_empty, 25);
                return;
            } else if (!item.url) {
                setTimeout(read_queue, 25);
                return;
            } else {
                current_url = item;
                load_page(item.url);
            }
        });
    },
    queue_empty = function () {
        heartbeat++;
        //sruti: how would the queue refill?
        //consolie.log("exhausted queue. sleeping for it to refill");
        /*setTimeout(function () {
            read_queue();
        }, total_timeout_time+5000);*/
    };

var args = require('system').args;
var hostname, portnum;
if (args.length > 1)
    this_browser = browsers[args[1]];
else
    this_browser = browsers[Object.keys(browsers)[Math.floor(Math.random() * Object.keys(browsers).length)]];
if (args.length > 2)
    hostname = args[2]
else
    hostname = "localhost";
if (args.length > 3)
    portnum = args[3];
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
}, 31000);
