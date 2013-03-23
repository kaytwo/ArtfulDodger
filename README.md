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

  * customize timeouts, retries, UA, ...
  * blacklisting functionality
    * save off a pending main-brower-window request each time it happens
    * checking against a don't-need-to-load-this blacklist
    * request.abort() and save the abort reason in `a_page`

  * blacklist includes from heavy hitters (fb, google, youtube) for faster loads
  * blacklist css
  * pending queue to detect load failures
  * save rendered screenshot
  * redis LRU of recently visited pages
  * put all workers behind squid

LIMITATIONS
===========
  * Transfer-encoding: chunked responses will be lost if not terminated properly

current functionality
=====================

redis queue in of json'd {"url":target-url}
saves computed dom, doesn't load images.
redis queue out of json'd {dom:dom,url:url,ts:ts,redirs:[redirs]}
