window.currentScript = document.getElementsByTagName('script');
window.currentScript = window.currentScript[window.currentScript.length-1].src;
console.log("double nothing happened.");
document.getElementById('target').innerHTML = '<span>bangarang rufio!</span>';
// '<iframe src="test2.html></iframe>';
document.getElementById('derp2').src="evil3.html";
console.log("iframe created?");
