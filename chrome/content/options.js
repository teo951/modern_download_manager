Components.utils.import('resource://gre/modules/Services.jsm');

var mdbPref = {

  prefs: Services.prefs.getBranch("extensions.mdownloadbar."),
  wm: Services.wm,
  mdbBundle: document.getElementById("downloadbar-prprts"),
  arrayid:["downloadbar-opt-bckgndclr","downloadbar-opt-dwnlprgrssclr","downloadbar-opt-dwnldtxtclr",
           "downloadbar-opt-dwncmpltclr","downloadbar-opt-dwnbrdclr","downloadbar-opt-dwnldpsclr",
           "downloadbar-opt-brbckgrndclr","downloadbar-opt-slwstspdclr","downloadbar-opt-vrgspdfrstclr",
           "downloadbar-opt-vrgspdscndclr","downloadbar-opt-fstsspdclr"],
  arraypref:["downloadbackgroundcolor","downloadprogresscolor","downloadtextcolor","downloadcompletecolor",
             "downloadbordercolor","downloadpausecolor","barbackgroundcolor","slowestbandwidthcolor",
             "averagespeedfirstbandwidthcolor","averagespeedsecondbandwidthcolor","fastestbandwidthcolor"],

  observe: function (subject, topic, data) {
    if (topic == 'nsPref:changed') {
      mdbPref.init();
    }
  },

  init: function() {
    //Show/hide button on navbar - feature disabled
    /*let addonbutton = mdbPref.prefs.getBoolPref("showaddonbarbutton");
    if (addonbutton) {
      let enumerator = mdbPref.wm.getEnumerator("navigator:browser");
      while(enumerator.hasMoreElements()) {
        let window = enumerator.getNext();
        let document=window.document;
        document.getElementById("downloadbar-ddnbr").hidden=true;
      }
    };
    if (!addonbutton) {
      let enumerator = mdbPref.wm.getEnumerator("navigator:browser");
      while(enumerator.hasMoreElements()) {
        let window = enumerator.getNext();
        let document=window.document;
        document.getElementById("downloadbar-ddnbr").hidden=false;
      }
    };*/
    //Sound file path
    let dop=mdbPref.prefs.getCharPref("audioplayerpath");
    if(dop!="") {
      let audioplayerpath=mdbPref.prefs.getComplexValue("audioplayerpath", Components.interfaces.nsILocalFile).path;
      document.getElementById('downloadbar-opt-doflpth').value=audioplayerpath;
      var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
      file.initWithPath(audioplayerpath);
      if(file.exists()){
      var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService)
      document.getElementById("downloadbar-opt-doplyr").setAttribute("src",ioService.newFileURI(file).spec);
      }else {
        mdbPref.prefs.setCharPref("audioplayerpath","");
        document.getElementById('downloadbar-opt-doflpth').value=mdbPref.mdbBundle.getString("dfltsnd");
        document.getElementById("downloadbar-opt-doplyr").setAttribute("src","chrome://downloadbar/content/defaultSound.ogg");
      }
    }else {
      document.getElementById('downloadbar-opt-doflpth').value=mdbPref.mdbBundle.getString("dfltsnd");
      document.getElementById('downloadbar-opt-doplyr').setAttribute("src","chrome://downloadbar/content/defaultSound.ogg");
    };
    //Panel maxheight
    let panelmaxheight = mdbPref.prefs.getIntPref('panelmaxheight');
    let enumerator = mdbPref.wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;
      document.getElementById('downloadbar-panelbox').style.setProperty("max-height", panelmaxheight+"px");
    };
    //Download bar color
    let bckgndcolor = mdbPref.prefs.getCharPref("downloadbackgroundcolor");
    let enumerator = mdbPref.wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;
      let uiid=mdbPref.gtuiid();
      let stcks=document.getElementById(uiid).getElementsByTagName("stack");
      for(var i=0;i<stcks.length;i++){
        stcks[i].style.setProperty("background-image", "linear-gradient(to bottom, "+mdbPref.convert2RGBA(bckgndcolor,0.59)+" 0%, "+mdbPref.convert2RGBA(bckgndcolor,1)+" 100%)", "important");
      }
    };
    //Progress bar color
    let progrescolor = mdbPref.prefs.getCharPref("downloadprogresscolor");
    let enumerator = mdbPref.wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;
      let uiid=mdbPref.gtuiid();
      let stcks=document.getElementById(uiid).getElementsByTagName("stack");
      for(var i=0;i<stcks.length;i++){
        if(stcks[i].getAttribute("downcompleted")!="true" && stcks[i].getAttribute("paused")=="false") {
          let hbx=document.getElementById("downloadbar-hbox-"+stcks[i].id.replace("downloadbar-stack-",""));
          hbx.style.setProperty("background-image", "linear-gradient(to bottom, "+mdbPref.convert2RGBA(progrescolor,0.59)+" 0%, "+mdbPref.convert2RGBA(progrescolor,1)+" 100%)", "important");
        }
      }
    };
    //File name and progress text color
    let txtcolor = mdbPref.prefs.getCharPref("downloadtextcolor");
    let enumerator = mdbPref.wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;
      let uiid=mdbPref.gtuiid();
      let stcks=document.getElementById(uiid).getElementsByTagName("stack");
      for(var i=0;i<stcks.length;i++) {
        let lbl=document.getElementById("downloadbar-label-"+stcks[i].id.replace("downloadbar-stack-",""));
        let lblp=document.getElementById("downloadbar-ntfctnwrppr-"+stcks[i].id.replace("downloadbar-stack-",""));
        lbl.style.setProperty("color", txtcolor, "important");
        if(lblp) {
          document.getElementById("downloadbar-lbl-pgrss-"+stcks[i].id.replace("downloadbar-stack-","")).style.setProperty("color", txtcolor, "important");
          document.getElementById("downloadbar-lbl-speed-"+stcks[i].id.replace("downloadbar-stack-","")).style.setProperty("color", txtcolor, "important");
          document.getElementById("downloadbar-lbl-rmngtm-"+stcks[i].id.replace("downloadbar-stack-","")).style.setProperty("color", txtcolor, "important");
        }
      }
    };
    //Completed download color
    let complcolor = mdbPref.prefs.getCharPref("downloadcompletecolor");
    let enumerator = mdbPref.wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;
      let uiid=mdbPref.gtuiid();
      let stcks=document.getElementById(uiid).getElementsByTagName("stack");
      for(var i=0;i<stcks.length;i++){
        if(stcks[i].getAttribute("downcompleted")=="true") {
          let hbx=document.getElementById("downloadbar-hbox-"+stcks[i].id.replace("downloadbar-stack-",""));
          hbx.style.setProperty("background-image", "linear-gradient(to bottom, "+mdbPref.convert2RGBA(complcolor,0.59)+" 0%, "+mdbPref.convert2RGBA(complcolor,1)+" 100%)", "important");
        }
      }
    };
    //Paused download color
    let pausecolor = mdbPref.prefs.getCharPref("downloadpausecolor");
    let enumerator = mdbPref.wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;
      let uiid=mdbPref.gtuiid();
      let stcks=document.getElementById(uiid).getElementsByTagName("stack");
      for(var i=0;i<stcks.length;i++){
        if(stcks[i].getAttribute("paused")=="true") {
          let hbx=document.getElementById("downloadbar-hbox-"+stcks[i].id.replace("downloadbar-stack-",""));
          hbx.style.setProperty("background-image", "linear-gradient(to bottom, "+mdbPref.convert2RGBA(pausecolor,0.59)+" 0%, "+mdbPref.convert2RGBA(pausecolor,1)+" 100%)", "important");
        }
      }
    };
    //Download bar color
    let barbckgndcolor = mdbPref.prefs.getCharPref("barbackgroundcolor");
    let enumerator = mdbPref.wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;
      document.getElementById("downloadbar-bar").style.setProperty("background-image", "linear-gradient(to bottom, "+ mdbPref.convert2RGBA(barbckgndcolor,0.59) +" 0%, "+ mdbPref.convert2RGBA(barbckgndcolor,1) +" 100%)", "important");
      document.getElementById("downloadbar-bar").style.setProperty("background-size", "100% auto", "important");
      document.getElementById("downloadbar-bar").style.setProperty("background-repeat", "no-repeat", "important");
    };
    //Download speed section
    let bndwidthSlovest = mdbPref.prefs.getIntPref("slowestbandwidth");
    document.getElementById('downloadbar-opt-vrgspdfrsttxtbxdsbld').value=bndwidthSlovest;

    let bndwidthAverage = mdbPref.prefs.getIntPref("averagebandwidth");
    document.getElementById('downloadbar-opt-vrgspdscndtxtbxdsbld').value=bndwidthAverage;

    let bndwidthFastest = mdbPref.prefs.getIntPref("fastestbandwidth");
    document.getElementById('downloadbar-opt-fststtxtbxdsbld').value=bndwidthFastest;
    //Reset download, speed colors, and sound settings
    document.getElementById('downloadbar-opt-dwnclrrst').addEventListener("command",mdbPref.rstDwnldClr,false);
    document.getElementById('downloadbar-opt-spdclrrst').addEventListener("command",mdbPref.rstSpdClr,false);
    document.getElementById('downloadbar-opt-plysndrst').addEventListener("command",mdbPref.rstPlySnd,false);
    //Progess notifications aligment
    let alignment = mdbPref.prefs.getCharPref("progresnotifalign");
    let enumerator = mdbPref.wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;

      let uiid=mdbPref.gtuiid();
      let stcks=document.getElementById(uiid).getElementsByTagName("stack");
      for(var i=0;i<stcks.length;i++) {
        if(stcks[i].getAttribute("downcompleted")!="true") {
          document.getElementById("downloadbar-ntfctnwrppr-"+stcks[i].id.replace("downloadbar-stack-","")).setAttribute("orient",alignment);
        }
      }
    };
    //Downloaded elements width
    let enumerator = mdbPref.wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;
      let uiid;
      if(mdbPref.prefs.getCharPref("userinterface")=="bar") uiid="downloadbar-bar";
      else if(mdbPref.prefs.getCharPref("userinterface")=="panel") uiid="downloadbar-downloadpanel";

      let stcks=document.getElementById(uiid).getElementsByTagName("stack");
      for(var i=-0;i<stcks.length;i++) {
        let dwbldtmwdth=mdbPref.prefs.getIntPref("downloaditemwidth");
        stcks[i].style.setProperty("max-width", dwbldtmwdth+"px", "important");
      }
        let downitemwidth=mdbPref.prefs.getIntPref("downloaditemwidth");
        document.getElementById('downloadbar-pnlbll').width=downitemwidth;
        document.getElementById('downloadbar-downloadpanel').width=downitemwidth;
    };
    //Downloaded elements height
    let enumerator = mdbPref.wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;

      let uiid;
      if(mdbPref.prefs.getCharPref("userinterface")=="bar") uiid="downloadbar-bar";
      else if(mdbPref.prefs.getCharPref("userinterface")=="panel") uiid="downloadbar-downloadpanel";

      let stcks=document.getElementById(uiid).getElementsByTagName("stack");
      for(var i=-0;i<stcks.length;i++) {
        let dwbldtmhght=mdbPref.prefs.getIntPref("downloaditemheight");
        stcks[i].style.setProperty("height", dwbldtmhght+"px", "important");
      }
        let downitemheight=mdbPref.prefs.getIntPref("downloaditemheight");
        document.getElementById('downloadbar-pnlbll').height=downitemheight;
    };
    //File name font size
    let enumerator = mdbPref.wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;

      let uiid;
      if(mdbPref.prefs.getCharPref("userinterface")=="bar") uiid="downloadbar-bar";
      else if(mdbPref.prefs.getCharPref("userinterface")=="panel") uiid="downloadbar-downloadpanel";
      
      let stcks=document.getElementById(uiid).getElementsByTagName("stack");
      for(var i=-0;i<stcks.length;i++){
      
        let flnmfntsz = mdbPref.prefs.getIntPref("filenamefontsize");
        if(flnmfntsz!=0) document.getElementById("downloadbar-label-"+stcks[i].id.replace("downloadbar-stack-","")).style.setProperty("font-size", flnmfntsz+"px", "important");
      }
    };
    //Notifications font size
    let enumerator = mdbPref.wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;

      let uiid;
      if(mdbPref.prefs.getCharPref("userinterface")=="bar") uiid="downloadbar-bar";
      else if(mdbPref.prefs.getCharPref("userinterface")=="panel") uiid="downloadbar-downloadpanel";

      let stcks=document.getElementById(uiid).getElementsByTagName("stack");
      for(var i=-0;i<stcks.length;i++){
      
        let pgrssfntsz=mdbPref.prefs.getIntPref("progressfontsize");
        if(stcks[i].getAttribute("downcompleted")!="true") {
          if(pgrssfntsz!=0) document.getElementById("downloadbar-ntfctnwrppr-"+stcks[i].id.replace("downloadbar-stack-","")).style.setProperty("font-size", pgrssfntsz+"px", "important");
        }
      }
    };
    //Bar/toolbar toggle
    if(mdbPref.prefs.getCharPref("userinterface")=="bar") {
      let enumerator = mdbPref.wm.getEnumerator("navigator:browser");
      while(enumerator.hasMoreElements()) {
        let window = enumerator.getNext();
        let document=window.document;

        let stcks=document.getElementById("downloadbar-downloadpanel").getElementsByTagName("stack");
        for(var i=stcks.length-1;i>=0;i--){
          document.getElementById("downloadbar-bar-wrbx").insertBefore(stcks[i],document.getElementById("downloadbar-bar-wrbx").firstChild);
        }

        document.getElementById("downloadbar-bar").setAttribute("collapsed","false");
        document.getElementById("downloadbar-ddnbr").hidden=true;
        document.getElementById("downloadbar-panel").hidePopup();
      }
    }else if(mdbPref.prefs.getCharPref("userinterface")=="panel") {
      let enumerator = mdbPref.wm.getEnumerator("navigator:browser");
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
    };
    //Show/hide Menu button
    let dwnbutton = mdbPref.prefs.getBoolPref("hidedownloadsbutton");
    if (dwnbutton) {
      let enumerator = mdbPref.wm.getEnumerator("navigator:browser");
      while(enumerator.hasMoreElements()) {
        let window = enumerator.getNext();
        let document=window.document;
        document.getElementById("downloadsbar-mn").hidden=true;
      }
    };
    if (!dwnbutton) {
      let enumerator = mdbPref.wm.getEnumerator("navigator:browser");
      while(enumerator.hasMoreElements()) {
        let window = enumerator.getNext();
        let document=window.document;
        document.getElementById("downloadsbar-mn").hidden=false;
      }
    };
    //Show/hide Clear button
    let clearbutton = mdbPref.prefs.getBoolPref("hideclearbutton");
    if (clearbutton) {
      let enumerator = mdbPref.wm.getEnumerator("navigator:browser");
      while(enumerator.hasMoreElements()) {
        let window = enumerator.getNext();
        let document=window.document;
        document.getElementById("downloadbar-bar-clrbttn").hidden=true;
      }
    };
    if (!clearbutton) {
      let enumerator = mdbPref.wm.getEnumerator("navigator:browser");
      while(enumerator.hasMoreElements()) {
        let window = enumerator.getNext();
        let document=window.document;
        document.getElementById("downloadbar-bar-clrbttn").hidden=false;
      }
    };
    //Notification about scaner path
    if(mdbPref.prefs.getBoolPref("automaticviruscan") && !mdbPref.prefs.getCharPref("viruscanpath")) {
      var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                  .getService(Components.interfaces.nsIPromptService);
      var result = prompts.confirm(null, "Modern Download Manager", mdbPref.mdbBundle.getString("vrscnnrlnfrst"));
      if(result){
        const nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        fp.init(window, mdbPref.mdbBundle.getString("lctvrsscnnr") , nsIFilePicker.modeOpen);
        var rv = fp.show();
        if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
          mdbPref.prefs.setComplexValue("viruscanpath", Components.interfaces.nsILocalFile, fp.file);
          document.getElementById('downloadbar-opt-vrsscnpath').value=fp.file.path;
        }
      }
    };
    //Scaner path
    let virpath = mdbPref.prefs.getCharPref("viruscanpath");
    if(virpath!=""){
      let viruscanpath=mdbPref.prefs.getComplexValue("viruscanpath", Components.interfaces.nsILocalFile).path;
      document.getElementById('downloadbar-opt-vrsscnpath').value=viruscanpath;
    };
  },

  modeDisplay: function() {
    let pane = document.getElementById("downloadbar-opt-dwnldpnlrdio").selected;
    document.getElementById("compact-panel-box").collapsed = !pane;
    document.getElementById("downloadbar-opt-hddwnldsbttn").collapsed = pane;
    document.getElementById("downloadbar-opt-hdclrbttn").collapsed = pane;
  },

  rstPlySnd: function() {
    mdbPref.prefs.setCharPref("audioplayerpath","");
    document.getElementById('downloadbar-opt-doflpth').value=mdbPref.mdbBundle.getString("dfltsnd");
    document.getElementById("downloadbar-opt-doplyr").setAttribute("src","chrome://downloadbar/content/defaultSound.ogg");
    mdbPref.prefs.setBoolPref("playsound",false);
  },

  rstDwnldClr: function() {
    for(var i=0;i<7;i++){
	mdbPref.prefs.setCharPref(mdbPref.arraypref[i],"null");
	document.getElementById(mdbPref.arrayid[i]).setAttribute("style", "color:"+mdbPref.prefs.getCharPref(mdbPref.arraypref[i]));
	document.getElementById(mdbPref.arrayid[i]).firstChild.setAttribute("style", "background-color:"+mdbPref.prefs.getCharPref(mdbPref.arraypref[i]));
    };
    mdbPref.rstDwnldBckgrndClr();
    mdbPref.rstDwnldPrgrssClr();
    mdbPref.rstDwnldTxtClr();
    mdbPref.rstDwnldCpmltClr();
    mdbPref.rstDwnldPsClr();
    mdbPref.rstBrBckgrndClr();
  },

  rstSpdClr: function() {
  for(var i=7;i<mdbPref.arrayid.length;i++){
	mdbPref.prefs.setCharPref(mdbPref.arraypref[i],"null");
	document.getElementById(mdbPref.arrayid[i]).setAttribute("style", "color:"+mdbPref.prefs.getCharPref(mdbPref.arraypref[i]));
	document.getElementById(mdbPref.arrayid[i]).firstChild.setAttribute("style", "background-color:"+mdbPref.prefs.getCharPref(mdbPref.arraypref[i]));
    };
  },

  rstDwnldCpmltClr: function() {
    var enumerator = mdbPref.wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;

      let uiid=mdbPref.gtuiid();
      let stcks=document.getElementById(uiid).getElementsByTagName("stack");
      for(var i=0;i<stcks.length;i++){
        if(stcks[i].getAttribute("downcompleted")=="true") {
          let hbx=document.getElementById("downloadbar-hbox-"+stcks[i].id.replace("downloadbar-stack-",""));
          hbx.style.setProperty("background-image", "linear-gradient(to bottom,  #cdeb8e 0%,#a5c956 100%)", "important");
        }
      }
    }
  },

  rstDwnldPsClr: function() {
    var enumerator = mdbPref.wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;

      let uiid=mdbPref.gtuiid();
      let stcks=document.getElementById(uiid).getElementsByTagName("stack");
      for(var i=0;i<stcks.length;i++){
        if(stcks[i].getAttribute("paused")=="true") {
          let hbx=document.getElementById("downloadbar-hbox-"+stcks[i].id.replace("downloadbar-stack-",""));
          hbx.style.setProperty("background-image", "linear-gradient(to bottom,  #cdeb8e 0%,#a5c956 100%)", "important");
        }
      }
    }
  },

  rstBrBckgrndClr: function(event) {  
    var enumerator = mdbPref.wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;
      document.getElementById("downloadbar-bar").style.removeProperty("background-image");
      document.getElementById("downloadbar-bar").style.removeProperty("background-size");
      document.getElementById("downloadbar-bar").style.removeProperty("background-repeat");
    }
  },

  rstDwnldTxtClr: function() {
    var enumerator = mdbPref.wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;

      let uiid=mdbPref.gtuiid();
      let stcks=document.getElementById(uiid).getElementsByTagName("stack");
      for(var i=0;i<stcks.length;i++){
        let lbl=document.getElementById("downloadbar-label-"+stcks[i].id.replace("downloadbar-stack-",""));
        lbl.style.color="";
        if(document.getElementById("downloadbar-labelprogress-"+stcks[i].id.replace("downloadbar-stack-",""))) {
          document.getElementById("downloadbar-labelprogress-"+stcks[i].id.replace("downloadbar-stack-","")).style.color="";
        }
      }
    }
  },

  rstDwnldBckgrndClr: function() {
    var enumerator = mdbPref.wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;

      let uiid=mdbPref.gtuiid();
      let stcks=document.getElementById(uiid).getElementsByTagName("stack");
      for(var i=0;i<stcks.length;i++){
        stcks[i].style.backgroundImage="";
      }
    }
  },

  rstDwnldPrgrssClr: function() {
    var enumerator = mdbPref.wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      let document=window.document;

      let uiid=mdbPref.gtuiid();
      let stcks=document.getElementById(uiid).getElementsByTagName("stack");
      for(var i=0;i<stcks.length;i++){
        if(stcks[i].getAttribute("downcompleted")!="true" && stcks[i].getAttribute("paused")=="false") {
          let hbx=document.getElementById("downloadbar-hbox-"+stcks[i].id.replace("downloadbar-stack-",""));
          hbx.style.setProperty("background-image", "linear-gradient(to bottom,  #cdeb8e 0%,#a5c956 100%)", "important");
        }
      }
    }
  },

  locateScan: function() {
    const nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, mdbPref.mdbBundle.getString("lctvrsscnnr"), nsIFilePicker.modeOpen);
    var rv = fp.show();
    if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
      mdbPref.prefs.setComplexValue("viruscanpath", Components.interfaces.nsILocalFile, fp.file);
      document.getElementById('downloadbar-opt-vrsscnpath').value=fp.file.path;
    }
  },

  locateSound: function() {
    const nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, mdbPref.mdbBundle.getString("lctaudiofl"), nsIFilePicker.modeOpen);
    var rv = fp.show();
    if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
      mdbPref.prefs.setComplexValue("audioplayerpath", Components.interfaces.nsILocalFile, fp.file);
      document.getElementById('downloadbar-opt-doflpth').value=fp.file.path;
      var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService)
      document.getElementById("downloadbar-opt-doplyr").setAttribute("src",ioService.newFileURI(fp.file).spec);
    }
  },

  gtuiid: function() {
    let uiid;
    if(mdbPref.prefs.getCharPref("userinterface")=="bar") uiid="downloadbar-bar";
    else if(mdbPref.prefs.getCharPref("userinterface")=="panel") uiid="downloadbar-downloadpanel";
    return uiid;
  },

  convert2RGBA: function(hex,opacity) {
    let hex = hex.replace('#','');
    let r = parseInt(hex.substring(0,2), 16);
    let g = parseInt(hex.substring(2,4), 16);
    let b = parseInt(hex.substring(4,6), 16);
    return 'rgba('+r+','+g+','+b+','+opacity+')';
  },

  mdbHelp: function(helpIndex,fieldName) {
    let mdbWin = window.openDialog("chrome://downloadbar/content/mdbHelp.xul", "MDB Help", "chrome,dialog=yes,alwaysRaised,resizable,titlebar=no,scrollbars=no,popup=yes",helpIndex,fieldName);
    mdbWin.focus();
    return true;
  },

  changeColor: function(clickedElem) {
    var gColorObj = {elemCurrColor:"", cancel:false};
    let prefcolor;
    for(var i=0;i<mdbPref.arrayid.length;i++){
      if(mdbPref.arrayid[i]==clickedElem.id) {
        prefcolor=mdbPref.arraypref[i];
        gColorObj.elemCurrColor = mdbPref.prefs.getCharPref(mdbPref.arraypref[i]);
      }
    }
    window.openDialog("chrome://downloadbar/content/colourPicker.xul", "_blank", "chrome,close,titlebar,modal,centerscreen", "", gColorObj);
    if (gColorObj.cancel) {return};
    clickedElem.setAttribute("color", gColorObj.elemCurrColor);
    if(gColorObj.elemCurrColor == "") {
      clickedElem.firstChild.setAttribute("style")
    }else {
      clickedElem.firstChild.setAttribute("style", "background-color:" + clickedElem.getAttribute("color"));
      mdbPref.prefs.setCharPref(prefcolor,clickedElem.getAttribute("color"));
    };
  },

  setColor: function() {
    for(var i=0;i<mdbPref.arrayid.length;i++) {
    document.getElementById(mdbPref.arrayid[i]).setAttribute("style", "color:" + mdbPref.prefs.getCharPref(mdbPref.arraypref[i]));
    document.getElementById(mdbPref.arrayid[i]).firstChild.setAttribute("style", "background-color:" + mdbPref.prefs.getCharPref(mdbPref.arraypref[i]));
    }
  }
};

mdbPref.prefs.addObserver('', mdbPref, false);

window.addEventListener("load",function(event){mdbPref.init();mdbPref.setColor();},false);
window.addEventListener('unload', function () {mdbPref.prefs.removeObserver('', mdbPref); }, false);