// from https://gist.github.com/kanzure/80badcf6c66c7a3d8d8e/raw/14f4ce32835b9e40e6b093c4d2d73a69b5c2b37a/resque.coffee

var Resque, Webdis, startup_callback;

Webdis = (function() {
  Webdis.prototype.msgtoken = "SECRETZ: ";

  function Webdis(host, port, startup_callback, resque) {
    var onAlert, onLoadFinished, self;

    this.host = host;
    this.port = port;
    this.callbacks = {};
    this.startup_callback = startup_callback;
    this.resque = resque;
    this.ready = false;
    this.page = require("webpage").create();
    self = this;
    onLoadFinished = function(status) {
      var jqueryconflictresolver;

      self.page.injectJs("jquery.js");
      jqueryconflictresolver = function() {
        return window.$ = jQuery.noConflict(true);
      };
      self.page.evaluate(jqueryconflictresolver);
      self.ready = true;
      //console.log("here")
      return self.startup_callback(self.resque);
    };
    onAlert = function(message) {
      //console.log("JO NERE")
      var callback, callbackid, jsonmsg, msg, rediscmd, webdismsg, webdisresp;

      if (!(message.substring(0, self.msgtoken.length) === self.msgtoken)) {
        return console.log(message);
      } else {
        jsonmsg = message.substring(self.msgtoken.length, message.length);
        msg = JSON.parse(jsonmsg);
        callbackid = msg["callbackid"];
        webdismsg = msg["webdismsg"];
        rediscmd = null;
        if (msg["rediscmd"] !== null && msg["rediscmd"] !== void 0) {
          rediscmd = msg["rediscmd"];
        }
        if (callbackid === null || callbackid === void 0) {
          return;
        }
        callback = self.callbacks[callbackid];
        if (callback === null || callback === void 0) {
          return;
        }
        if (rediscmd !== null) {
          webdisresp = JSON.parse(webdismsg[rediscmd]);
        } else {
          webdisresp = webdismsg;
        }
        self.remove_callback_by_id(callbackid);
        return callback(webdisresp);
      }
    };
    this.page.onAlert = onAlert;
    this.page.onConsoleMessage = function(x) {
      return console.log(x);
    };

    this.page.open("http://" + this.host + ":" + this.port + "/lpush", onLoadFinished);
  }

  Webdis.prototype.execute = function(ajax, callback, rediscmd) {
    var evil, evilargs, storedid;
    //console.log("IN EXECUTE")
    storedid = this.store_callback(callback);
    evilargs = {
      msgtoken: this.msgtoken,
      ajax: ajax,
      callbackid: storedid,
      rediscmd: rediscmd
    };
    evil = function(args) {
      var callbackid, msgtoken, supercallback;
      //console.log("in evil")
      msgtoken = args.msgtoken;
      ajax_args = args.ajax;
      callbackid = args.callbackid;
      rediscmd = args.rediscmd;
      supercallback = function(webdis_response) {
        //console.log("in super callback")
        var jsonified, payload;

        payload = {
          rediscmd: rediscmd,
          callbackid: callbackid,
          webdismsg: webdis_response
        };
        jsonified = JSON.stringify(payload);
       //console.log(jsonified);
        if (callbackid !== void 0 && callbackid !== null) {
          return alert(msgtoken + jsonified);
        }
      };
      //console.log("here")
      ajax_args.success = supercallback;

      return window.$.ajax(ajax_args);
    };
    //console.log("GOING to rerutnr")
    return this.page.evaluate(evil, evilargs);
  };

  Webdis.prototype.construct_request = function(components) {
    var url;
    console.log("COMPONENTS length: " + components.length);
    url = {url:"http://" + this.host + ":" + this.port + "/" + components.slice(0, -1).map(encodeURIComponent).join("/"), type:"PUT"};
    console.log(url.url);
    if (components.length > 1)
      url.data = components[components.length-1];
    //console.log(JSON.stringify(url));
    return url;
  };

  Webdis.prototype.store_callback = function(callback) {
    var id;

    id = Object.keys(this.callbacks).length;
    this.callbacks[id] = callback;
    return id;
  };

  Webdis.prototype.find_callback_id = function(callback) {
    var id, pcallback, _i, _len, _ref;

    _ref = this.callbacks;
    for (pcallback = _i = 0, _len = _ref.length; _i < _len; pcallback = ++_i) {
      id = _ref[pcallback];
      if (pcallback === callback) {
        return id;
      }
    }
    return false;
  };

  Webdis.prototype.remove_callback = function(callback) {
    var id;

    id = this.find_callback_id(callback);
    if (id !== false) {
      this.callbacks[id] = null;
      return true;
    }
    return false;
  };

  Webdis.prototype.remove_callback_by_id = function(id) {
    this.callbacks[id] = null;
    return true;
  };

  Webdis.prototype.release = function() {
    this.page.release();
    return this.ready = false;
  };

  Webdis.prototype.push = function(key, value) {
    var cmd, r, url;

    cmd = ["LPUSH", key, value];
    url = this.construct_request(cmd);
    return r = this.execute(url);
  };

  Webdis.prototype.pop = function(key, callback) {
    var cmd, r, url;

    cmd = ["RPOP", key];
    url = this.construct_request(cmd);
    return r = this.execute(url, callback, "RPOP");
  };

  Webdis.prototype.get_value = function(key, field, callback) {
    var cmd, r, url;

    cmd = ["HGET", key, field];
    url = this.construct_request(cmd);
    return r = this.execute(url, callback);
  };

  Webdis.prototype.inc_value = function(key, field, increment) {
    var cmd, r, url;

    cmd = ["HINCRBY", key, field, increment];
    url = this.construct_request(cmd);
    console.log(JSON.stringify(url))
    return r = this.execute(url);
  };

  return Webdis;

})();

Resque = (function() {
  function Resque(host, port, startup_callback) {
    this.host = host;
    this.port = port;
    this.webdis = new Webdis(host, port, startup_callback, this);
  }

  Resque.prototype.push = function(queue, object) {
    var key;

    key = "resque:" + queue;
    object = JSON.stringify(object);
    return this.webdis.push(key, object);
  };

  Resque.prototype.pop = function(queue, callback) {
    var key;

    key = "resque:" + queue;
    return this.webdis.pop(key, callback);
  };

  Resque.prototype.get_value = function(hashtable, field, callback) {
    var key;

    key = "resque:" + hashtable;
    return this.webdis.get_value(key, field, callback);
  };

  Resque.prototype.inc_value = function(hashtable, field, increment) {
    var key;

    key = "resque:" + hashtable;
    return this.webdis.inc_value(key, field, increment.toString());
  };

  return Resque;

})();
/* 
 * example code
startup_callback = function(resque) {
  var moviemonster, moviemonsterandexit;

  queue.push("movies", {
    "name": "short circuit"
  });
  queue.push("movies", {
    "name": "star wars episode iv"
  });
  queue.push("movies", {
    "name": "star wars episode v"
  });
  queue.push("movies", {
    "name": "star wars episode vi"
  });
  moviemonster = function(movie) {
    return console.log("movie name is: " + movie.name);
  };
  queue.pop("movies", moviemonster);
  queue.pop("movies", moviemonster);
  moviemonsterandexit = function(movie) {
    moviemonster(movie);
    return phantom.exit();
  };
  return queue.pop("movies", moviemonsterandexit);
};

queue = new Resque("localhost", "7379", startup_callback);
*/
