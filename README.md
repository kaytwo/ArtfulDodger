Redis-backed, phantomjs-based web crawler

A companion to Oliver the crawler, who crawls all over.

CONTRIB
=======

  * phantom.js
  * kanzure phantomjs resque implementation (https://gist.github.com/kanzure/80badcf6c66c7a3d8d8e)
  * jquery.js (could be factored out, only using $.ajax)
  * webdis https://github.com/nicolasff/webdis
  * redis

TODO
====

  * customize timeouts, retries, UA, image loading...
  * blacklisting functionality
    * save off a pending main-brower-window request each time it happens
    * checking against a don't-need-to-load-this blacklist
    * request.abort() and save the abort reason in `a_page`

  * blacklist using request.abort()
    * heavy hitters (fb, google, youtube)
    * css
  * add a pending queue and pending queue watcher to detect load failures
  * LRU of recently visited pages
  * put all workers behind squid
  * modify javascript for 'taint tracking' using onResourceRequested and
    networkRequest.changeUrl()

LIMITATIONS / BUGS
==================

  * `Transfer-encoding: chunked` responses might be lost if not terminated
    properly
  * The browser still looks very fake. For this to be more useful, it will
    need to pass plugindetect.js looking like a real browser. This is
    future work. Pull requests encouraged!

current functionality
=====================

the python scripts form a companion that can fill the request queue with a
subset of the alexa top 1m, and then drain it to the temp directory for
inspection. If you want to use AD, you should rewire these scripts to source
and sink your URLs/results in a fashion that meets your needs.

For a quick demo, you will need webdis running on localhost.

To load N (default 100) URLs from the alexa top 1m, run:

`python url_source.py N`

Then, you can either fire up one worker with

`phantomjs url_worker.js`

Or N workers (defaults to 25)

`./launch.sh N`

They will begin visiting URLs and putting their results in the result queue.

To drain the result queue into DIR (default: /tmp/), run:

`python result_sink.py DIR`

If all goes well, your visited URLs will start showing up in that directory as
`domout-$(MD5_of_URL)` which contains the redirchain, url name, visit
timestamp, and first 100 characters of the dom, and `domout-$(MD5_of_URL).png`
which contains the rendered page with no images loaded.
