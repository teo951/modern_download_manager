Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");
function DownloadBar() { 
}
DownloadBar.prototype = {
  classID:Components.ID("{e0abeff8-a708-4eaf-b788-4e86ffd9e961}"),
  contractID:"@downloadbar.com/bs;1",
  classDescription:"Download Bar Component",
  QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIObserver, Components.interfaces.nsISupportsWeakReference, Components.interfaces.nsISupports]),
  get wrappedJSObject(){return(this);},
  onDownloadAdded:function(download,isDownloadPrivate){

    function convert2RGBA(hex,opacity){
      let hex = hex.replace('#','');
      let r = parseInt(hex.substring(0,2), 16);
      let g = parseInt(hex.substring(2,4), 16);
      let b = parseInt(hex.substring(4,6), 16);
      return 'rgba('+r+','+g+','+b+','+opacity+')';
    }

    let dl=download;
    let basename=OS.Path.basename(dl.target.path);
    let time;
    let dlid;

    if(dl.dsbid){
      dlid=dl.dsbid;
    }
    else{
      time=new Date().getTime();
      let randomness=parseInt(Math.random()*new Date().getTime());
      dlid=randomness+"-"+time;
      dl.dsbid=dlid;
    }

    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
               .getService(Components.interfaces.nsIWindowMediator);
    var enumerator = wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {

      let window = enumerator.getNext();
      let document=window.document;

      try {
        Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");
      } catch (e) {
        // old Firefox versions (e.g. 3.6) didn't have PrivateBrowsingUtils.
      }
      if (window && "undefined" != typeof(PrivateBrowsingUtils) &&
        PrivateBrowsingUtils.privacyContextFromWindow) {
        var privacyContext = PrivateBrowsingUtils.privacyContextFromWindow(window);
        var isWindowPrivate = privacyContext.usePrivateBrowsing;
      } else {
        // older than Firefox 19 or couldn't get window.
        var privacyContext = null;
        var isWindowPrivate = false;
      }

      if(isWindowPrivate !=isDownloadPrivate) continue

      let brnch=Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
      
      let uiid;
      if(brnch.getCharPref("extensions.mdownloadbar.userinterface")=="bar") uiid="downloadbar-bar";
      else if(brnch.getCharPref("extensions.mdownloadbar.userinterface")=="panel") uiid="downloadbar-downloadpanel";
      
      if(document.getElementById("downloadbar-stack-"+dlid)) return;			
      if(uiid=="downloadbar-bar" &&  document.getElementById(uiid).getAttribute("collapsed")=="true") document.getElementById(uiid).setAttribute("collapsed","false");
      else if(uiid=="downloadbar-downloadpanel") {
        //if(document.getElementById("addon-bar").collapsed) window.toggleAddonBar();
        document.getElementById("downloadbar-bar").setAttribute("collapsed","true");
        document.getElementById("downloadbar-ddnbr").hidden=false;
      }


      let stck=document.createElement("stack");
      stck.setAttribute("id","downloadbar-stack-"+dlid);
      stck.setAttribute("class","downloadbar-dwnldtmstck");
      //stck.setAttribute("maxwidth","150");
      stck.setAttribute("context","downloadsbar-statusbar-menu");
      let dwnldbckgrndclr=brnch.getCharPref("extensions.mdownloadbar.downloadbackgroundcolor");
      if(dwnldbckgrndclr!="null") stck.setAttribute("style","background-image:linear-gradient(to bottom, "+convert2RGBA(dwnldbckgrndclr,0.59)+" 0%, "+convert2RGBA(dwnldbckgrndclr,1)+" 100%) !important;background-size:100% auto;background-repeat:no-repeat;");
      else stck.setAttribute("style","background-image: linear-gradient(to bottom, rgba(255, 255, 255, 0.59) 0%, rgb(255, 255, 255) 100%) ! important; background-size: 100% auto; background-repeat: no-repeat;background-color:rgba(143,144,152,1) !important;border:1px solid #98a7ad !important;");
      stck.setAttribute("tooltip","downloadbar-itempanel");

      let dwbldtmwdth=brnch.getIntPref("extensions.mdownloadbar.downloaditemwidth");
      if(dwbldtmwdth!="null") stck.style.setProperty("max-width", dwbldtmwdth+"px", "important");

      let dwbldtmhght=brnch.getIntPref("extensions.mdownloadbar.downloaditemheight");
      if(dwbldtmhght!="null") stck.style.setProperty("height", dwbldtmhght+"px", "important");

      stck.setAttribute("flex","1");
      stck.setAttribute("downcompleted","false");
      stck.setAttribute("paused","false");
      stck.setAttribute("sourceurl","");
      stck.setAttribute("sourcereferrer","");
      stck.addEventListener("dblclick",function(event){event.currentTarget.ownerDocument.defaultView.mdbOverlay.stckdbclck(event);},false);
      stck.addEventListener("click",function(event){event.currentTarget.ownerDocument.defaultView.mdbOverlay.stckclck(event);},false);

      let hbx=document.createElement("hbox");
      hbx.setAttribute("id","downloadbar-hbox-"+dlid);
      hbx.setAttribute("flex","1");
      hbx.setAttribute("align","stretch");

      let dpclr=brnch.getCharPref("extensions.mdownloadbar.downloadprogresscolor");
      if(dpclr=="null") hbx.setAttribute("style","background-image: linear-gradient(to bottom,  #cdeb8e 0%,#a5c956 100%);background-size:0% auto;background-repeat:no-repeat;");
      else hbx.setAttribute("style","background-image:linear-gradient(to bottom, "+convert2RGBA(dpclr,0.59)+" 0%, "+convert2RGBA(dpclr,1)+" 100%) !important;background-size:0% auto;background-repeat:no-repeat;");

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
      if(brnch.getIntPref("extensions.mdownloadbar.filenamefontsize")!=0) lbl.style.setProperty("font-size", brnch.getIntPref("extensions.mdownloadbar.filenamefontsize")+"px", "important");

      let lbl2=document.createElement("label");
      lbl2.setAttribute("id","downloadbar-lbl-pgrss-"+dlid);
      lbl2.setAttribute("value","");
      lbl2.setAttribute("style","margin:0;");
      lbl2.setAttribute("hidden",!brnch.getBoolPref("extensions.mdownloadbar.showprogressnotification"));

      let lbl3=document.createElement("label");
      lbl3.setAttribute("id","downloadbar-lbl-speed-"+dlid);
      lbl3.setAttribute("value","");
      lbl3.setAttribute("style","margin:0;");
      lbl3.setAttribute("hidden",!brnch.getBoolPref("extensions.mdownloadbar.showspeednotification"));

      let lbl4=document.createElement("label");
      lbl4.setAttribute("id","downloadbar-lbl-rmngtm-"+dlid);
      lbl4.setAttribute("value","");
      lbl4.setAttribute("style","margin:0;");
      lbl4.setAttribute("hidden",!brnch.getBoolPref("extensions.mdownloadbar.showremainingtimenotification"));

      let ntfctnwnppr;

      if(brnch.getCharPref("extensions.mdownloadbar.progresnotifalign")=="horizontal") {

        ntfctnwnppr=document.createElement("box");
        ntfctnwnppr.setAttribute("id","downloadbar-ntfctnwrppr-"+dlid);
        ntfctnwnppr.setAttribute("orient","horizontal");
        if(brnch.getIntPref("extensions.mdownloadbar.progressfontsize")!=0) ntfctnwnppr.style.setProperty("font-size", brnch.getIntPref("extensions.mdownloadbar.progressfontsize")+"px", "important");
      }
      else {
        ntfctnwnppr=document.createElement("box");
        ntfctnwnppr.setAttribute("id","downloadbar-ntfctnwrppr-"+dlid);
        ntfctnwnppr.setAttribute("orient","vertical");
        if(brnch.getIntPref("extensions.mdownloadbar.progressfontsize")!=0) ntfctnwnppr.style.setProperty("font-size", brnch.getIntPref("extensions.mdownloadbar.progressfontsize")+"px", "important");
      }

      ntfctnwnppr.appendChild(lbl4);
      ntfctnwnppr.appendChild(lbl3);
      ntfctnwnppr.appendChild(lbl2);

      let dtclr=brnch.getCharPref("extensions.mdownloadbar.downloadtextcolor");
      if(dtclr!="null") {
        lbl.style.setProperty("color", dtclr, "important");
        lbl.style.setProperty("margin-right", "0", "important");
        ntfctnwnppr.style.setProperty("color", dtclr, "important");
        ntfctnwnppr.style.setProperty("margin-right", "0", "important");
      }
      else {
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
      //let stckWdth=parseInt(window.getComputedStyle(document.getElementById("downloadbar-stack-"+dlid),null).getPropertyValue("width"));
      //document.getElementById("downloadbar-stack-"+dlid).setAttribute("right",stckWdth);

      stck.dl=dl;

      if(stck.dl.canceled){
        let dpsclr=brnch.getCharPref("extensions.mdownloadbar.downloadpausecolor");
        if(dpsclr=="null") {}
        else {
          hbx.style.setProperty("background-image", "linear-gradient(to bottom, "+convert2RGBA(dpsclr,0.59)+" 0%, "+convert2RGBA(dpsclr,1)+" 100%)", "important");
          hbx.style.setProperty("background-size", stck.dl.progress+"%", "important");
        }
      }
      
      if(document.getElementById("downloadbar-cntr")){
        let prgrscnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[0])+1;
        let cmpltcnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[1]);
        document.getElementById("downloadbar-cntr").setAttribute("value",prgrscnt+":"+cmpltcnt);
      }
    }

    let brnch=Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    if(brnch.getBoolPref("extensions.mdownloadbar.autoopendownloadtab")){
      function openAndReuseOneTabPerURL(url) {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
          .getService(Components.interfaces.nsIWindowMediator);
        var rwin = wm.getMostRecentWindow("navigator:browser");
        var found = false;
        var browserWin = rwin;
        var tabbrowser = browserWin.gBrowser;
        // Check each tab of this browser instance
        var numTabs = tabbrowser.browsers.length;
        for (var index = 0; index < numTabs; index++) {
          var currentBrowser = tabbrowser.getBrowserAtIndex(index);
          if (url == currentBrowser.currentURI.spec) {
          // The URL is already opened. Select this tab.
          tabbrowser.selectedTab = tabbrowser.tabContainer.childNodes[index];
          // Focus *this* browser-window
          browserWin.focus();
          found = true;
          break;
          }
        }
        // Our URL isn't open. Open it now.
        if (!found) {
          var recentWindow = rwin;
          if (recentWindow) {
            // Use an existing browser window
            //recentWindow.delayedOpenTab(url, null, null, null, null);
            rwin.gBrowser.selectedTab=rwin.gBrowser.addTab("about:downloads",{relatedToCurrent: true});
          }
          else {
            // No browser windows are open, so open a new one.
            window.open(url);
          }
        }
      }
      
      openAndReuseOneTabPerURL("about:downloads");
    }
    
    if(isDownloadPrivate) return
    try{
      var hstry=JSON.parse(this.readJSON());
    }
    catch(e){
      this.writeJSON("{}");
      var hstry=JSON.parse(this.readJSON());
    }
    for(var h in hstry)
    {
      if(!hstry[h].succeeded && decodeURIComponent(hstry[h].target.path) == dl.target.path) {
      
        let exid=hstry[h].id;
        //delete hstry[hstry[h].id];
        var oldhstry=JSON.stringify(hstry);
        var tmpobjct = {};
        tmpobjct[h] = hstry[h];

        var tempentry='"'+h+'":'+JSON.stringify(hstry[h]);
        
        var objct = {};
        objct[dlid] = {};
        objct[dlid].id = dlid;
        objct[dlid].target={path : encodeURIComponent(dl.target.path)};
        objct[dlid].succeeded = dl.succeeded;
        objct[dlid].source = {url : encodeURIComponent(dl.source.url), referrer : encodeURIComponent(dl.source.referrer)};
        var newentry='"'+dlid+'":'+JSON.stringify(objct[dlid]);

        this.writeJSON(oldhstry.replace(tempentry,newentry));

        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
        var enumerator = wm.getEnumerator("navigator:browser");
        while(enumerator.hasMoreElements()) {
          
          let window = enumerator.getNext();
          let document=window.document;
          
          if(document.getElementById("downloadbar-stack-"+exid)) {
            document.getElementById("downloadbar-stack-"+exid).parentNode.insertBefore(document.getElementById("downloadbar-stack-"+dlid), document.getElementById("downloadbar-stack-"+exid));
            document.getElementById("downloadbar-stack-"+exid).parentNode.removeChild(document.getElementById("downloadbar-stack-"+exid));
            if(document.getElementById("downloadbar-cntr")){
              let prgrscnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[0])-1;
              let cmpltcnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[1]);
              document.getElementById("downloadbar-cntr").setAttribute("value",prgrscnt+":"+cmpltcnt);
            }
            
          }
        }
      }

    }

    //refresh again in case temp replace
    try{
      var hstry=JSON.parse(this.readJSON());
    }
    catch(e){
      this.writeJSON("{}");
      var hstry=JSON.parse(this.readJSON());
    }

    hstry[dlid] = {};
    hstry[dlid].id = dlid;
    hstry[dlid].target={path : encodeURIComponent(dl.target.path)};
    hstry[dlid].succeeded = dl.succeeded;
    hstry[dlid].source = {url : encodeURIComponent(dl.source.url), referrer : encodeURIComponent(dl.source.referrer)};

    this.writeJSON(JSON.stringify(hstry));
  },
  onDownloadChanged:function(download,isDownloadPrivate) {
    function convert2RGBA(hex,opacity){
      let hex = hex.replace('#','');
      let r = parseInt(hex.substring(0,2), 16);
      let g = parseInt(hex.substring(2,4), 16);
      let b = parseInt(hex.substring(4,6), 16);
      return 'rgba('+r+','+g+','+b+','+opacity+')';
    }
    try{
      let dl=download;
      let basename=OS.Path.basename(dl.target.path);
      let time;
      let dlid;
      
      if(dl.dsbid){
        dlid=dl.dsbid;
      }
      else{
        time=new Date().getTime();
        let randomness=parseInt(Math.random()*new Date().getTime());
        dlid=randomness+"-"+time;
        dl.dsbid=dlid;
      }

      var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                 .getService(Components.interfaces.nsIWindowMediator);
      var win = wm.getMostRecentWindow("dsb:downloads");
      if(win && download.succeeded){
        try{
          var hstry=JSON.parse(this.readJSON());
        }
        catch(e){
          this.writeJSON("{}");
          var hstry=JSON.parse(this.readJSON());
        }

        let endTime=new Date().getTime();
        
        hstry[dlid].endTime = endTime;
        hstry[dlid].source = {url : encodeURIComponent(dl.source.url), referrer : encodeURIComponent(dl.source.referrer)};
        hstry[dlid].speed = dl.speed;
        hstry[dlid].totalBytes = dl.totalBytes;
        hstry[dlid].currentBytes = dl.currentBytes;
        hstry[dlid].progress = dl.progress;
        hstry[dlid].startTime = dl.startTime;
        hstry[dlid].succeeded = dl.succeeded;
        hstry[dlid].canceled = dl.canceled;

        this.writeJSON(JSON.stringify(hstry));
        return;
      }
      
      let brnch=Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
      let uiid;
      if(brnch.getCharPref("extensions.mdownloadbar.userinterface")=="bar") uiid="downloadbar-bar";
      else if(brnch.getCharPref("extensions.mdownloadbar.userinterface")=="panel") uiid="downloadbar-downloadpanel";
      try{
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
          .getService(Components.interfaces.nsIWindowMediator);
        var rwin = wm.getMostRecentWindow("navigator:browser");
        rwin.document.getElementById("downloadbar-hbox-"+dlid).getAttribute("id");
      }
      catch(e){  
        let document=rwin.document;
        let stcks=document.getElementById(uiid).getElementsByTagName("stack");
        for(var i=-0;i<stcks.length;i++){
          if(stcks[i].dl==dl) {
            dlid=stcks[i].getAttribute("id").replace("downloadbar-stack-","");
            dl.dsbid=dlid;
            break;
          }
        }
      }

      let flext=basename.substring(basename.lastIndexOf(".")+1, basename.length);  
      if (download.succeeded) {
        let endTime=new Date().getTime();
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
        .getService(Components.interfaces.nsIWindowMediator);
        if(brnch.getBoolPref("extensions.mdownloadbar.playsound")){
          var rwin = wm.getMostRecentWindow("navigator:browser");
          let dop=brnch.getCharPref("extensions.mdownloadbar.audioplayerpath");
          if(dop!="") {
            let prefs = Components.classes["@mozilla.org/preferences-service;1"].
                  getService(Components.interfaces.nsIPrefService).
                  getBranch("extensions.mdownloadbar.")
            let audioplayerpath=prefs.getComplexValue("audioplayerpath", Components.interfaces.nsILocalFile).path;
            var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
            file.initWithPath(audioplayerpath);
            var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService)
            rwin.document.getElementById("downloadbar-opt-doplyr").setAttribute("src",ioService.newFileURI(file).spec);
            rwin.document.getElementById("downloadbar-opt-doplyr").play();
          }
          else {
            rwin.document.getElementById("downloadbar-opt-doplyr").setAttribute("src","chrome://downloadbar/content/defaultSound.mp3");
            rwin.document.getElementById("downloadbar-opt-doplyr").play();
          }
        }
        var enumerator = wm.getEnumerator("navigator:browser");
        while(enumerator.hasMoreElements()) {
          let window = enumerator.getNext();
          let document=window.document;
          try {
            Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");
          } catch (e) {
            // old Firefox versions (e.g. 3.6) didn't have PrivateBrowsingUtils.
          }
          if (window && "undefined" != typeof(PrivateBrowsingUtils) &&
            PrivateBrowsingUtils.privacyContextFromWindow) {
            var privacyContext = PrivateBrowsingUtils.privacyContextFromWindow(window);
            var isWindowPrivate = privacyContext.usePrivateBrowsing;
          } else {
            // older than Firefox 19 or couldn't get window.
            var privacyContext = null;
            var isWindowPrivate = false;
          }
    
          if(isWindowPrivate !=isDownloadPrivate) continue
          //document.getElementById("downloadbar-hbox-"+dlid).setAttribute("right","0");
          document.getElementById("downloadbar-label-"+dlid).setAttribute("value",basename);
          //document.getElementById("downloadbar-lbl-pgrss-"+dlid).setAttribute("value"," - 100%");
          document.getElementById("downloadbar-hbox-"+dlid).style.backgroundSize=100+"% auto";
          document.getElementById("downloadbar-lbl-pgrss-"+dlid).parentNode.parentNode.removeChild(document.getElementById("downloadbar-lbl-pgrss-"+dlid).parentNode);
          document.getElementById("downloadbar-stack-"+dlid).setAttribute("downcompleted","true");
          document.getElementById("downloadbar-stack-"+dlid).addEventListener("dragstart",function(event){event.currentTarget.ownerDocument.defaultView.mdbOverlay.drgstrt(event);},false);
          document.getElementById("downloadbar-stack-"+dlid).setAttribute("endtime",endTime);

          if(document.getElementById("downloadbar-cntr")){
            let prgrscnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[0])-1;
            let cmpltcnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[1])+1;
            document.getElementById("downloadbar-cntr").setAttribute("value",prgrscnt+":"+cmpltcnt);
          }
          if( dlid == document.getElementById("downloadbar-itempanel").getAttribute("activeid") ){
            let s=document.getElementById("downloadbar-stack-"+dlid);
            let elapsedseconds=(parseInt(s.getAttribute("endtime")) - dl.startTime.getTime())/1000;
            let averagespeed=parseInt(dl.totalBytes/elapsedseconds/1000);
            
            function normalizetime(time){
              return time[0]+" "+time[1]+" "+(time[2] ? time[2] : "")+" "+(time[3] ? time[3] : "");
            }

            //let remainingtime=DownloadUtils.convertTimeUnits(parseInt((dl.totalBytes - dl.currentBytes)/dl.speed));
            //let normalizedremainingtime=normalizetime(remainingtime);    
            let downloadtime=DownloadUtils.convertTimeUnits(elapsedseconds);
            let normalizeddownloadtime=normalizetime(downloadtime);
            document.getElementById("downloadbar-itempanel-crrntspdlbl").setAttribute("value","-");
            document.getElementById("downloadbar-itempanel-pgrsslbl").setAttribute("value",100 + "%");
            document.getElementById("downloadbar-itempanel-rmngtmlbl").setAttribute("value","-");

            document.getElementById("downloadbar-itempanel-vrgspdnmhb").hidden=!(s.getAttribute("downcompleted")=="true");
            document.getElementById("downloadbar-itempanel-vrgspdvlhb").hidden=!(s.getAttribute("downcompleted")=="true");
            document.getElementById("downloadbar-itempanel-vrgspdlbl").setAttribute("value",(averagespeed!=0) ? averagespeed+" KB" : " - ");

            document.getElementById("downloadbar-itempanel-crrntspdnmhb").hidden=(s.getAttribute("downcompleted")=="true");
            document.getElementById("downloadbar-itempanel-crrntspdvlhb").hidden=(s.getAttribute("downcompleted")=="true");
            //document.getElementById("downloadbar-itempanel-crrntspdlbl").setAttribute("value",(crrntspd!=0) ? crrntspd+" KB" : " - ");

            document.getElementById("downloadbar-itempanel-dwnldtmnmhb").hidden=!(s.getAttribute("downcompleted")=="true");
            document.getElementById("downloadbar-itempanel-dwnldtmvlhb").hidden=!(s.getAttribute("downcompleted")=="true");
            document.getElementById("downloadbar-itempanel-dwnldtmlbl").setAttribute("value",normalizeddownloadtime);

            document.getElementById("downloadbar-itempanel-rmngtmnmhb").hidden=(s.getAttribute("downcompleted")=="true");
            document.getElementById("downloadbar-itempanel-rmngtmvlhb").hidden=(s.getAttribute("downcompleted")=="true");
            
            document.getElementById("downloadbar-itempanel-dwnldbytnmhb").hidden=(s.getAttribute("downcompleted")=="true");
            document.getElementById("downloadbar-itempanel-dwnldbytvlhb").hidden=(s.getAttribute("downcompleted")=="true");
            
            document.getElementById("downloadbar-itempanel-flsznmhb").hidden=!(s.getAttribute("downcompleted")=="true");
            document.getElementById("downloadbar-itempanel-flszvlhb").hidden=!(s.getAttribute("downcompleted")=="true");
            //document.getElementById("downloadbar-itempanel-rmngtmlbl").setAttribute("value",(!isNaN(parseInt((dl.totalBytes - dl.currentBytes)/dl.speed))) ? normalizedremainingtime : " - ");
          }

          let dcclr=brnch.getCharPref("extensions.mdownloadbar.downloadcompletecolor");
          if(dcclr!="null") document.getElementById("downloadbar-hbox-"+dlid).setAttribute("style","background-image:linear-gradient(to bottom, "+convert2RGBA(dcclr,0.59)+" 0%, "+convert2RGBA(dcclr,1)+" 100%) !important;background-size:100% auto;background-repeat:no-repeat;");
          if(brnch.getBoolPref("extensions.mdownloadbar.autoclosebarwhendownloadscomplete")){
            window.setTimeout(function(){
              let stcks=document.getElementById(uiid).getElementsByTagName("stack");
              let allcompleted=true;
              for(var i=-0;i<stcks.length;i++){
                if(stcks[i].getAttribute("downcompleted")!="true") allcompleted=false;
              }
              if(allcompleted)   {if(uiid=="downloadbar-bar") document.getElementById(uiid).setAttribute("collapsed","true");}
            },brnch.getIntPref("extensions.mdownloadbar.autoclosesecond")*1000);
          }  
          
        }
        
        if(brnch.getCharPref("extensions.mdownloadbar.autoclearfiletypes").search(/\*/)!=-1 || brnch.getCharPref("extensions.mdownloadbar.autoclearfiletypes").search(new RegExp(flext, "i"))!=-1) {
          var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
          .getService(Components.interfaces.nsIWindowMediator);
          var rwin = wm.getMostRecentWindow("navigator:browser");
          rwin.setTimeout(function(){
            Task.spawn(function () {
                let list = yield Downloads.getList(Downloads.ALL);
                yield list.remove(download);
            }).then(null, Components.utils.reportError);
          },brnch.getIntPref("extensions.mdownloadbar.autoclearsecond")*1000);
        }

        if(brnch.getBoolPref("extensions.mdownloadbar.automaticviruscan")) {
          if(brnch.getCharPref("extensions.mdownloadbar.disablescanfor").search(new RegExp(flext, "i"))==-1) {
            if(brnch.getCharPref("extensions.mdownloadbar.viruscanpath")!="") {
              let prefs = Components.classes["@mozilla.org/preferences-service;1"].
                    getService(Components.interfaces.nsIPrefService).
                    getBranch("extensions.mdownloadbar.")
              let viruscanpath=prefs.getComplexValue("viruscanpath", Components.interfaces.nsILocalFile).path;
              let virusarguments=brnch.getCharPref("extensions.mdownloadbar.virusscanarguments");

              if(virusarguments.search(/%1/g)!=-1){
                // create an nsIFile for the executable
                var file = Components.classes["@mozilla.org/file/local;1"]
                           .createInstance(Components.interfaces.nsIFile);
                file.initWithPath(viruscanpath);
                // create an nsIProcess
                var process = Components.classes["@mozilla.org/process/util;1"]
                            .createInstance(Components.interfaces.nsIProcess);
                process.init(file);
                // Run the process.
                // If first param is true, calling thread will be blocked until
                // called process terminates.
                // Second and third params are used to pass command-line arguments
                // to the process.
                var args = virusarguments.split(" ");
                for (var i=0; i<args.length; ++i) {
                  args[i] = args[i].replace(/%1/g, dl.target.path);
                }
                process.run(false, args, args.length);
              }
              else{
                dl.launcherPath=viruscanpath;
                dl.launch();
                dl.launcherPath=null;
              }
            
            }
          }
        }
        if(brnch.getBoolPref("extensions.mdownloadbar.autoopendownloaddirectory")){
          dl.showContainingDirectory();
        }
        
        if(isDownloadPrivate) return  
        try{
          var hstry=JSON.parse(this.readJSON());
        }
        catch(e){
          this.writeJSON("{}");
          var hstry=JSON.parse(this.readJSON());
        }
        hstry[dlid].endTime = endTime;
        hstry[dlid].source = {url : encodeURIComponent(dl.source.url), referrer : encodeURIComponent(dl.source.referrer)};
        hstry[dlid].speed = dl.speed;
        hstry[dlid].totalBytes = dl.totalBytes;
        hstry[dlid].currentBytes = dl.currentBytes;
        hstry[dlid].progress = dl.progress;
        hstry[dlid].startTime = dl.startTime;
        hstry[dlid].succeeded = dl.succeeded;
        hstry[dlid].canceled = dl.canceled;

        this.writeJSON(JSON.stringify(hstry));
        return;
      }

      if (download.stopped) {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
        var enumerator = wm.getEnumerator("navigator:browser");
        while(enumerator.hasMoreElements()) {
          let window = enumerator.getNext();
          let document=window.document;
          try {
            Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");
          } catch (e) {
            // old Firefox versions (e.g. 3.6) didn't have PrivateBrowsingUtils.
          }
          if (window && "undefined" != typeof(PrivateBrowsingUtils) &&
            PrivateBrowsingUtils.privacyContextFromWindow) {
            var privacyContext = PrivateBrowsingUtils.privacyContextFromWindow(window);
            var isWindowPrivate = privacyContext.usePrivateBrowsing;
          } else {
            // older than Firefox 19 or couldn't get window.
            var privacyContext = null;
            var isWindowPrivate = false;
          }
    
          if(isWindowPrivate !=isDownloadPrivate) continue
          let s=document.getElementById("downloadbar-stack-"+dlid);
          s.setAttribute("paused","true");
          let hbx=document.getElementById("downloadbar-hbox-"+dlid.replace("downloadbar-stack-",""));
          let dpclr=brnch.getCharPref("extensions.mdownloadbar.downloadpausecolor");
          if(dpclr=="null") {}
          else hbx.style.setProperty("background-image", "linear-gradient(to bottom, "+dpclr+" 0%, "+dpclr+" 100%)", "important");
        }
        return;
      }

      var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                 .getService(Components.interfaces.nsIWindowMediator);
      var enumerator = wm.getEnumerator("navigator:browser");
      while(enumerator.hasMoreElements()) {
        let window = enumerator.getNext();
        let document=window.document;
        try {
          Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");
        } catch (e) {
          // old Firefox versions (e.g. 3.6) didn't have PrivateBrowsingUtils.
        }
        if (window && "undefined" != typeof(PrivateBrowsingUtils) &&
          PrivateBrowsingUtils.privacyContextFromWindow) {
          var privacyContext = PrivateBrowsingUtils.privacyContextFromWindow(window);
          var isWindowPrivate = privacyContext.usePrivateBrowsing;
        } else {
          // older than Firefox 19 or couldn't get window.
          var privacyContext = null;
          var isWindowPrivate = false;
        }
        if(isWindowPrivate !=isDownloadPrivate) continue
        let speed=parseInt(download.speed/1024);
        let slwstbndwdth=brnch.getIntPref("extensions.mdownloadbar.slowestbandwidth");
        let avrgbndwdth=brnch.getIntPref("extensions.mdownloadbar.averagebandwidth");
        let fststbndwdth=brnch.getIntPref("extensions.mdownloadbar.fastestbandwidth");
        let spdbckgndclr=null;
        //let remainingtime=parseInt((dl.totalBytes - dl.currentBytes)/dl.speed);
        let remainingtime=DownloadUtils.convertTimeUnits(parseInt((dl.totalBytes - dl.currentBytes)/dl.speed));
        let normalizedtime=remainingtime[0]+" "+remainingtime[1]+" "+(remainingtime[2] ? remainingtime[2] : "")+" "+(remainingtime[3] ? remainingtime[3] : "");
        let dpclr=brnch.getCharPref("extensions.mdownloadbar.downloadprogresscolor");
        
        if(dpclr=="null") document.getElementById("downloadbar-hbox-"+dlid).style.setProperty("background-image", "linear-gradient(to bottom,  #cdeb8e 0%,#a5c956 100%)", "important");
        else document.getElementById("downloadbar-hbox-"+dlid).style.setProperty("background-image", "linear-gradient(to bottom, "+convert2RGBA(dpclr,0.59)+" 0%, "+convert2RGBA(dpclr,1)+" 100%)", "important");
        if(speed<=slwstbndwdth) {
          if(brnch.getCharPref("extensions.mdownloadbar.slowestbandwidthcolor")!="null") spdbckgndclr=brnch.getCharPref("extensions.mdownloadbar.slowestbandwidthcolor");
        }
        if(speed>slwstbndwdth && speed<=avrgbndwdth) {
          if(brnch.getCharPref("extensions.mdownloadbar.averagespeedfirstbandwidthcolor")!="null") spdbckgndclr=brnch.getCharPref("extensions.mdownloadbar.averagespeedfirstbandwidthcolor");
        }
        if(speed>avrgbndwdth && speed<=fststbndwdth) {
          if(brnch.getCharPref("extensions.mdownloadbar.averagespeedsecondbandwidthcolor")!="null") spdbckgndclr=brnch.getCharPref("extensions.mdownloadbar.averagespeedsecondbandwidthcolor");
        }
        if(speed>fststbndwdth) {
          if(brnch.getCharPref("extensions.mdownloadbar.fastestbandwidthcolor")!="null") spdbckgndclr=brnch.getCharPref("extensions.mdownloadbar.fastestbandwidthcolor");
        }
        //let stckWdth=parseInt(window.getComputedStyle(document.getElementById("downloadbar-stack-"+dlid),null).getPropertyValue("width"));
        if(spdbckgndclr!=null) document.getElementById("downloadbar-hbox-"+dlid).setAttribute("style","background-image:linear-gradient(to bottom, "+convert2RGBA(spdbckgndclr,0.59)+" 0%, "+convert2RGBA(spdbckgndclr,1)+" 100%) !important;background-repeat:no-repeat;");
        //document.getElementById("downloadbar-hbox-"+dlid).setAttribute("width",parseInt(stckWdth*((dl.progress/100))));
        document.getElementById("downloadbar-hbox-"+dlid).style.backgroundSize=parseInt(dl.progress)+"% auto";
        document.getElementById("downloadbar-label-"+dlid).setAttribute("value",basename);

        let rmngscnds=parseInt((dl.totalBytes - dl.currentBytes)/dl.speed);
        let seconds=!isNaN(rmngscnds) ? (parseInt(rmngscnds%60) < 10 ? "0"+ parseInt(rmngscnds%60) : parseInt(rmngscnds%60)) : "00";
        let minutes=!isNaN(rmngscnds) ? (parseInt((rmngscnds/(60))%60) < 10 ? "0"+parseInt((rmngscnds/(60))%60) : parseInt((rmngscnds/(60))%60)) : "00";
        let hours=!isNaN(rmngscnds) ? (parseInt((rmngscnds/(60*60))%24) < 10 ? "0"+parseInt((rmngscnds/(60*60))%24) : parseInt((rmngscnds/(60*60))%24)) : "00";
        let prgrsslbltxt = brnch.getBoolPref("extensions.mdownloadbar.showprogressnotification") ? (" - "+parseInt(dl.progress) + "%") : "";
        let spdlbltxt = brnch.getBoolPref("extensions.mdownloadbar.showspeednotification") ? (" - "+speed+ " KB/s") : "";
        let rmngtmlbltxt = brnch.getBoolPref("extensions.mdownloadbar.showremainingtimenotification") ? (" - "+(hours !="00" ? hours+":" : "")+minutes+":"+seconds) : "";

        document.getElementById("downloadbar-lbl-pgrss-"+dlid).setAttribute("value",prgrsslbltxt);
        document.getElementById("downloadbar-lbl-pgrss-"+dlid).setAttribute("hidden",!brnch.getBoolPref("extensions.mdownloadbar.showprogressnotification"));
        document.getElementById("downloadbar-lbl-speed-"+dlid).setAttribute("value",spdlbltxt);
        document.getElementById("downloadbar-lbl-speed-"+dlid).setAttribute("hidden",!brnch.getBoolPref("extensions.mdownloadbar.showspeednotification"));
        document.getElementById("downloadbar-lbl-rmngtm-"+dlid).setAttribute("value",rmngtmlbltxt);
        document.getElementById("downloadbar-lbl-rmngtm-"+dlid).setAttribute("hidden",!brnch.getBoolPref("extensions.mdownloadbar.showremainingtimenotification"));

        document.getElementById("downloadbar-stack-"+dlid).setAttribute("sourceurl",dl.source.url);
        document.getElementById("downloadbar-stack-"+dlid).setAttribute("sourcereferrer",dl.source.referrer);
        document.getElementById("downloadbar-stack-"+dlid).dl=dl;

        if( dlid == document.getElementById("downloadbar-itempanel").getAttribute("activeid") ){
          document.getElementById("downloadbar-itempanel-crrntspdlbl").setAttribute("value",speed+" KB/s");
          document.getElementById("downloadbar-itempanel-pgrsslbl").setAttribute("value",dl.progress + "%");
          document.getElementById("downloadbar-itempanel-rmngtmlbl").setAttribute("value",normalizedtime);

          let filesize=DownloadUtils.convertByteUnits(dl.totalBytes)[0];
          let filesizeunit=DownloadUtils.convertByteUnits(dl.totalBytes)[1];
          let downloadedsize=DownloadUtils.convertByteUnits(dl.currentBytes)[0];
          let downloadedsizeunit=DownloadUtils.convertByteUnits(dl.currentBytes)[1];
          document.getElementById("downloadbar-itempanel-dwnldbytlbl").setAttribute("value",downloadedsize +" "+ downloadedsizeunit+" / "+filesize +" "+ filesizeunit);
        }

      }
    }catch(e){}
  },

  onDownloadRemoved:function(download,isDownloadPrivate) {
    let dl=download;
    let basename=OS.Path.basename(dl.target.path);
    let time;
    let dlid;
    if(dl.dsbid){
      dlid=dl.dsbid;
    }
    else{
      time=new Date().getTime();
      let randomness=parseInt(Math.random()*new Date().getTime());
      dlid=randomness+"-"+time;
      dl.dsbid=dlid;
    }

    let brnch=Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    let uiid;
    if(brnch.getCharPref("extensions.mdownloadbar.userinterface")=="bar") uiid="downloadbar-bar";
    else if(brnch.getCharPref("extensions.mdownloadbar.userinterface")=="panel") uiid="downloadbar-downloadpanel";

    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
               .getService(Components.interfaces.nsIWindowMediator);
    var enumerator = wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;
      try {
        Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");
      } catch (e) {
        // old Firefox versions (e.g. 3.6) didn't have PrivateBrowsingUtils.
      }
      if (window && "undefined" != typeof(PrivateBrowsingUtils) &&
        PrivateBrowsingUtils.privacyContextFromWindow) {
        var privacyContext = PrivateBrowsingUtils.privacyContextFromWindow(window);
        var isWindowPrivate = privacyContext.usePrivateBrowsing;
      } else {
        // older than Firefox 19 or couldn't get window.
        var privacyContext = null;
        var isWindowPrivate = false;
      }
      if(isWindowPrivate !=isDownloadPrivate) continue
      let s=document.getElementById("downloadbar-stack-"+dlid);
      //s.dl.cancel();
      s.parentNode.removeChild(s);
      try{
        var hstry=JSON.parse(this.readJSON());
      }
      catch(e){
        this.writeJSON("{}");
        var hstry=JSON.parse(this.readJSON());
      }
      delete hstry[dlid];
      this.writeJSON(JSON.stringify(hstry));

      if(uiid=="downloadbar-bar" && document.getElementById(uiid).getElementsByTagName("stack").length==0) document.getElementById(uiid).setAttribute("collapsed","true");
      if(document.getElementById("downloadbar-cntr")){
        if(dl.succeeded){
          let prgrscnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[0]);
          let cmpltcnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[1])-1;
          document.getElementById("downloadbar-cntr").setAttribute("value",prgrscnt+":"+cmpltcnt);
        }
        else{
          let prgrscnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[0])-1;
          let cmpltcnt=parseInt(document.getElementById("downloadbar-cntr").getAttribute("value").split(":")[1]);
          document.getElementById("downloadbar-cntr").setAttribute("value",prgrscnt+":"+cmpltcnt);
        }
      }
    }
  },
  public_view:null,
  private_view:null,
  rgstrVw:function(){
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
    .getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
    .getService(Components.interfaces.nsIVersionComparator);
    if(versionChecker.compare(appInfo.version,"26") >= 0) {
      Components.utils.import("resource://gre/modules/Downloads.jsm");
      Components.utils.import("resource://gre/modules/DownloadUtils.jsm");
      Components.utils.import("resource://gre/modules/osfile.jsm");
      Components.utils.import("resource://gre/modules/Task.jsm");
      var that=this;
      Task.spawn(function () {
        let public_list = yield Downloads.getList(Downloads.PUBLIC);
        that.public_view = {
          onDownloadAdded: download => that.onDownloadAdded(download,false),
          onDownloadChanged: download => that.onDownloadChanged(download,false),
          onDownloadRemoved: download => that.onDownloadRemoved(download,false)
        };
        yield public_list.addView(that.public_view);
        let private_list = yield Downloads.getList(Downloads.PRIVATE);
        that.private_view = {
          onDownloadAdded: download => that.onDownloadAdded(download,true),
          onDownloadChanged: download => that.onDownloadChanged(download,true),
          onDownloadRemoved: download => that.onDownloadRemoved(download,true)
        };
        yield private_list.addView(that.private_view);
      }).then(null, Components.utils.reportError);
    }
    else {
    }
  },
  init:function(){
    var file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
    file.append("downloadbar");
    file.append("history.json");
    var ioService = Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);
    if (!file.exists()){
      var j = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
      j.append("downloadbar");
      j.append("history.json");  
      try{
        j.create(0x00,0664);
      }
      catch(e){
        var parent=j.parent;
        parent.remove(false);
        var jn = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
        jn.append("downloadbar");
        jn.append("history.json");
        jn.create(0x00,0664);
      }
      this.writeJSON("{}");
    }  
    this.switchdb();
    this.rgstrVw();
    this.rgstrObs();
    //this.addAddonListener();
  },
  rgstr:function(){
    if(this.dn) return;
    this.rgstrVw();
    this.dn=true;
  },
  switchdb:function(){
    var brnch=Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    if(brnch.getCharPref("extensions.mdownloadbar.history")!="{}" && this.readJSON()=="{}") {
      this.writeJSON(brnch.getCharPref("extensions.mdownloadbar.history"));
      brnch.setCharPref("extensions.mdownloadbar.history","{}");
    }
  },
  dn:false,
  observe: function(subject,topic,data) {
    switch(topic) {
      case "profile-after-change":
      var file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
      file.append("downloadbar");
      file.append("history.json");
      var ioService = Components.classes["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService);
      if (!file.exists()){
        var j = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
        j.append("downloadbar");
        j.append("history.json");
        try{
          j.create(0x00,0664);
        }
        catch(e){
          var parent=j.parent;
          parent.remove(false);
          var jn = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
          jn.append("downloadbar");
          jn.append("history.json");
          jn.create(0x00,0664);
        }
        this.writeJSON("{}");
      }  
      this.switchdb();
      this.rgstrVw();
      this.addAddonListener();
      var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
      observerService.addObserver(this, "quit-application-granted", true);
       break;
      case "quit-application-granted":
        let brnch=Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
        if(brnch.getBoolPref("extensions.mdownloadbar.autocleancompletedonquit")==true) {
          try{
            var hstry=JSON.parse(this.readJSON());
          }
          catch(e){
            this.writeJSON("{}");
            var hstry=JSON.parse(this.readJSON());
          }
          for(var h in hstry)
          {
            if(hstry[h].succeeded) {
              //let exid=hstry[h].id;
              //delete hstry[hstry[h].id];
              delete hstry[h];
            }
          }
          this.writeJSON(JSON.stringify(hstry));
        }
      break;
      default:
      throw Components.Exception("Unknown topic: "+topic);
    }
  },
  read:function(file,charset){
    try {
      var scriptableInputStream = Components.classes['@mozilla.org/scriptableinputstream;1']
                .createInstance(Components.interfaces.nsIScriptableInputStream);
      var fileInputStream = Components.classes['@mozilla.org/network/file-input-stream;1']
                .createInstance(Components.interfaces.nsIFileInputStream);
      var data=new String();
      fileInputStream.init(file,1,0,false);
      scriptableInputStream.init(fileInputStream);
      data+=scriptableInputStream.read(-1);
      scriptableInputStream.close();
      fileInputStream.close();
      if (charset) {
        try {
          var scriptableUnicodeConverter = Components.classes['@mozilla.org/intl/scriptableunicodeconverter']
                    .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
          scriptableUnicodeConverter.charset = charset;
          data = scriptableUnicodeConverter.ConvertToUnicode(data);  
        } 
        catch(err) {}
      }
      return data;
    } catch(err){
      return false;
    }
  },
  write:function(file,data,mode,charset) {
    try {
      var fileOutputStream = Components.classes['@mozilla.org/network/file-output-stream;1']
                .createInstance(Components.interfaces.nsIFileOutputStream);
      if (charset) {
        try {
          var scriptableUnicodeConverter = Components.classes['@mozilla.org/intl/scriptableunicodeconverter']
                    .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
          scriptableUnicodeConverter.charset = charset;
          data = scriptableUnicodeConverter.ConvertFromUnicode(data);
        }
        catch(err) {}
      }
      var flags = 0x02 | 0x08 | 0x20;
      if (mode == 'a') {
        flags = 0x02 | 0x10;
      }
      fileOutputStream.init(file, flags, 0664, 0);
      fileOutputStream.write(data, data.length);
      fileOutputStream.close();
      return true;
    }
    catch(err) {return false;}
  },
  readJSON:function(){
    var j = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
    j.append("downloadbar");
    j.append("history.json");  
    return this.read(j,"UTF-8");
  },
  writeJSON:function(hstry){
    var j = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
    j.append("downloadbar");
    j.append("history.json"); 
    this.write(j, hstry, "w", "UTF-8");
  },
  addAddonListener:function(){
    let listener = {  
      onInstalling: function(addon) {},
      onUninstalling: function(addon) {
      if (addon.id == "modernDownloadManager@teo.pl") {
        var prompts = Services.prompt;
        var stringBundle = Services.strings;
        var bundle = stringBundle.createBundle("chrome://downloadbar/locale/browserOverlay.properties");
        var check = {value: true};
        var result = prompts.confirmCheck(null, "Modern Download Manager", bundle.GetStringFromName("removedatabase"),
                          null, check);
        if(result){
          var db = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
          db.append("downloadbar");
          db.remove(true);
          Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.mdownloadbar.").deleteBranch("");
        }
      }
      },
      onOperationCancelled: function(addon) {}
    }  
    try {  
      Components.utils.import("resource://gre/modules/AddonManager.jsm");
      AddonManager.addAddonListener(listener);  
    } catch (ex) {}
  }
}
var components = [DownloadBar];
if ("generateNSGetFactory" in XPCOMUtils)
  var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
else
  var NSGetModule = XPCOMUtils.generateNSGetModule(components);