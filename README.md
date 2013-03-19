Redis-backed, phantomjs-based web crawler

A companion to Oliver the crawler, who crawls all over.

uses

  * phantom.js
  * underscore.js
  * kanzure resque (https://gist.github.com/kanzure/80badcf6c66c7a3d8d8e)
  * jquery.js
  * webdis https://github.com/nicolasff/webdis
  * redis

helper functions from redis-py

TODO
====

  * blacklist heavy hitters (fb, google, youtube) for faster loads
  * blacklist css
  * RPOPLPUSH to detect load failures
  * save rendered screenshot
  * save redirect chain
  * redis LRU of recently visited resources?

current functionality
=====================

redis queue in of json'd {"url":target-url}
redis queue out of json'd {"dom":dom,"url":url,"ts":ts}
renders the dom, doesn't load images.
