Components.utils.import("resource://gre/modules/Downloads.jsm");
Components.utils.import("resource://gre/modules/DownloadUtils.jsm");
Components.utils.import("resource://gre/modules/osfile.jsm");
Components.utils.import("resource://gre/modules/Task.jsm");
Components.utils.import("resource://gre/modules/DownloadIntegration.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

var mdbOverlay = {

  prefs: Services.prefs.getBranch("extensions.mdownloadbar."),
  prompts: Services.prompt,
  wm: Services.wm,
  appInfo: Services.appinfo,
  vc: Services.vc,
  dn: false,
  popupopen: false,

  observe: function(subject, topic, data) {
    if (topic == 'nsPref:changed') {
      mdbOverlay.activKeyBindings();
      mdbOverlay.downmanagbutton();
    }
  },

  load: function() {
    document.getElementById("downloadsbar-mn").addEventListener("click",mdbOverlay.menuclick,false);

    var firstRun = mdbOverlay.prefs.getBoolPref("firstrun");
    if (firstRun) {
      let toolbar = document.getElementById("nav-bar");
      if (!toolbar.currentSet.match("downloadbar-ddnbr")) {
          var newset = toolbar.currentSet.concat(",downloadbar-ddnbr");
          toolbar.currentSet = newset;
          toolbar.setAttribute("currentset", newset);
          document.persist(toolbar.id, "currentset");
      }
      mdbOverlay.prefs.setBoolPref("firstrun", false);
    }

    let uiid=mdbOverlay.gtuiid();
    if(uiid=="downloadbar-bar") {
      document.getElementById("downloadbar-ddnbr").hidden=true;
      if(document.getElementById(uiid).getElementsByTagName("stack").length==0) document.getElementById(uiid).setAttribute("collapsed","true");
    } else if(uiid=="downloadbar-downloadpanel") {
      //document.getElementById("downloadbar-ddnbr").hidden=false;
      document.getElementById("downloadbar-bar").setAttribute("collapsed","true");
    }

    let brbckgrndclr=mdbOverlay.prefs.getCharPref("barbackgroundcolor");
    if(brbckgrndclr!=null) {
      document.getElementById("downloadbar-bar").style.setProperty("background-image", "linear-gradient(to bottom, "+ mdbOverlay.convert2RGBA(brbckgrndclr,0.59) +" 0%, "+ mdbOverlay.convert2RGBA(brbckgrndclr,1) +" 100%)", "important");
      document.getElementById("downloadbar-bar").style.setProperty("background-size", "100% auto", "important");
      document.getElementById("downloadbar-bar").style.setProperty("background-repeat", "no-repeat", "important");
    }

    document.getElementById("downloadbar-bar-clrbttn").hidden=mdbOverlay.prefs.getBoolPref("hideclearbutton");
    document.getElementById("downloadsbar-mn").hidden=mdbOverlay.prefs.getBoolPref("hidedownloadsbutton");

    try {
      Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");
    } catch (e) {}
    if (window && "undefined" != typeof (PrivateBrowsingUtils) && PrivateBrowsingUtils.privacyContextFromWindow) {
      var privacyContext = PrivateBrowsingUtils.privacyContextFromWindow(window);
      var isWindowPrivate = privacyContext.usePrivateBrowsing;
    } else {
      var privacyContext = null;
      var isWindowPrivate = false;
    }
    if(!isWindowPrivate) {
      try {
        var hstry=JSON.parse(this.c.readJSON());
      } catch (e) {
        this.c.writeJSON("{}");
        var hstry=JSON.parse(this.c.readJSON());
      }
      for (var i in hstry) {
        var hstryitem = hstry[i];
        hstry[i].startTime=new Date(hstry[i].startTime);//json date fix
        hstry[i].target.path=decodeURIComponent(hstry[i].target.path);
        hstry[i].source.url=decodeURIComponent(hstry[i].source.url);
        hstry[i].source.referrer=decodeURIComponent(hstry[i].source.referrer);
        hstry[i].showContainingDirectory = function D_showContainingDirectory() {
          return DownloadIntegration.showContainingDirectory(this.target.path);
        }
        hstry[i].launch = function() {
          if (!this.succeeded) {
            return Promise.reject(
            new Error("Launch can only be called if the download succeeded"));
          }
          return DownloadIntegration.launchDownload(this);
        }
        hstry[i].cancel = function() {
          mdbOverlay.deleteHistoryItem(this.id);
        }
        mdbOverlay.nwdltm(hstryitem);
        if(uiid=="downloadbar-bar") document.getElementById(uiid).setAttribute("collapsed","false");
      }
    } else {
      var rd=document;
      var enumerator = mdbOverlay.wm.getEnumerator("navigator:browser");
      while(enumerator.hasMoreElements()) {
        let window = enumerator.getNext();
        let document=window.document;
        try {
          Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");
        } catch (e) {}
        if (window && "undefined" != typeof (PrivateBrowsingUtils) && PrivateBrowsingUtils.privacyContextFromWindow) {
          var privacyContext = PrivateBrowsingUtils.privacyContextFromWindow(window);
          var isWindowPrivate = privacyContext.usePrivateBrowsing;
        } else {
          var privacyContext = null;
          var isWindowPrivate = false;
        }
        if(isWindowPrivate) {
          let uiid=mdbOverlay.gtuiid();
          let stcks=document.getElementById(uiid).getElementsByTagName("stack");
          if(stcks.length!=0) {
            for (var i=0;i<stcks.length;i++){
              let clonestck=rd.importNode(stcks[i],true);
              clonestck.dl=stcks[i].dl;
              if(uiid=="downloadbar-bar") rd.getElementById(uiid+"-wrbx").appendChild(clonestck);
              else if(uiid=="downloadbar-downloadpanel") rd.getElementById(uiid).appendChild(clonestck);
            }
            if(uiid=="downloadbar-bar") rd.getElementById(uiid).setAttribute("collapsed","false");
          }
          break;
        }
      }
    }
    let downitemwidth=mdbOverlay.prefs.getIntPref("downloaditemwidth");
    document.getElementById("downloadbar-pnlbll").width=downitemwidth;
    document.getElementById("downloadbar-downloadpanel").width=downitemwidth;

    let downitemheight=mdbOverlay.prefs.getIntPref("downloaditemheight");
    document.getElementById("downloadbar-pnlbll").height=downitemheight;

    let panelmaxheight=mdbOverlay.prefs.getIntPref("panelmaxheight");
    document.getElementById("downloadbar-panelbox").style.setProperty("max-height", panelmaxheight+"px", "important");
  },

  downmanagbutton: function() {
    if(mdbOverlay.vc.compare(mdbOverlay.appInfo.version, "28") <= 0){
      if(document.getElementById("downloads-button")!=null) {
        if(mdbOverlay.prefs.getBoolPref("hidedownmanagbutton")) {
          document.getElementById("downloads-button").hidden = true;
        } else {
          document.getElementById("downloads-button").hidden = false;
        }
      }
    }
    if(mdbOverlay.vc.compare(mdbOverlay.appInfo.version, "29") >= 0){
      if(mdbOverlay.prefs.getBoolPref("hidedownmanagbutton")) {
        CustomizableUI.removeWidgetFromArea("downloads-button");
      } else {
        let downButton = "downloads-button"
        CustomizableUI.addWidgetToArea(downButton, CustomizableUI.AREA_NAVBAR, 5);
      }
    }
  },

  hideMenuToolsItem: function() {
    if(mdbOverlay.vc.compare(mdbOverlay.appInfo.version, "29") >= 0){
      let enumerator = mdbOverlay.wm.getEnumerator("navigator:browser");
      while(enumerator.hasMoreElements()) {
        let window = enumerator.getNext();
        let document=window.document;
        let placement = CustomizableUI.getPlacementOfWidget("downloadbar-ddnbr");
        let area = placement && placement.area;
        if(area == CustomizableUI.AREA_PANEL){
          document.getElementById("downloadsbar-tls").hidden=true;
          document.getElementById("downloadbar-bar").removeChild(document.getElementById("mdb-keyset"))
        }
      }
    }
  },

  menuclick: function() {
    let mnPanel = document.getElementById("downloadsbar-downnloads-menu");
    let anchor = document.getElementById("downloadsbar-mn");
    mnPanel.openPopup(anchor, "bottomcenter topright", 0, 0, false, false);
  },

  buttonclick: function() {
    if(mdbOverlay.vc.compare(mdbOverlay.appInfo.version, "28") <= 0){
      let ddnbrPanel = document.getElementById("downloadbar-panel");
      let anchor = document.getElementById("downloadbar-ddnbr");
      if(mdbOverlay.popupopen==false){
        ddnbrPanel.openPopup(anchor, "bottomcenter topright", 0, 0, false, false);
        mdbOverlay.popupopen=true
      } else {
        ddnbrPanel.hidePopup();
        mdbOverlay.popupopen = false;
      }
    }
    if(mdbOverlay.vc.compare(mdbOverlay.appInfo.version, "29") >= 0){
      let placement = CustomizableUI.getPlacementOfWidget("downloadbar-ddnbr");
      let area = placement && placement.area;
      let areaType = area && CustomizableUI.getAreaType(area);
      let view = document.getElementById("downloadbar-auspanel");
      view.addEventListener("ViewShowing", PanelUI);
      view.addEventListener("ViewHiding", PanelUI);
      let anchor = document.getElementById("downloadbar-ddnbr");
      anchor.setAttribute("closemenu", "none");
      PanelUI.showSubView("downloadbar-auspanel", anchor, placement.area);
    }
  },

  panbutclick: function() {
    if(mdbOverlay.vc.compare(mdbOverlay.appInfo.version, "28") <= 0){
      let panbutclickMenu = document.getElementById("downloadsbar-downnloads-panbutclickmenu");
      let anchor = document.getElementById("downloadbar-controlsbutton");
      setTimeout(function(){panbutclickMenu.openPopup(anchor, "bottomcenter topright", 0, 0, false, false);},600);
    }
  },

  mouseOut: function() {
    let panbutclickMenu = document.getElementById("downloadsbar-downnloads-panbutclickmenu");
    setTimeout(function(){panbutclickMenu.hidePopup();},10000);
  },

  /*modePanel: function() {
    mdbOverlay.prefs.setCharPref("userinterface","panel");
    if(mdbOverlay.prefs.getCharPref("userinterface")=="panel"){
      let enumerator = mdbOverlay.wm.getEnumerator("navigator:browser");
      while(enumerator.hasMoreElements()) {
        let window = enumerator.getNext();
        let document=window.document;
        let stcks=document.getElementById("downloadbar-bar-wrbx").getElementsByTagName("stack");
        for(var i=stcks.length-1;i>=0;i--){
          document.getElementById("downloadbar-downloadpanel").insertBefore(stcks[i],document.getElementById("downloadbar-downloadpanel").firstChild);
        }
        document.getElementById("downloadbar-bar").setAttribute("collapsed","true");
        document.getElementById("downloadbar-ddnbr").hidden=false;
      }
    }
  },*/

  modePanel: function() {
    if(mdbOverlay.vc.compare(mdbOverlay.appInfo.version, "28") <= 0){
      mdbOverlay.prefs.setCharPref("userinterface","panel");
      if(mdbOverlay.prefs.getCharPref("userinterface")=="panel"){
        let enumerator = mdbOverlay.wm.getEnumerator("navigator:browser");
        while(enumerator.hasMoreElements()) {
          let window = enumerator.getNext();
          let document=window.document;
          let stcks=document.getElementById("downloadbar-bar-wrbx").getElementsByTagName("stack");
          for(var i=stcks.length-1;i>=0;i--){
            document.getElementById("downloadbar-downloadpanel").insertBefore(stcks[i],document.getElementById("downloadbar-downloadpanel").firstChild);
          }
          document.getElementById("downloadbar-bar").setAttribute("collapsed","true");
          document.getElementById("downloadbar-ddnbr").hidden=false;
        }
      }
    }
    if(mdbOverlay.vc.compare(mdbOverlay.appInfo.version, "29") >= 0){
      mdbOverlay.prefs.setCharPref("userinterface","panel");
      if(mdbOverlay.prefs.getCharPref("userinterface")=="panel"){
        let enumerator = mdbOverlay.wm.getEnumerator("navigator:browser");
        while(enumerator.hasMoreElements()) {
          let window = enumerator.getNext();
          let document=window.document;
          let stcks=document.getElementById("downloadbar-bar-wrbx").getElementsByTagName("stack");
          for(var i=stcks.length-1;i>=0;i--){
            document.getElementById("downloadbar-downloadpanel").insertBefore(stcks[i],document.getElementById("downloadbar-downloadpanel").firstChild);
          }
          document.getElementById("downloadbar-bar").setAttribute("collapsed","true");
        }
      }
    }
  },

  modeBar: function() {
    mdbOverlay.prefs.setCharPref("userinterface","bar");
    document.getElementById("downloadbar-panel").hidePopup();
    mdbOverlay.popupopen=false;
    if(mdbOverlay.prefs.getCharPref("userinterface")=="bar"){
      let enumerator = mdbOverlay.wm.getEnumerator("navigator:browser");
      while(enumerator.hasMoreElements()) {
        let window = enumerator.getNext();
        let document=window.document;
        let uiid=mdbOverlay.gtuiid();
        let stcks=document.getElementById("downloadbar-downloadpanel").getElementsByTagName("stack");
        document.getElementById("downloadbar-bar").setAttribute("collapsed","false");
        document.getElementById("downloadbar-ddnbr").hidden=true;
        for(var i=stcks.length-1;i>=0;i--){
          document.getElementById("downloadbar-bar-wrbx").insertBefore(stcks[i],document.getElementById("downloadbar-bar-wrbx").firstChild);
        }
        if(uiid=="downloadbar-bar" && document.getElementById(uiid).getElementsByTagName("stack").length==0){
          document.getElementById(uiid).setAttribute("collapsed","true");
        }
      }
    }
  },

  showfile: function() {
    let s=mdbOverlay.getStack(document.popupNode);
    s.dl.showContainingDirectory();
    if(s.getAttribute("downcompleted")=="true") {
      if(mdbOverlay.prefs.getBoolPref("clearaftershowfile")){
        var enumerator = mdbOverlay.wm.getEnumerator("navigator:browser");
        let sid=mdbOverlay.getStack(document.popupNode).id;
        while(enumerator.hasMoreElements()) {
          let window = enumerator.getNext();
          let document=window.document;
          let s=document.getElementById(sid);
          s.parentNode.removeChild(s);
          mdbOverlay.deleteHistoryItem(sid.replace("downloadbar-stack-",""));
          let uiid=mdbOverlay.gtuiid();
          if(uiid=="downloadbar-bar" && document.getElementById(uiid).getElementsByTagName("stack").length==0) document.getElementById(uiid).setAttribute("collapsed","true");
          if(document.getElementById("downloadbar-cntr")){
            let prgrscnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[0]);
            let cmpltcnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[1])-1;
            document.getElementById("downloadbar-cntr").setAttribute("value",prgrscnt+":"+cmpltcnt);
          }
        }
      }
    }
  },

  showtrgt: function() {
    let s=mdbOverlay.getStack(document.popupNode);
    s.dl.showContainingDirectory();
  },

  run: function() {
    if(mdbOverlay.getStack(document.popupNode).getAttribute("downcompleted")=="true") {
      let s=mdbOverlay.getStack(document.popupNode);
      s.dl.launch();
      if(mdbOverlay.prefs.getBoolPref("clearafterlaunch")){
        var enumerator = mdbOverlay.wm.getEnumerator("navigator:browser");
        let sid=mdbOverlay.getStack(document.popupNode).id;
        while(enumerator.hasMoreElements()) {
          let window = enumerator.getNext();
          let document=window.document;
          let s=document.getElementById(sid);
          s.parentNode.removeChild(s);
          mdbOverlay.deleteHistoryItem(sid.replace("downloadbar-stack-",""));
          let uiid=mdbOverlay.gtuiid();
          if(uiid=="downloadbar-bar" && document.getElementById(uiid).getElementsByTagName("stack").length==0) document.getElementById(uiid).setAttribute("collapsed","true");
          if(document.getElementById("downloadbar-cntr")){
            let prgrscnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[0]);
            let cmpltcnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[1])-1;
            document.getElementById("downloadbar-cntr").setAttribute("value",prgrscnt+":"+cmpltcnt);
          }
        }
      }
    }
  },

  start: function() {
    var isDownloadPrivate=mdbOverlay.isWindowPrivate(window);
    let s=mdbOverlay.getStack(document.popupNode);
    Task.spawn(function () {
      let list = yield Downloads.getList(Downloads.ALL);
      let dwnldlist=list._downloads;
      for(var j=0;j<dwnldlist.length;j++){
        if(dwnldlist[j].target.path==s.dl.target.path) {
          let download=dwnldlist[j];
          yield download.start();
          var enumerator = mdbOverlay.wm.getEnumerator("navigator:browser");
          let sid=s.id;
          while(enumerator.hasMoreElements()) {
            let window = enumerator.getNext();
            let document=window.document;

            let isWindowPrivate=mdbOverlay.isWindowPrivate(window);
            if(isWindowPrivate !=isDownloadPrivate) continue

            let s=document.getElementById(sid);
            s.setAttribute("paused","false");
          }
        }
      }
    }).then(null, Components.utils.reportError);
  },

  pause: function() {
    var isDownloadPrivate=mdbOverlay.isWindowPrivate(window);
    if(mdbOverlay.getStack(document.popupNode).getAttribute("downcompleted")!="true") {
      let s=mdbOverlay.getStack(document.popupNode);
      Task.spawn(function () {
        let list = yield Downloads.getList(Downloads.ALL);
        let dwnldlist=list._downloads;
        for(var j=0;j<dwnldlist.length;j++){
          if(dwnldlist[j].target.path==s.dl.target.path) {
            let download=dwnldlist[j];
            yield download.cancel();
            var enumerator = mdbOverlay.wm.getEnumerator("navigator:browser");
            let sid=s.id;
            while(enumerator.hasMoreElements()) {
              let window = enumerator.getNext();
              let document=window.document;

              let isWindowPrivate=mdbOverlay.isWindowPrivate(window);
              if(isWindowPrivate !=isDownloadPrivate) continue

              let s=document.getElementById(sid);
              s.setAttribute("paused","true");
              
              let hbx=document.getElementById("downloadbar-hbox-"+sid.replace("downloadbar-stack-",""));
              
              let dpclr=mdbOverlay.prefs.getCharPref("downloadpausecolor");
              if(dpclr == "null") {} else hbx.style.setProperty("background-image", "linear-gradient(to bottom, " + dpclr + " 0%, " + dpclr + " 100%)", "important");
            }
          }
        }
      }).then(null, Components.utils.reportError);
    }
  },

  pauseall: function() {
    var enumerator = mdbOverlay.wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;
      let uiid=mdbOverlay.gtuiid();
      let stcks=document.getElementById(uiid).getElementsByTagName("stack");
      for(var i=0;i<stcks.length;i++){
        if(stcks[i].getAttribute("downcompleted")!="true") {
          let s=stcks[i];
          Task.spawn(function() {
            let list = yield Downloads.getList(Downloads.ALL);
            let dwnldlist=list._downloads;
            for(var j=0;j<dwnldlist.length;j++){
              if(dwnldlist[j].target.path==s.dl.target.path) {
                let download=dwnldlist[j];
                yield download.cancel();
                let sid=s.id;
                s.setAttribute("paused","true");
                let hbx=document.getElementById("downloadbar-hbox-"+sid.replace("downloadbar-stack-",""));
                let dpclr=mdbOverlay.prefs.getCharPref("downloadpausecolor");
                if(dpclr == "null") {} else hbx.style.setProperty("background-image", "linear-gradient(to bottom, " + dpclr + " 0%, " + dpclr + " 100%)", "important");
              }
            }
          }).then(null, Components.utils.reportError);
        }
      }
    }
  },

  resumeall: function() {
    var enumerator = mdbOverlay.wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;
      let uiid=mdbOverlay.gtuiid();
      let stcks=document.getElementById(uiid).getElementsByTagName("stack");
      for(var i=0;i<stcks.length;i++){
        if(stcks[i].getAttribute("downcompleted")!="true") {
          let s=stcks[i];
          Task.spawn(function() {
            let list = yield Downloads.getList(Downloads.ALL);
            let dwnldlist=list._downloads;
            for(var j=0;j<dwnldlist.length;j++){
              if(dwnldlist[j].target.path==s.dl.target.path) {
                let sid=s.id;
                s.setAttribute("paused","false");
                let download=dwnldlist[j];
                yield download.start();
              }
            }
          }).then(null, Components.utils.reportError);
        }
      }
    }
  },

  cancelall: function() {
    let document=window.document;
    let uiid=mdbOverlay.gtuiid();
    let stcks=document.getElementById(uiid).getElementsByTagName("stack");
    for(var i=stcks.length-1;i>=0;i--){
      if(stcks[i].getAttribute("downcompleted")!="true") {
        let s=stcks[i];
        Task.spawn(function() {
          let list = yield Downloads.getList(Downloads.ALL);
          let dwnldlist=list._downloads;
          for(var j=0;j<dwnldlist.length;j++){
            if(dwnldlist[j].target.path==s.dl.target.path) {
              let download=dwnldlist[j];
              yield list.remove(download);
              yield download.finalize(true);
            }
          }
        }).then(null, Components.utils.reportError);
      }
    }
    mdbOverlay.dwnldpnlpopdisplay();
  },

  cancel: function() {
    var isDownloadPrivate=mdbOverlay.isWindowPrivate(window);
    if(mdbOverlay.getStack(document.popupNode).getAttribute("downcompleted")!="true") {
      let s=mdbOverlay.getStack(document.popupNode);
      Task.spawn(function() {
        let list = yield Downloads.getList(Downloads.ALL);
        let dwnldlist=list._downloads;
        for(var j=0;j<dwnldlist.length;j++){
          if(dwnldlist[j].target.path==s.dl.target.path) {
            let download=dwnldlist[j];
            yield list.remove(download);
            yield download.finalize(true);
            return;
          }
        }
        var enumerator = mdbOverlay.wm.getEnumerator("navigator:browser");
        let sid=s.id;
        while(enumerator.hasMoreElements()) {
          let window = enumerator.getNext();
          let document=window.document;
          let isWindowPrivate=mdbOverlay.isWindowPrivate(window);
          if(isWindowPrivate !=isDownloadPrivate) continue

          let s=document.getElementById(sid);
          s.parentNode.removeChild(s);
          mdbOverlay.deleteHistoryItem(sid.replace("downloadbar-stack-",""));
          let uiid=mdbOverlay.gtuiid();
          if(uiid=="downloadbar-bar" && document.getElementById(uiid).getElementsByTagName("stack").length==0) document.getElementById(uiid).setAttribute("collapsed","true");
          if(document.getElementById("downloadbar-cntr")){
            let prgrscnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[0]);
            let cmpltcnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[1])-1;
            document.getElementById("downloadbar-cntr").setAttribute("value",prgrscnt+":"+cmpltcnt);
          }
        }
      }).then(null, Components.utils.reportError);
    }
    mdbOverlay.dwnldpnlpopdisplay();
  },

  getStack: function(dp) {
    let d=dp;
    while(d.nodeName!="stack"){
      d=d.parentNode;
    }
    return d;
  },

  clear: function() {
    var isDownloadPrivate=mdbOverlay.isWindowPrivate(window);
    if(mdbOverlay.getStack(document.popupNode).getAttribute("downcompleted")=="true") {
      let s=mdbOverlay.getStack(document.popupNode);

      Task.spawn(function() {
        let list = yield Downloads.getList(Downloads.ALL);
        let dwnldlist=list._downloads;
        for(var j=0;j<dwnldlist.length;j++){
          if(dwnldlist[j].target.path==s.dl.target.path) {
            let download=dwnldlist[j];
            yield list.remove(download);
            return;
          }
        }
      var enumerator = mdbOverlay.wm.getEnumerator("navigator:browser");
      let sid=s.id;
      while(enumerator.hasMoreElements()) {
        let window = enumerator.getNext();
        let document=window.document;

        let isWindowPrivate=mdbOverlay.isWindowPrivate(window);
        if(isWindowPrivate !=isDownloadPrivate) continue

        let s=document.getElementById(sid);
        s.parentNode.removeChild(s);
        mdbOverlay.deleteHistoryItem(sid.replace("downloadbar-stack-",""));
        let uiid=mdbOverlay.gtuiid();
        if(uiid=="downloadbar-bar" && document.getElementById(uiid).getElementsByTagName("stack").length==0) document.getElementById(uiid).setAttribute("collapsed","true");
        if(uiid=="downloadbar-downloadpanel" && document.getElementById(uiid).getElementsByTagName("stack").length==0) document.getElementById("downloadbar-panel").hidePopup();
        mdbOverlay.popupopen=false;
        if(document.getElementById("downloadbar-cntr")){
          let prgrscnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[0]);
          let cmpltcnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[1])-1;
          document.getElementById("downloadbar-cntr").setAttribute("value",prgrscnt+":"+cmpltcnt);
        }
      }
      }).then(null, Components.utils.reportError);
    }
    mdbOverlay.dwnldpnlpopdisplay();
  },

  clearall: function() {
    var isDownloadPrivate=mdbOverlay.isWindowPrivate(window);
    let uiid=mdbOverlay.gtuiid();
    let stcks=document.getElementById(uiid).getElementsByTagName("stack");
    for(var i=stcks.length-1;i>=0;i--){
      if(stcks[i].getAttribute("downcompleted")=="true") {
        let s=stcks[i];
        Task.spawn(function() {
          let list = yield Downloads.getList(Downloads.ALL);
          let dwnldlist=list._downloads;
          for(var j=0;j<dwnldlist.length;j++){
            if(dwnldlist[j].target.path==s.dl.target.path) {
              let download=dwnldlist[j];
              yield list.remove(download);
              return;
            }
          }
          var enumerator = mdbOverlay.wm.getEnumerator("navigator:browser");
          let sid=s.id;
          while(enumerator.hasMoreElements()) {
            let window = enumerator.getNext();
            let document=window.document;
            
            let isWindowPrivate=mdbOverlay.isWindowPrivate(window);
            if(isWindowPrivate !=isDownloadPrivate) continue
            
            let s=document.getElementById(sid);
            s.parentNode.removeChild(s);
            mdbOverlay.deleteHistoryItem(sid.replace("downloadbar-stack-",""));
            let uiid=mdbOverlay.gtuiid();
            if(uiid=="downloadbar-bar" && document.getElementById(uiid).getElementsByTagName("stack").length==0) document.getElementById(uiid).setAttribute("collapsed","true");
            if(uiid=="downloadbar-downloadpanel" && document.getElementById(uiid).getElementsByTagName("stack").length==0) document.getElementById("downloadbar-panel").hidePopup();
            mdbOverlay.popupopen=false;
            if(document.getElementById("downloadbar-cntr")){
              let prgrscnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[0]);
              let cmpltcnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[1])-1;
              document.getElementById("downloadbar-cntr").setAttribute("value",prgrscnt+":"+cmpltcnt);
            }
          }
        }).then(null, Components.utils.reportError);
      }
    }
    mdbOverlay.dwnldpnlpopdisplay();
  },

  pop: function(event) {
    if(event.target.id!=event.currentTarget.id) return;
    let s=mdbOverlay.getStack(document.popupNode);
    document.getElementById("downloadsbar-slmenu").hidden=!s.dl.succeeded;
    document.getElementById("downloadsbar-chksm").hidden=!s.dl.succeeded;
    document.getElementById("downloadsbar-rnm").hidden=!s.dl.succeeded;
    document.getElementById("downloadsbar-sendto").hidden=!s.dl.succeeded;
    document.getElementById("downloadsbar-dltfl").hidden=!s.dl.succeeded;
    document.getElementById("downloadsbar-slmenusp").hidden=!s.dl.succeeded;
    document.getElementById("downloadsbar-gtdwnlpg").disabled=s.getAttribute("sourcereferrer")=="null";
    document.getElementById("downloadsbar-cncl").hidden=s.dl.succeeded;
    document.getElementById("downloadsbar-strt").hidden=!s.dl.canceled;
    document.getElementById("downloadsbar-pause").hidden=s.getAttribute("downcompleted")=="true" || s.dl.canceled;
    document.getElementById("downloadsbar-ctnsmns").hidden=s.getAttribute("downcompleted")=="true" || s.dl.canceled;
  },

  pnlpop: function(event) {
    let s=mdbOverlay.getStack(document.popupNode);
    event.target.setAttribute("activeid",s.getAttribute("id").replace("downloadbar-stack-",""));
    let dl=s.dl;
    let basename=OS.Path.basename(dl.target.path);
    let sourceurl=dl.source.url;
    let target=dl.target.path;
    let crrntspd=parseInt(dl.speed/1000);
    let progress=dl.progress+"%";

    let filesize=DownloadUtils.convertByteUnits(dl.totalBytes)[0];
    let filesizeunit=DownloadUtils.convertByteUnits(dl.totalBytes)[1];
    let downloadedsize=DownloadUtils.convertByteUnits(dl.currentBytes)[0];
    let downloadedsizeunit=DownloadUtils.convertByteUnits(dl.currentBytes)[1];

    let elapsedseconds=(parseInt(s.getAttribute("endtime")) - dl.startTime.getTime())/1000;
    let averagespeed=parseInt(dl.totalBytes/elapsedseconds/1000);

    function normalizetime(time) {
      return time[0]+" "+time[1]+" "+(time[2] ? time[2] : "")+" "+(time[3] ? time[3] : "");
    }

    let remainingtime=DownloadUtils.convertTimeUnits(parseInt((dl.totalBytes - dl.currentBytes)/dl.speed));
    let normalizedremainingtime=normalizetime(remainingtime);

    let downloadtime=DownloadUtils.convertTimeUnits(elapsedseconds);
    let normalizeddownloadtime=normalizetime(downloadtime);

    document.getElementById("downloadbar-itempanel-imgcn").setAttribute("src","moz-icon://"+dl.target.path+"?size=32");
    document.getElementById("downloadbar-itempanel-flnmbl").setAttribute("value",basename);

    if(event.target.getAttribute("leftclick")=="true") document.getElementById("downloadbar-itempanel-srclbl").classList.add("text-link");
    document.getElementById("downloadbar-itempanel-srclbl").setAttribute("value",sourceurl);

    if(event.target.getAttribute("leftclick")=="true") document.getElementById("downloadbar-itempanel-trgtlbl").classList.add("text-link");
    document.getElementById("downloadbar-itempanel-trgtlbl").setAttribute("value",target);

    if(event.target.getAttribute("leftclick")=="true") document.getElementById("downloadbar-itempanel-closebutton").classList.add("close-icon");
    
    document.getElementById("downloadbar-itempanel-vrgspdnmhb").hidden=!(s.getAttribute("downcompleted")=="true");
    document.getElementById("downloadbar-itempanel-vrgspdvlhb").hidden=!(s.getAttribute("downcompleted")=="true");
    document.getElementById("downloadbar-itempanel-vrgspdlbl").setAttribute("value",(averagespeed!=0) ? averagespeed+" KB/s" : " - ");

    document.getElementById("downloadbar-itempanel-crrntspdnmhb").hidden=(s.getAttribute("downcompleted")=="true");
    document.getElementById("downloadbar-itempanel-crrntspdvlhb").hidden=(s.getAttribute("downcompleted")=="true");
    document.getElementById("downloadbar-itempanel-crrntspdlbl").setAttribute("value",(crrntspd!=0) ? crrntspd+" KB" : " - ");

    document.getElementById("downloadbar-itempanel-pgrsslbl").setAttribute("value",progress);

    document.getElementById("downloadbar-itempanel-dwnldtmnmhb").hidden=!(s.getAttribute("downcompleted")=="true");
    document.getElementById("downloadbar-itempanel-dwnldtmvlhb").hidden=!(s.getAttribute("downcompleted")=="true");
    document.getElementById("downloadbar-itempanel-dwnldtmlbl").setAttribute("value",normalizeddownloadtime);

    document.getElementById("downloadbar-itempanel-rmngtmnmhb").hidden=(s.getAttribute("downcompleted")=="true");
    document.getElementById("downloadbar-itempanel-rmngtmvlhb").hidden=(s.getAttribute("downcompleted")=="true");
    document.getElementById("downloadbar-itempanel-rmngtmlbl").setAttribute("value",(!isNaN(parseInt((dl.totalBytes - dl.currentBytes)/dl.speed))) ? normalizedremainingtime : " - ");

    document.getElementById("downloadbar-itempanel-dwnldbytnmhb").hidden=(s.getAttribute("downcompleted")=="true");
    document.getElementById("downloadbar-itempanel-dwnldbytvlhb").hidden=(s.getAttribute("downcompleted")=="true");
    document.getElementById("downloadbar-itempanel-dwnldbytlbl").setAttribute("value",downloadedsize +" "+ downloadedsizeunit+" / "+filesize +" "+ filesizeunit);

    document.getElementById("downloadbar-itempanel-flsznmhb").hidden=!(s.getAttribute("downcompleted")=="true");
    document.getElementById("downloadbar-itempanel-flszvlhb").hidden=!(s.getAttribute("downcompleted")=="true");
    document.getElementById("downloadbar-itempanel-flszlbl").setAttribute("value",filesize +" "+ filesizeunit);

    let flext=basename.substring(basename.lastIndexOf(".")+1, basename.length);
    if(flext=="jpg" || flext=="jpeg" || flext=="gif" || flext=="png" || flext=="bmp") {
      document.getElementById("downloadbar-ppprvwimgwrp").hidden=!(s.getAttribute("downcompleted")=="true");
      if(event.target.getAttribute("leftclick")=="true") document.getElementById("downloadbar-ppprvwimg").style.setProperty("cursor","pointer","important");

      var file = Components.classes["@mozilla.org/file/local;1"]
                 .createInstance(Components.interfaces.nsILocalFile);
      file.initWithPath(dl.target.path);
      var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                      .getService(Components.interfaces.nsIIOService)
      document.getElementById("downloadbar-ppprvwimg").style.setProperty("background-image", "url('"+ioService.newFileURI(file).spec+"')", "important");
    } else {
      document.getElementById("downloadbar-ppprvwimgwrp").hidden=true;
    }
    document.getElementById("downloadbar-itempanel-flhshnmhb").hidden=!(s.getAttribute("downcompleted")=="true");
    document.getElementById("downloadbar-itempanel-flhshlbl").hidden=!(s.getAttribute("downcompleted")=="true");
    if(s.getAttribute("downcompleted")=="true"){
      if(!s.hasAttribute("MD5")) {
        document.getElementById("downloadbar-itempanel-flhshlbl").setAttribute("value",document.getElementById("downloadbar-prprts").getString("clcltng")+"… 0%");
        mdbOverlay.Chksm.clcltHash(dl.target.path,"MD5",s);
      } else document.getElementById("downloadbar-itempanel-flhshlbl").setAttribute("value",s.getAttribute("MD5"));
    }
  },

  pnlhid: function(event) {
    event.target.setAttribute("activeid","");
    event.target.setAttribute("leftclick","false");
    document.getElementById("downloadbar-itempanel-srclbl").classList.remove("text-link");
    document.getElementById("downloadbar-itempanel-trgtlbl").classList.remove("text-link");
    document.getElementById("downloadbar-ppprvwimg").style.removeProperty("cursor");
    document.getElementById("downloadbar-itempanel-closebutton").classList.remove("close-icon");
    mdbOverlay.Chksm.cancel();
  },

  closebar: function() {
    let uiid=mdbOverlay.gtuiid();
    if(uiid=="downloadbar-bar") document.getElementById(uiid).setAttribute("collapsed","true");
  },

  pndwnldtb: function() {
    gBrowser.selectedTab = gBrowser.addTab("about:downloads", {
      relatedToCurrent: true
    });
  },

  shwlldwnldshstry:function() {
    DownloadsPanel.showDownloadsHistory();
  },

  scan: function() {
    var p=mdbOverlay.prefs.getCharPref("viruscanpath");
    if(p==""){
      var result = mdbOverlay.prompts.confirm(null, "Modern Download Manager", document.getElementById("downloadbar-prprts").getString("vrscnnrlnfrst"));
      if(result){
        const nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        fp.init(window, document.getElementById("downloadbar-prprts").getString("lctvrsscnnr") , nsIFilePicker.modeOpen);
        var rv = fp.show();
        if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
          mdbOverlay.prefs.setComplexValue("viruscanpath", Components.interfaces.nsILocalFile, fp.file);
        }
      } else return;
    }
    let viruscanpath=mdbOverlay.prefs.getComplexValue("viruscanpath", Components.interfaces.nsILocalFile).path;
    let virusarguments=mdbOverlay.prefs.getCharPref("virusscanarguments");
    let s=mdbOverlay.getStack(document.popupNode);
    if(virusarguments.search(/%1/g)!=-1){
      // create an nsIFile for the executable
      var file = Components.classes["@mozilla.org/file/local;1"]
                 .createInstance(Components.interfaces.nsIFile);
      file.initWithPath(viruscanpath);
      // create an nsIProcess
      var process = Components.classes["@mozilla.org/process/util;1"]
                    .createInstance(Components.interfaces.nsIProcess);
      process.init(file);
      /* Run the process.
       If first param is true, calling thread will be blocked until called process terminates.
       Second and third params are used to pass command-line arguments to the process.*/
      var args = virusarguments.split(" ");
      for (var i=0; i<args.length; ++i) {
        args[i] = args[i].replace(/%1/g, s.dl.target.path);
      }
      process.run(false, args, args.length);
    } else {
      s.dl.launcherPath=viruscanpath;
      s.dl.launch();
      s.dl.launcherPath=null;
    }
  },

  enable: function() {
    let s=mdbOverlay.getStack(document.popupNode);
    s.dl.launcherPath="C:\\Program Files (x86)\\Malwarebytes' Anti-Malware\\mbam.exe";
    s.dl.launch();
  },

  disable: function() {
    let s=mdbOverlay.getStack(document.popupNode);
    s.dl.launcherPath=null;
    s.dl.launch();
  },

  pnptns: function() {
    gBrowser.selectedTab = gBrowser.addTab("chrome://downloadbar/content/options.xul", {
      relatedToCurrent: true
    });
  },

  pnptnsdlg: function() {
    let features = "chrome,titlebar,toolbar,centerscreen,resizable,";
    window.openDialog("chrome://downloadbar/content/options.xul", "Modern Download Manager options", features);
  },

  checksum: function() {
    let s=mdbOverlay.getStack(document.popupNode);
    let cw=window.openDialog("chrome://downloadbar/content/checksum.xul", "Checksum", "left=30,top=300,alwaysRaised,chrome,titlebar=no",s.dl.target.path,"MD5");
    cw.focus();
  },

  tgglbr: function() {
    let uiid="downloadbar-bar";
    document.getElementById(uiid).collapsed=!document.getElementById(uiid).collapsed;
  },

  gtdwnlpg: function() {
    let s=mdbOverlay.getStack(document.popupNode);
    gBrowser.selectedTab=gBrowser.addTab(s.getAttribute("sourcereferrer"), {
      relatedToCurrent: true
    });
  },

  gtsrc: function() {
    let s=mdbOverlay.getStack(document.popupNode);
    gBrowser.selectedTab=gBrowser.addTab(s.getAttribute("sourceurl"), {
      relatedToCurrent: true
    });
  },

  pnprvw: function() {
    let s=mdbOverlay.getStack(document.popupNode);
    var file = Components.classes["@mozilla.org/file/local;1"]
               .createInstance(Components.interfaces.nsILocalFile);
    file.initWithPath(s.dl.target.path);
    var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                    .getService(Components.interfaces.nsIIOService);
    gBrowser.selectedTab=gBrowser.addTab(ioService.newFileURI(file).spec, {
      relatedToCurrent: true
    });
  },

  cpydwnldlnk: function() {
    let s=mdbOverlay.getStack(document.popupNode);
    const gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
                             .getService(Components.interfaces.nsIClipboardHelper);
    gClipboardHelper.copyString(s.getAttribute("sourceurl"));
  },

  dblclckclrll: function(event) {
    if(event.button != 2 && event.target.id=="downloadbar-bar-wrbx" && event.currentTarget.id=="downloadbar-bar-wrbx" && document.getAnonymousElementByAttribute(document.getElementById("downloadbar-bar-wrbx"), "anonid", "scrollbutton-up").collapsed == true){
      mdbOverlay.clearall(event);
    }
  },

  rghtClckMn: function(event) {
    if (event.button == 2 && event.target.id=="downloadbar-bar-wrbx" && event.currentTarget.id=="downloadbar-bar-wrbx") {
      document.getElementById("downloadsbar-downnloads-menu").openPopupAtScreen(event.screenX, event.screenY, true)
    }
  },

  dltfl: function(event) {
    var isDownloadPrivate=mdbOverlay.isWindowPrivate(window);

    if(mdbOverlay.prefs.getBoolPref("askconfirmationbeforedelete")) {
      var result = mdbOverlay.prompts.confirm(null, "Modern Download Manager", document.getElementById("downloadbar-prprts").getString("dltflfrst"));
      if(!result) return;
    }

    let s=mdbOverlay.getStack(document.popupNode);
    var file = Components.classes["@mozilla.org/file/local;1"]
               .createInstance(Components.interfaces.nsILocalFile);
    file.initWithPath(s.dl.target.path);
    if(file.exists()){
      file.remove(true);
    }
    var enumerator = mdbOverlay.wm.getEnumerator("navigator:browser");
    let sid=mdbOverlay.getStack(document.popupNode).id;
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;

      let isWindowPrivate=mdbOverlay.isWindowPrivate(window);
      if(isWindowPrivate !=isDownloadPrivate) continue

      let s=document.getElementById(sid);
      s.parentNode.removeChild(s);
      mdbOverlay.deleteHistoryItem(sid.replace("downloadbar-stack-",""));
      let uiid=mdbOverlay.gtuiid();
      if(uiid=="downloadbar-bar" && document.getElementById(uiid).getElementsByTagName("stack").length==0) document.getElementById(uiid).setAttribute("collapsed","true");
      if(document.getElementById("downloadbar-cntr")){
        let prgrscnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[0]);
        let cmpltcnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[1])-1;
        document.getElementById("downloadbar-cntr").setAttribute("value",prgrscnt+":"+cmpltcnt);
      }
    }
    mdbOverlay.dwnldpnlpopdisplay();
  },

  onRenameAccept: function(s,filename) {
    var isDownloadPrivate=mdbOverlay.isWindowPrivate(window);
    var file = Components.classes["@mozilla.org/file/local;1"]
               .createInstance(Components.interfaces.nsILocalFile);
    file.initWithPath(s.dl.target.path);
    let result=true;
    if(result){
      if(filename != OS.Path.basename(s.dl.target.path)) {
        try {
          file.moveTo(null, filename);
        } catch (e) {
          return
        }
        var enumerator = mdbOverlay.wm.getEnumerator("navigator:browser");
        let sid=s.id;
        while(enumerator.hasMoreElements()) {
          let window = enumerator.getNext();
          let document=window.document;

          let isWindowPrivate=mdbOverlay.isWindowPrivate(window);
          if(isWindowPrivate !=isDownloadPrivate) continue

          let s=document.getElementById(sid);
          s.dl.target.path=file.path;

          if(!isWindowPrivate) mdbOverlay.updateHistoryItem(sid.replace("downloadbar-stack-",""),s.dl);
          let l=document.getElementById("downloadbar-label-"+sid.replace("downloadbar-stack-",""));
          l.setAttribute("value",filename);
        }
      }
    }
  },

  rnmnw: function() {
    let s=mdbOverlay.getStack(document.popupNode);
    let cw=window.openDialog("chrome://downloadbar/content/rename.xul", "Rename", "centerscreen,chrome,resizable",s);
    cw.focus();
  },

  gtuiid: function() {
    let uiid;
    if(mdbOverlay.prefs.getCharPref("userinterface")=="bar") uiid="downloadbar-bar";
    else if(mdbOverlay.prefs.getCharPref("userinterface")=="panel") uiid="downloadbar-downloadpanel";
    return uiid;
  },

  dwnldpnlpop: function() {
    let panelcontain=document.getElementById("downloadbar-downloadpanel");
    if(panelcontain.getElementsByTagName("stack").length){
      document.getElementById("downloadbar-pnlbll").hidden=true;
    }
  },

  dwnldpnlpopdisplay: function() {
    let panelcontain=document.getElementById("downloadbar-downloadpanel");
    if(panelcontain.getElementsByTagName("stack").length==0){
      document.getElementById("downloadbar-pnlbll").hidden=false;
    }
  },

  drgstrt: function(event) {
    let s=event.currentTarget;
    var file = Components.classes["@mozilla.org/file/local;1"]
               .createInstance(Components.interfaces.nsILocalFile);
    file.initWithPath(s.dl.target.path);
    let dataTransfer = event.dataTransfer;
    dataTransfer.mozSetDataAt("application/x-moz-file", file, 0);
    dataTransfer.setDragImage(s, 30, 10);
    dataTransfer.effectAllowed = "copyMove";
  },

  deleteHistoryItem: function(id) {
    try {
      var hstry=JSON.parse(this.c.readJSON());
    } catch (e) {
      this.c.writeJSON("{}");
      var hstry=JSON.parse(this.c.readJSON());
    }
    delete hstry[id];
    this.c.writeJSON(JSON.stringify(hstry));
  },

  updateHistoryItem: function(id,dl) {
    try {
      var hstry=JSON.parse(this.c.readJSON());
    } catch (e) {
      this.c.writeJSON("{}");
      var hstry=JSON.parse(this.c.readJSON());
    }
    hstry[id].target={path : encodeURIComponent(dl.target.path)};
    this.c.writeJSON(JSON.stringify(hstry));
    mdbOverlay.dwnldpnlpop();
  },

  stckclck: function(event) {
    if(event.button==0){
      let window=event.currentTarget.ownerDocument.defaultView;
      let document=event.currentTarget.ownerDocument;
      let stckWdth=parseInt(window.getComputedStyle(event.currentTarget,null).getPropertyValue("width"));
      event.currentTarget.ownerDocument.getElementById("downloadbar-itempanel").setAttribute("leftclick","true");
      event.currentTarget.ownerDocument.getElementById("downloadbar-itempanel").openPopup(event.currentTarget, "before_start", parseInt(stckWdth/2), 0, false, false, event);
    } else if(event.button==1) {
      if(event.currentTarget.getAttribute("downcompleted")=="true") {
        var enumerator = mdbOverlay.wm.getEnumerator("navigator:browser");
        let sid=event.currentTarget.id;
        while(enumerator.hasMoreElements()) {
          let window = enumerator.getNext();
          let document=window.document;
          let s=document.getElementById(sid);
          s.parentNode.removeChild(s);
          mdbOverlay.deleteHistoryItem(sid.replace("downloadbar-stack-",""));
          let uiid=mdbOverlay.gtuiid();
          if(uiid=="downloadbar-bar" && document.getElementById(uiid).getElementsByTagName("stack").length==0) document.getElementById(uiid).setAttribute("collapsed","true");
          if(document.getElementById("downloadbar-cntr")){
            let prgrscnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[0]);
            let cmpltcnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[1])-1;
            document.getElementById("downloadbar-cntr").setAttribute("value",prgrscnt+":"+cmpltcnt);
          }
        }
      }
    }
    mdbOverlay.dwnldpnlpopdisplay();
  },

  stckdbclck: function(event) {
    if(mdbOverlay.prefs.getCharPref("doubleclickaction")=="Launch"){
      let s=event.currentTarget;
      if(s.getAttribute("downcompleted")=="true") {
        s.dl.launch();
        if(mdbOverlay.prefs.getBoolPref("clearafterlaunch")){
          var enumerator = mdbOverlay.wm.getEnumerator("navigator:browser");
          let sid=s.id;
          while(enumerator.hasMoreElements()) {
            let window = enumerator.getNext();
            let document=window.document;
            let s=document.getElementById(sid);
            s.parentNode.removeChild(s);
            mdbOverlay.deleteHistoryItem(sid.replace("downloadbar-stack-",""));
            let uiid;
            if(mdbOverlay.prefs.getCharPref("userinterface")=="bar") uiid="downloadbar-bar";
            else if(mdbOverlay.prefs.getCharPref("userinterface")=="panel") uiid="downloadbar-downloadpanel";

            if(uiid=="downloadbar-bar" && document.getElementById(uiid).getElementsByTagName("stack").length==0) document.getElementById(uiid).setAttribute("collapsed","true");
            if(document.getElementById("downloadbar-cntr")){
              let prgrscnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[0]);
              let cmpltcnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[1])-1;
              document.getElementById("downloadbar-cntr").setAttribute("value",prgrscnt+":"+cmpltcnt);
            }
          }
        }
      }
    }else if(mdbOverlay.prefs.getCharPref("doubleclickaction")=="Show File") {
      let s=event.currentTarget;
      s.dl.showContainingDirectory();
      if(s.getAttribute("downcompleted")=="true") {
        if(mdbOverlay.prefs.getBoolPref("clearaftershowfile")){
          var enumerator = mdbOverlay.wm.getEnumerator("navigator:browser");
          let sid=s.id;
          while(enumerator.hasMoreElements()) {
            let window = enumerator.getNext();
            let document=window.document;
            let s=document.getElementById(sid);
            s.parentNode.removeChild(s);
            mdbOverlay.deleteHistoryItem(sid.replace("downloadbar-stack-",""));
            let uiid=mdbOverlay.gtuiid();
            if(uiid=="downloadbar-bar" && document.getElementById(uiid).getElementsByTagName("stack").length==0) document.getElementById(uiid).setAttribute("collapsed","true");
            if(document.getElementById("downloadbar-cntr")){
              let prgrscnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[0]);
              let cmpltcnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[1])-1;
              document.getElementById("downloadbar-cntr").setAttribute("value",prgrscnt+":"+cmpltcnt);
            }
          }
        }
      }
    }
  },

  nwdltm: function(hstryitem) {
    let download=hstryitem;
    let uiid;
    if(mdbOverlay.prefs.getCharPref("userinterface")=="bar") uiid="downloadbar-bar";
    else if(mdbOverlay.prefs.getCharPref("userinterface")=="panel") uiid="downloadbar-downloadpanel";

    let dl=download;
    let basename=OS.Path.basename(dl.target.path);
    let dlid=hstryitem.id;
    let stck=document.createElement("stack");
    stck.setAttribute("id","downloadbar-stack-"+dlid);
    stck.setAttribute("class","downloadbar-dwnldtmstck");
    stck.setAttribute("context","downloadsbar-statusbar-menu");
    let dwnldbckgrndclr=mdbOverlay.prefs.getCharPref("downloadbackgroundcolor");
    if(dwnldbckgrndclr!="null") stck.setAttribute("style","background-image:linear-gradient(to bottom, "+mdbOverlay.convert2RGBA(dwnldbckgrndclr,0.59)+" 0%, "+mdbOverlay.convert2RGBA(dwnldbckgrndclr,1)+" 100%) !important;background-size:100% auto;background-repeat:no-repeat;");
    else stck.setAttribute("style","background-image: linear-gradient(to bottom, rgba(255, 255, 255, 0.59) 0%, rgb(255, 255, 255) 100%) ! important; background-size: 100% auto; background-repeat: no-repeat;background-color:rgba(143,144,152,1) !important;border:1px solid #98a7ad !important;");
    stck.setAttribute("tooltip","downloadbar-itempanel");

    let dwbldtmwdth=mdbOverlay.prefs.getIntPref("downloaditemwidth");
    if(dwbldtmwdth!="null") stck.style.setProperty("max-width", dwbldtmwdth+"px", "important");

    let dwbldtmhght=mdbOverlay.prefs.getIntPref("downloaditemheight");
    if(dwbldtmhght!="null") stck.style.setProperty("height", dwbldtmhght+"px", "important");

    stck.setAttribute("flex","1");
    stck.setAttribute("downcompleted","false");
    stck.setAttribute("paused","false");
    stck.setAttribute("sourceurl",dl.source.url);
    stck.setAttribute("sourcereferrer",dl.source.referrer);
    stck.addEventListener("dblclick",function(event){mdbOverlay.stckdbclck(event);},false);
    stck.addEventListener("click",function(event){mdbOverlay.stckclck(event);},false);

    let hbx=document.createElement("hbox");
    hbx.setAttribute("id","downloadbar-hbox-"+dlid);
    hbx.setAttribute("flex","1");
    hbx.setAttribute("align","stretch");

    let dpclr=mdbOverlay.prefs.getCharPref("downloadprogresscolor");
    if(dpclr=="null") hbx.setAttribute("style","background-image: linear-gradient(to bottom, #cdeb8e 0%,#a5c956 100%);background-size:0% auto;background-repeat:no-repeat;");
    else hbx.setAttribute("style","background-image:linear-gradient(to bottom, "+ mdbOverlay.convert2RGBA(dpclr,0.59) +" 0%, "+ mdbOverlay.convert2RGBA(dpclr,1) +" 100%) !important;background-size:0% auto;background-repeat:no-repeat;");

    let vbx=document.createElement("hbox");
    vbx.setAttribute("id","downloadbar-vbox-"+dlid);
    vbx.setAttribute("class","downloadbar-dwnldtmhbx");
    vbx.setAttribute("align","center");
    let i=document.createElement("image");
    i.setAttribute("src","moz-icon://"+dl.target.path+"?size=16");
    i.setAttribute("width","16");
    i.setAttribute("height","16");
    let lbl=document.createElement("label");
    lbl.setAttribute("id","downloadbar-label-"+dlid);
    lbl.setAttribute("value",basename + " - 0KB - 100%");
    lbl.setAttribute("crop","end");
    lbl.setAttribute("flex","1");
    lbl.setAttribute("style","margin-right:0;");
    if(mdbOverlay.prefs.getIntPref("filenamefontsize")!=0) lbl.style.setProperty("font-size", mdbOverlay.prefs.getIntPref("filenamefontsize")+"px", "important");

    let lbl2=document.createElement("label");
    lbl2.setAttribute("id","downloadbar-lbl-pgrss-"+dlid);
    lbl2.setAttribute("value","");
    lbl2.setAttribute("style","margin:0;");

    let lbl3=document.createElement("label");
    lbl3.setAttribute("id","downloadbar-lbl-speed-"+dlid);
    lbl3.setAttribute("value","");
    lbl3.setAttribute("style","margin:0;");

    let lbl4=document.createElement("label");
    lbl4.setAttribute("id","downloadbar-lbl-rmngtm-"+dlid);
    lbl4.setAttribute("value","");
    lbl4.setAttribute("style","margin:0;");

    let ntfctnwnppr;
    if(mdbOverlay.prefs.getCharPref("progresnotifalign")=="horizontal") {
      ntfctnwnppr=document.createElement("box");
      ntfctnwnppr.setAttribute("id","downloadbar-ntfctnwrppr-"+dlid);
      ntfctnwnppr.setAttribute("orient","horizontal");
      if(mdbOverlay.prefs.getIntPref("progressfontsize")!=0) ntfctnwnppr.style.setProperty("font-size", mdbOverlay.prefs.getIntPref("progressfontsize")+"px", "important");
    } else {
      ntfctnwnppr=document.createElement("box");
      ntfctnwnppr.setAttribute("id","downloadbar-ntfctnwrppr-"+dlid);
      ntfctnwnppr.setAttribute("orient","vertical");
      if(mdbOverlay.prefs.getIntPref("progressfontsize")!=0) ntfctnwnppr.style.setProperty("font-size", mdbOverlay.prefs.getIntPref("progressfontsize")+"px", "important");
    }
    ntfctnwnppr.appendChild(lbl4);
    ntfctnwnppr.appendChild(lbl3);
    ntfctnwnppr.appendChild(lbl2);
    ntfctnwnppr.appendChild(lbl2);
    ntfctnwnppr.appendChild(lbl2);
    ntfctnwnppr.appendChild(lbl2);

    let dtclr=mdbOverlay.prefs.getCharPref("downloadtextcolor");
    if(dtclr!="null") {
      lbl.style.setProperty("color", dtclr, "important");
      lbl.style.setProperty("margin-right", "0", "important");
      ntfctnwnppr.style.setProperty("color", dtclr, "important");
      ntfctnwnppr.style.setProperty("margin-right", "0", "important");
    } else {
      lbl.style.setProperty("color", "#000000", "important");
      lbl.style.setProperty("margin-right", "0", "important");
      ntfctnwnppr.style.setProperty("color", "#000000", "important");
      ntfctnwnppr.style.setProperty("margin-right", "2px", "important");
    }
    vbx.appendChild(i);
    vbx.appendChild(lbl);
    vbx.appendChild(ntfctnwnppr);
    stck.appendChild(hbx);
    stck.appendChild(vbx);
    if(uiid=="downloadbar-bar") document.getElementById(uiid+"-wrbx").appendChild(stck);
    else if(uiid=="downloadbar-downloadpanel") document.getElementById(uiid).appendChild(stck);
    if(dl.succeeded){
      document.getElementById("downloadbar-label-"+dlid).setAttribute("value",basename);
      document.getElementById("downloadbar-hbox-"+dlid).style.backgroundSize=100+"% auto";
      document.getElementById("downloadbar-lbl-pgrss-"+dlid).parentNode.parentNode.removeChild(document.getElementById("downloadbar-lbl-pgrss-"+dlid).parentNode);
      document.getElementById("downloadbar-stack-"+dlid).setAttribute("downcompleted","true");
      document.getElementById("downloadbar-stack-"+dlid).addEventListener("dragstart",function(event){mdbOverlay.drgstrt(event);},false);
      document.getElementById("downloadbar-stack-"+dlid).setAttribute("endtime",dl.endTime);

      let dcclr=mdbOverlay.prefs.getCharPref("downloadcompletecolor");
      if(dcclr!="null") document.getElementById("downloadbar-hbox-"+dlid).setAttribute("style","background-image:linear-gradient(to bottom, "+mdbOverlay.convert2RGBA(dcclr,0.59)+" 0%, "+mdbOverlay.convert2RGBA(dcclr,1)+" 100%) !important;background-size:100% auto;background-repeat:no-repeat;");

      stck.dl=dl;
      if(document.getElementById("downloadbar-cntr")){
        let prgrscnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[0]);
        let cmpltcnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[1])+1;
        document.getElementById("downloadbar-cntr").setAttribute("value",prgrscnt+":"+cmpltcnt);
      }
    } else {
      stck.dl=dl;
      let sid=stck.id;
      Task.spawn(function() {
        let list = yield Downloads.getList(Downloads.ALL);
        let dwnldlist=list._downloads;
        for(var i=0;i<dwnldlist.length;i++){
          if(dwnldlist[i].target.path==stck.dl.target.path) {
            stck.dl=dwnldlist[i];
            if(stck.dl.canceled){
              let hbx=document.getElementById("downloadbar-hbox-"+sid.replace("downloadbar-stack-",""));
              let dpsclr=mdbOverlay.prefs.getCharPref("downloadpausecolor");
                if(dpsclr == "null") {} else {
                hbx.style.setProperty("background-image", "linear-gradient(to bottom, "+mdbOverlay.convert2RGBA(dpsclr,0.59)+" 0%, "+mdbOverlay.convert2RGBA(dpsclr,1)+" 100%)", "important");
                hbx.style.setProperty("background-size", stck.dl.progress+"%", "important");
              }
            }
          }
        }
      }).then(null, Components.utils.reportError);
      if(document.getElementById("downloadbar-cntr")){
        let prgrscnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[0])+1;
        let cmpltcnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[1]);
        document.getElementById("downloadbar-cntr").setAttribute("value",prgrscnt+":"+cmpltcnt);
      }
    }
  },

  convert2RGBA: function(hex,opacity) {
    let hex = hex.replace('#','');
    let r = parseInt(hex.substring(0,2), 16);
    let g = parseInt(hex.substring(2,4), 16);
    let b = parseInt(hex.substring(4,6), 16);
    return 'rgba('+r+','+g+','+b+','+opacity+')';
  },

  clcltHash: function(path) {
    // hardcoded here for convenience
    var path = path;
    var f = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsILocalFile);
    f.initWithPath(path);
    var istream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                  .createInstance(Components.interfaces.nsIFileInputStream);
    // open for reading
    istream.init(f, 0x01, 0444, 0);
    var ch = Components.classes["@mozilla.org/security/hash;1"]
             .createInstance(Components.interfaces.nsICryptoHash);
    // we want to use the MD5 algorithm
    ch.init(ch.MD5);
    // this tells updateFromStream to read the entire file
    const PR_UINT32_MAX = 0xffffffff;
    ch.updateFromStream(istream, PR_UINT32_MAX);
    // pass false here to get binary data back
    var hash = ch.finish(false);
    // return the two-digit hexadecimal code for a byte
    function toHexString(charCode) {
      return ("0" + charCode.toString(16)).slice(-2);
    }
    // convert the binary hash data to a hex string.
    var s = [toHexString(hash.charCodeAt(i)) for (i in hash)].join("");
    // s now contains your hash in hex
    return s;
  },

  /*sttstcs: function(path) {
    gBrowser.selectedTab=gBrowser.addTab("chrome://downloadbar/content/statistics.xhtml", {
      relatedToCurrent: true
    });
  },*/

  isWindowPrivate: function(window) {
    try {
      Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");
    } catch (e) {}
    if (window && "undefined" != typeof(PrivateBrowsingUtils) &&
      PrivateBrowsingUtils.privacyContextFromWindow) {
      var privacyContext = PrivateBrowsingUtils.privacyContextFromWindow(window);
      var isWindowPrivate = privacyContext.usePrivateBrowsing;
    } else {
      var privacyContext = null;
      var isWindowPrivate = false;
    }
    return isWindowPrivate;
  },

  c:Components.classes["@downloadbar.com/bs;1"].getService().wrappedJSObject,
  copy: function(window) {
    const gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
                             .getService(Components.interfaces.nsIClipboardHelper);
    gClipboardHelper.copyString(document.popupNode.getAttribute("value"));
  },

  help: function(path) {
    gBrowser.selectedTab=gBrowser.addTab("chrome://downloadbar/content/help.xhtml", {
      relatedToCurrent: true
    });
  },

  sendto: function(event) {
    var isDownloadPrivate=mdbOverlay.isWindowPrivate(window);
    let s=mdbOverlay.getStack(document.popupNode);
    var file = Components.classes["@mozilla.org/file/local;1"]
               .createInstance(Components.interfaces.nsILocalFile);
    file.initWithPath(s.dl.target.path);
    var dir;
    if(event.target.id=="downloadsbar-sendto-desktp") {
      dir = Components.classes["@mozilla.org/file/directory_service;1"]
            .getService(Components.interfaces.nsIProperties).
             get("Desk", Components.interfaces.nsIFile);
    }else if(event.target.id=="downloadsbar-sendto-dwnlds") {
      var dnldMgr = Components.classes["@mozilla.org/download-manager;1"]
                    .getService(Components.interfaces.nsIDownloadManager);
      dir=dnldMgr.defaultDownloadsDirectory;
    }else if(event.target.id=="downloadsbar-sendto-cstm") {
      const nsIFilePicker = Components.interfaces.nsIFilePicker;
      var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
      fp.init(window, document.getElementById("downloadbar-prprts").getString("chsfldr") , nsIFilePicker.modeGetFolder);
      var rv = fp.show();
      if (rv == nsIFilePicker.returnOK) {
        dir=fp.file;
      }else if (rv == nsIFilePicker.returnCancel) {
        return;
      }
    }
    try {
      file.moveTo(dir,file.leafName);
    } catch (e) {
      return
    }
    var enumerator = mdbOverlay.wm.getEnumerator("navigator:browser");
    let sid=s.id;
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;
      let isWindowPrivate=mdbOverlay.isWindowPrivate(window);
      if(isWindowPrivate !=isDownloadPrivate) continue

      let s=document.getElementById(sid);
      s.dl.target.path=file.path;
      if(!isWindowPrivate) mdbOverlay.updateHistoryItem(sid.replace("downloadbar-stack-",""),s.dl);
      let l=document.getElementById("downloadbar-label-"+sid.replace("downloadbar-stack-",""));
      l.setAttribute("value",file.leafName);
    }
  },

  sendtopop: function(event) {
    if(event.target.id!=event.currentTarget.id) return;
    var dsktpdir = Components.classes["@mozilla.org/file/directory_service;1"]
                   .getService(Components.interfaces.nsIProperties).
           get("Desk", Components.interfaces.nsIFile);
    var dnldMgr = Components.classes["@mozilla.org/download-manager;1"]
                  .getService(Components.interfaces.nsIDownloadManager);
    var dwnlddir = dnldMgr.defaultDownloadsDirectory
    var profdir = Components.classes["@mozilla.org/file/directory_service;1"]
                  .getService(Components.interfaces.nsIProperties).
           get("ProfD", Components.interfaces.nsIFile);
    var iOService = Components.classes["@mozilla.org/network/io-service;1"]
                    .getService(Components.interfaces.nsIIOService);
    var dsktpdirurl = iOService.newFileURI(dsktpdir);
    var dwnlddirurl = iOService.newFileURI(dwnlddir);
    var profdirurl = iOService.newFileURI(profdir);
  },

  Chksm: {
    clcltHash: function(path,algorithm,stck) {
      if (this.running == true) {
        this.cancel();
      } else {
        this.running = true;
        var path=path;
        var file = Components.classes["@mozilla.org/file/local;1"]
                   .createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(path);
        this.file=file;
        this.stck=stck;
        this.chunk_size=16777215;
        this.interval=100;
        this.istream=Components.classes["@mozilla.org/network/file-input-stream;1"]
                     .createInstance(Components.interfaces.nsIFileInputStream);
        this.istream.init(file, 0x01, 0444, 0);
        this.ch = Components.classes["@mozilla.org/security/hash;1"]
                  .createInstance(Components.interfaces.nsICryptoHash);
        if(algorithm=="MD5") this.ch.init(this.ch.MD5);
        else if(algorithm=="SHA1") this.ch.init(this.ch.SHA1);
        else if(algorithm=="MD2") this.ch.init(this.ch.MD2);
        else if(algorithm=="SHA256") this.ch.init(this.ch.SHA256);
        else if(algorithm=="SHA384") this.ch.init(this.ch.SHA384);
        else if(algorithm=="SHA512") this.ch.init(this.ch.SHA512);
        this.remaining=file.fileSize;
        this.timer=Components.classes["@mozilla.org/timer;1"]
                   .createInstance(Components.interfaces.nsITimer);
        this.timer.initWithCallback(this, 10, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
      }
    },

    notify: function(timer) {
      if (this.running && this.remaining > 0) {
        let bytes;
        if (this.remaining > this.chunk_size) {
          bytes = this.chunk_size;
        } else {
          bytes = this.remaining;
        }
        if (this.ch != null && this.istream != null) {
          this.ch.updateFromStream(this.istream, bytes);
          this.remaining = this.remaining - bytes;
          
          let progress=(1 - this.remaining / (this.file.fileSize))*100;
          this.stck.ownerDocument.getElementById("downloadbar-itempanel-flhshlbl").value=this.stck.ownerDocument.getElementById("downloadbar-prprts").getString("clcltng")+"… "+parseInt(progress)+"%";
          
          if (this.timer != null) this.timer.initWithCallback(this, this.interval, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
        }
      } else {
        this.finalize(this.ch, this.istream, this.remaining);
      }
    },

    finalize: function(ch, istream, pending) {
      if (this.running) {
        var hash = ch.finish(false);
        var s = [];
        var i;
        for (i in hash) {
          s[i] = ("0" + hash.charCodeAt(i).toString(16)).slice(-2);
        }
        this.result = s.join("");
        this.stck.ownerDocument.getElementById("downloadbar-itempanel-flhshlbl").value=this.result;
        this.stck.setAttribute("MD5",this.result);
        this.running= false;
        this.file=null;
        this.stck=null;
        this.chunk_size=0;
        this.interval=0;
        this.istream=null;
        this.ch=null;
        this.remaining=0;
        this.timer=null;
      } else {
        this.cancel();
      }
    },

    cancel: function() {
      if (this.running) {
        this.running=false;
        this.file=null;
        this.stck=null;
        this.chunk_size=0;
        this.interval=0;
        this.istream=null;
        this.ch=null;
        this.remaining=0;
        this.timer=null;
      }
    }
  },

  unload: function(event) {
    var enumerator = mdbOverlay.wm.getEnumerator("navigator:browser");
    let w=0;
    while(enumerator.hasMoreElements()) {
      enumerator.getNext();
      w++;
    }
    let uiid=mdbOverlay.gtuiid();
    let stcks=document.getElementById(uiid).getElementsByTagName("stack");
    let allcompleted=true;
    for(var i=-0;i<stcks.length;i++){
      if(stcks[i].getAttribute("downcompleted")!="true") {
        allcompleted=false;
      }
    }
    if(mdbOverlay.prefs.getBoolPref("continuedownloadsonquit") && w == 0 && !allcompleted) window.openDialog("chrome://downloadbar/content/downloads.xul", "about:downloads", "centerscreen,chrome,resizable");
  },

  activKeyBindings: function() {
    try {
      document.getElementById("downloadbar-bar").removeChild(document.getElementById("mdb-keyset"))}
    catch(err){}
    let keySet = document.createElement("keyset");
    keySet.id = "mdb-keyset";
    let MenuItem = document.getElementById("downloadsbar-tls");
    let toggleKey = document.createElement("key");
    let modifiers = "";
    let modifiersat = "";
    if (mdbOverlay.prefs.getBoolPref("downBarCtrl")){
      modifiers += ",control";
      modifiersat += "Ctrl+";
    }
    if (mdbOverlay.prefs.getBoolPref("downBarShift")){
      modifiers += ",shift";
      modifiersat += "Shift+";
    }
    if (mdbOverlay.prefs.getBoolPref("downBarAlt")){
      modifiers += ",alt";
      modifiersat += "Alt+";
    }
    modifiers.replace(/^\,/,"");
    let key = mdbOverlay.prefs.getCharPref("downBarKeycode");
    if(key.length==1) {toggleKey.setAttribute("key", key);}
    else{toggleKey.setAttribute("keycode", key);}

    toggleKey.setAttribute("modifiers", modifiers);
    toggleKey.setAttribute("command", "mdb-panelbarhide-command");
    keySet.appendChild(toggleKey);
    document.getElementById("downloadbar-bar").appendChild(keySet);
    key=key.replace(/VK_/,"").replace(/LEFT/,"←").replace(/RIGHT/,"→").replace(/PAGE_UP/,"Page Up").replace(/PAGE_DOWN/,"Page Down").replace(/HOME/,"Home").replace(/END/,"End").replace(/INSERT/,"Insert").replace(/DELETE/,"Delete").replace(/UP/,"↑").replace(/DOWN/,"↓")
    MenuItem.setAttribute("key", "downloadbar-tgglky")
    MenuItem.setAttribute("acceltext", modifiersat+key)
  },

  panelbarhide: function(){
    if(mdbOverlay.prefs.getCharPref("userinterface")=="bar"){mdbOverlay.tgglbr()
    }else {mdbOverlay.buttonclick()};
  }
};

mdbOverlay.prefs.addObserver('', mdbOverlay, false);

var init = function() {
  mdbOverlay.load();
  mdbOverlay.downmanagbutton();
  mdbOverlay.activKeyBindings();
  mdbOverlay.hideMenuToolsItem();
}

window.addEventListener("mousemove",function(){mdbOverlay.dwnldpnlpop();},false);
window.addEventListener("load", function () {init();}, false);
window.addEventListener("unload",function(event){mdbOverlay.unload();},false);
window.addEventListener("unload", function () {mdbOverlay.prefs.removeObserver('', mdbOverlay); }, false);