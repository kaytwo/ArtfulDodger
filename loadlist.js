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
  loadpages(temparray);
}

function loadpages(ar){

  console.log("spinning off job for " + JSON.stringify(ar));
  page = require('webpage').create();
  page.settings.loadImages = false;
  loadpage(ar);


  function loadpage(url) {
    // var page = require('webpage').create();
    var resources = [];
    
    // page.onConsoleMessage = function (msg) { console.log(msg); };

    page.onLoadStarted = function () {
      console.log("load started.");
      page.startTime = new Date();
    };

    page.onResourceRequested = function (req) {
      console.log("requested new item.");
      resources[req.id] = {
        request: req,
        startReply: null,
        endReply: null,
        result: null
      };
    };

    page.onResourceReceived = function (res) {
      if (res.stage === 'start') {
        resources[res.id].startReply = res;
      }
      if (res.stage === 'end') {
        // console.log("resources " + JSON.stringify(resources));
        resources[res.id].endReply = res;
      }
      resources[res.id].result = JSON.stringify(res);
    };

    page.onUrlChanged = function (res) {
      console.log("redirected: " + res);
    }

    page.open(url, function (status) {

      setTimeout(function (){
        // console.log("Loaded: " + page.url + " in " + (Date.now() - page.startTime) + " msec : " + array.length);
        resources.forEach(function (resource) {
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
