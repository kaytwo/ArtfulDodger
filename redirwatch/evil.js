// TODO: write a proxy that adds these two lines to the beginning of every 
// script included remotely
var currentScripts = document.getElementsByTagName('script');
window.currentScript = currentScripts[currentScripts.length-1].src;
function evil(){
  var evils = " \
  function metaEvil(){ \
    var elem" + "ent = document.createElement('iframe'); \
    element.id='derp'; \
    element.src='test.html'; \
    document.getElementsByTagName('body')[0].appendChild(element); \
  } \
  metaEvil();";
  eval(evils);
};
// document.getElementById('target').onclick = function(){evil();};
// evil();
window.setTimeout(evil,500);
console.log('evil1 finished.');
