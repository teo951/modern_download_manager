Components.utils.import("resource://gre/modules/osfile.jsm");
var DownloadBarRnm = {

  load: function() {
    window.removeEventListener("load", DownloadBarRnm.load, false);
    let s=window.arguments[0];
    let basename=OS.Path.basename(s.dl.target.path);
    let flext=basename.substring(basename.lastIndexOf(".")+1, basename.length);
    document.getElementById("rnmflnm").value=basename.substring(0,basename.lastIndexOf("."));
    document.getElementById("rnmflext").value=flext;
  },

  accept: function(event) {
    let filename=document.getElementById("rnmflnm").value+"."+document.getElementById("rnmflext").value;
    window.opener.mdbOverlay.onRenameAccept(window.arguments[0],filename);
    return true;
  },
}

window.addEventListener("load", DownloadBarRnm.load, false);