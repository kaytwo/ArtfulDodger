# https://raw.github.com/jashkenas/coffee-script/master/examples/underscore.coffee
# http://coffeescript.org/documentation/docs/underscore.html
phantom.injectJs("underscore.js")

class Webdis
  msgtoken: "SPLAT: "

  constructor: (host, port, startup_callback, resque) ->
    @host  = host
    @port  = port

    # stores callbacks for onAlert to access later
    @callbacks = {}

    # triggered when the webdis/redis connection is ready
    @startup_callback = startup_callback
    @resque = resque

    # used to represent whether or not jquery needs to be loaded
    @ready = false

    # phantomjs WebPage/tab to do AJAX-communication with webdis
    @page  = require("webpage").create()

    # TODO: possibly use _.bindAll here?
    # this is because "@" changes in onLoadFinished
    self = @

    # triggers startup_callback after page and jquery are both done loading
    onLoadFinished = (status) ->
      # http://code.jquery.com/jquery-latest.min.js
      self.page.injectJs("jquery.js")

      jqueryconflictresolver = ->
        window.$ = jQuery.noConflict(true)

      self.page.evaluate(jqueryconflictresolver)

      # jquery is done loading
      self.ready = true

      # webdis/redis connection is ready
      self.startup_callback(self.resque)

    # parses redis responses and selects appropriate (stored) callback
    onAlert = (message) ->
      if not (message.substring(0, self.msgtoken.length) == self.msgtoken)
        console.log(message) # no reason for this page to be alerting
      else
        # @page's GET callback triggers something like this:
        #   alert({"callbackid": 1, "wbdismsg": "{\"key\": \"value\"}"})
        jsonmsg = message.substring(self.msgtoken.length, message.length)
        msg     = JSON.parse(jsonmsg)

        callbackid = msg["callbackid"]
        webdismsg  = msg["webdismsg"]

        # the "rediscmd" key indicates which part of webdismsg is relevant
        rediscmd = null
        if msg["rediscmd"] != null and msg["rediscmd"] != undefined
          rediscmd = msg["rediscmd"]

        # no callbackid is a sorta big problem
        if callbackid == null or callbackid == undefined
          return

        # grab the callback only after callbackid is vetted
        callback = self.callbacks[callbackid]

        # a callbackid w/o callback is also pretty bad
        if callback == null or callback == undefined
          return

        # callback only wants the relevant response from webdis
        if rediscmd != null
          webdisresp = JSON.parse(webdismsg[rediscmd])
        else
          webdisresp = webdismsg

        # so that memory can be freed
        self.remove_callback_by_id(callbackid)

        # finally send the RPOP result back to whatever handler
        callback(webdisresp)

    @page.onAlert = onAlert
    @page.onConsoleMessage = (x) -> console.log(x)

    # open some working page, even if it shows a webdis error response
    @page.open("http://"+@host+":"+@port+"/lpush", onLoadFinished)

  execute: (url, callback, rediscmd) ->
    storedid = @store_callback(callback)

    evilargs =
      msgtoken:   @msgtoken
      url:        url
      callbackid: storedid
      rediscmd:   rediscmd

    evil = (args) ->
      msgtoken   = args.msgtoken
      url        = args.url
      callbackid = args.callbackid
      rediscmd   = args.rediscmd

      supercallback = (webdis_response) ->
        payload =
          rediscmd:   rediscmd
          callbackid: callbackid
          webdismsg:  webdis_response
        jsonified = JSON.stringify(payload)

        if callbackid != undefined and callbackid != null
          alert msgtoken + jsonified

      window.$.get(url, supercallback)

    @page.evaluate(evil, evilargs)

  construct_request: (components) ->
    url = "http://" + @host + ":" + @port + "/" + components.join("/")
    return url

  store_callback: (callback) ->
    id = _.keys(@callbacks).length
    @callbacks[id] = callback
    return id

  find_callback_id: (callback) ->
    for id, pcallback in @callbacks
      if pcallback == callback
        return id
    return false

  remove_callback: (callback) ->
    id = @find_callback_id(callback)
    if id != false
      @callbacks[id] = null
      return true
    return false

  remove_callback_by_id: (id) ->
    @callbacks[id] = null
    return true

  release: ->
    @page.release()
    @ready = false

  # push an item to the end of the queue with LPUSH
  push: (key, value) ->
    cmd = ["LPUSH", key, value]
    url = @construct_request(cmd)
    r   = @execute(url)

  # pop an item from the head of the queue with RPOP
  pop: (key, callback) ->
    cmd = ["RPOP", key]
    url = @construct_request(cmd)
    r   = @execute(url, callback, "RPOP")

  len: (key, callback) ->
    cmd = ["LLEN",key]
    url = @construct_request(cmd)
    r   = @execute(url, callback, "LLEN")


class Resque
  constructor: (host, port, startup_callback) ->
    @host   = host
    @port   = port
    @webdis = new Webdis(host, port, startup_callback, @)

  push: (queue, object) ->
    key    = "resque:queue:" + queue
    object = JSON.stringify(object)
    @webdis.push(key, object)

  pop: (queue, callback) ->
    key = "resque:queue:" + queue
    @webdis.pop(key, callback)

  len: (queue, callback) ->
    key = "resque:queue:" + queue
    @webdis.len(key, callback)


startup_callback = (resque) ->
  # queue.push("movies", {"name": "short circuit"})
  # queue.push("movies", {"name": "star wars episode iv"})
  # queue.push("movies", {"name": "star wars episode v"})
  # queue.push("movies", {"name": "star wars episode vi"})
  

  i = 0
  queuepusher = (timeout) ->
    setInterval ->
      queue.push("crawlqueue",{"offset":i})
      i++
      console.log("pushed " + i.toString())
    , timeout

  queuepopper = (timeout) ->
    setInterval ->
      queue.pop "crawlqueue",console.log("popped.")
    , timeout


  repop = (resval) ->
    console.log(resval)
    setTimeout repop,1000,"crawlqueue"
  
      
  
  printlen = (ql) ->
    console.log("current queue length: " + ql.toString()) # JSON.stringify(ql))

  queuechecker = (timeout) ->
    setInterval ->
      queue.len("crawlqueue", printlen)
    , timeout

  moviemonster = (movie) ->
    console.log("movie name is: " + movie.name)
  
  # queue.pop("movies", moviemonster)

  moviemonsterandexit = (movie) ->
    moviemonster(movie)
    phantom.exit()

  delay = (time, fn, args...) ->
    setTimeout fn, time, args...
  # queue.pop("movies", moviemonsterandexit)
  # queuepusher(100)
  # queuepopper(200)
  # queuechecker(1000)

  # namedlog = (s) ->
  #   console.log(s?.offset)

  (function() {
    var namedlog, popforever;

    namedlog = function(s) {
      return console.log(s);
    };

    popforever = function(quename, cb) {
      pop(quename, function(result) {
        cb(result);
        setTimeout((function() {
          popforever(quename, cb);
        }), 500);
      });
    };
    popforever("crawlqueue",namedlog);

  }).call(this);


queue = new Resque("localhost", "7379", startup_callback)

# loudpop = ->
#   queue.pop("crawlqueue",console.log("popped.")) while true

# queue.len("crawlqueue", console.log)

# WIP: http://jsfiddle.net/SKMpV/201/
# todo: stash this, run phantomJS from file input, send to file output
