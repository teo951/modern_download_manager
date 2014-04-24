var mdbAlertFinalHeight;

var mdbSlide = {

  mdbSliderLoad: function() {
    sizeToContent();
    mdbAlertFinalHeight = window.outerHeight;
    window.outerHeight = 1;
    let x =(screen.availLeft + screen.availWidth - window.outerWidth) - 10;
    let y = screen.availTop + screen.availHeight - window.outerHeight;
    window.moveTo(x,y);
    window.focus();
    window.setTimeout(mdbSlide.mdbAnimateAlert, 25);
  },

  mdbAnimateAlert: function() {
    let mdbAlertSliderIncrement = 10;  //Amount the slider grows by (pixels)
    let mdbAlertSliderTime = 25;      //Time between increments (milliseconds)

    if(window.outerHeight < mdbAlertFinalHeight){
      window.screenY -= mdbAlertSliderIncrement;
      window.outerHeight += mdbAlertSliderIncrement;
      window.setTimeout(mdbSlide.mdbAnimateAlert, mdbAlertSliderTime);
    }
  },

  mdbOpenLink: function(URL) {
    if(!URL){return;}
    let ioservice = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
    let uriToOpen = ioservice.newURI(URL, null, null);
    let extps = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"].getService(Components.interfaces.nsIExternalProtocolService);
    let colon = URL.indexOf(":");
    let protocol = "???";
    if(colon > 0){protocol = URL.substr(0,colon)};
    if(extps.externalProtocolHandlerExists(protocol)){
    let info = extps.getProtocolHandlerInfo(protocol);
      extps.loadURI(uriToOpen, null);
    }else {
      alert("Don't know how to open "+URL);
    }
      return true;
  }
}