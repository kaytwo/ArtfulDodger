var fs = require('fs');
var system = require('system');
if (system.args.length > 1)
{
 fd = fs.open(system.args[1],'r')
 arrayOfUrls = fd.read().split("\n")
}

var i,j,temparray,chunk=10;
for(i = 1, j=arrayOfUrls.length; i<j; i+= chunk){
  temparray = arrayOfUrls.slice(i,i+chunk);
  console.log("spinning off job for " + JSON.stringify(temparray));
  loadpages(temparray);
}

function loadpages(ar){
  page = require('webpage').create();
  loadpage(arrayOfUrls);


  function loadpage(array) {
    // var page = require('webpage').create();
    page.loadme = array.shift();
    page.settings.loadImages = false;
    page.resources = [];

    // page.onConsoleMessage = function (msg) { console.log(msg); };

    page.onLoadStarted = function () {
      page.startTime = new Date();
    };

    page.onResourceRequested = function (req) {
      page.resources[req.id] = {
        request: req,
        startReply: null,
        endReply: null,
        result: null
      };
    };

    page.onResourceReceived = function (res) {
      if (res.stage === 'start') {
        page.resources[res.id].startReply = res;
      }
      if (res.stage === 'end') {
        page.resources[res.id].endReply = res;
      }
      page.resources[res.id].result = JSON.stringify(res);
    };

    page.onUrlChanged = function (res) {
      console.log("redirected: " + res);
    }

    page.open(page.loadme, function (status) {
      page.title = page.evaluate(function () {
        return document.title;
      });
      setTimeout(function (){
        // console.log("Loaded: " + page.url + " in " + (Date.now() - page.startTime) + " msec : " + array.length);
        page.resources.forEach(function (resource) {
            var request = resource.request;
            var startReply = resource.startReply;
            var endReply = resource.endReply;
           
            console.log(resource.result);

            if (!request || !startReply || !endReply) {
                return;
            }
        });
        // page.release();
        // delete page;

        if(array.length == 0) {
          console.log("finished");
           // phantom.exit();
        } else {
          loadpage(array);
        }
      },1000);
    });
  };
};
