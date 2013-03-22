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
      return self.startup_callback(self.resque);
    };
    onAlert = function(message) {
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

  Webdis.prototype.execute = function(url, callback, rediscmd) {
    var evil, evilargs, storedid;
    console.log("called execute");

    storedid = this.store_callback(callback);
    evilargs = {
      msgtoken: this.msgtoken,
      url: url,
      callbackid: storedid,
      rediscmd: rediscmd
    };
    evil = function(args) {
      var callbackid, msgtoken, supercallback;

      console.log("executing evil");
      msgtoken = args.msgtoken;
      url = args.url;
      callbackid = args.callbackid;
      rediscmd = args.rediscmd;
      supercallback = function(webdis_response) {
        var jsonified, payload;
        console.log("webdis said " + JSON.stringify(webdis_response));

        payload = {
          rediscmd: rediscmd,
          callbackid: callbackid,
          webdismsg: webdis_response
        };
        jsonified = JSON.stringify(payload);
        if (callbackid !== void 0 && callbackid !== null) {
          return alert(msgtoken + jsonified);
        }
      };
      console.log("calling supercallback with jquery");
      return window.$.get(url, supercallback);
    };
    return this.page.evaluate(evil, evilargs);
  };

  Webdis.prototype.construct_request = function(components) {
    var url;

    url = "http://" + this.host + ":" + this.port + "/" + components.map(encodeURIComponent).join("/");
    return url;
  };

  Webdis.prototype.store_callback = function(callback) {
    var id;

    id = Object.keys(this.callbacks).length;
    console.log("storing a callback at id" + id);
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
    console.log("called pop");
    return this.webdis.pop(key, callback);
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
