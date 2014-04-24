var mdbChecksum = {

  load: function() {
		window.removeEventListener('load', mdbChecksum.load, false);
    document.getElementById('cmprtxtbx').addEventListener("input",mdbChecksum.cmpr,false);
    document.getElementById("checksumvl").value=document.getElementById("downloadbar-optsprprts").getString("clcltng")+"... 0%";
    mdbChecksum.clcltHash(window.arguments[0],window.arguments[1]);
  },

  cmpr: function(event) {
    if(document.getElementById("cmprtxtbx").value.toLowerCase()==document.getElementById("checksumvl").value) {
      document.getElementById('rsltcn').setAttribute("style","-moz-image-region: rect(0, 16px, 16px, 0) !important; list-style-image: url('chrome://downloadbar/skin/checksum.png') !important;");
    }else {
      document.getElementById('rsltcn').setAttribute("style","-moz-image-region: rect(0, 32px, 16px, 16px) !important; list-style-image: url('chrome://downloadbar/skin/checksum.png') !important;");
    }
  },

  chck: function(event) {
    if (this.running == true) {
      // We are running a hash, stop it.
      this.cancel();
      this.clcltHash(window.arguments[0],event.currentTarget.value);
    } else {
      this.clcltHash(window.arguments[0],event.currentTarget.value);
    }
    document.getElementById("cmprtxtbx").value="";
    document.getElementById('rsltcn').setAttribute("style","-moz-image-region: rect(0, 48px, 16px, 32px) !important; list-style-image: url('chrome://downloadbar/skin/checksum.png') !important;");
  },

  clcltHashld: function(path,algorithm) {
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
    if(algorithm=="MD5") ch.init(ch.MD5);    
    else if(algorithm=="SHA1") ch.init(ch.SHA1);
    else if(algorithm=="MD2") ch.init(ch.MD2);
    else if(algorithm=="SHA256") ch.init(ch.SHA256);
    else if(algorithm=="SHA384") ch.init(ch.SHA384);
    else if(algorithm=="SHA512") ch.init(ch.SHA512);
    // this tells updateFromStream to read the entire file
    const PR_UINT32_MAX = 0xffffffff;
    ch.updateFromStream(istream, PR_UINT32_MAX);
    // pass false here to get binary data back
    var hash = ch.finish(false);
    // return the two-digit hexadecimal code for a byte
    function toHexString(charCode)
    {
      return ("0" + charCode.toString(16)).slice(-2);
    }
    // convert the binary hash data to a hex string.
    var s = [toHexString(hash.charCodeAt(i)) for (i in hash)].join("");
    // s now contains your hash in hex
    return s;
  },

  clcltHash: function(path,algorithm,stck) {
    if (this.running == true) {
      this.cancel();
    }else {
      this.running = true;
      var path=path;
      var file=Components.classes["@mozilla.org/file/local;1"]
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

      this.timer=Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
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
        document.getElementById("checksumvl").value=document.getElementById("downloadbar-optsprprts").getString("clcltng")+"... "+parseInt(progress)+"%";

        if (this.timer != null) this.timer.initWithCallback(this, this.interval, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
      }
    } else {
      this.finalize(this.ch, this.istream, this.remaining);
    }
  },

  finalize: function(ch,istream,pending) {
    if (this.running) {
      var hash = ch.finish(false);
      var s = [];
      var i;
      for (i in hash) {
        s[i] = ("0" + hash.charCodeAt(i).toString(16)).slice(-2);
      }
      this.result = s.join("");
      document.getElementById("checksumvl").value=this.result;
      window.sizeToContent();
      window.moveTo((screen.availWidth-window.outerWidth )/2,(screen.availHeight-window.outerHeight)/2);

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
  },

  copy: function(event) {
    const gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
                                       .getService(Components.interfaces.nsIClipboardHelper);
    gClipboardHelper.copyString(document.getElementById("checksumvl").value);
  }
}

window.addEventListener("load", mdbChecksum.load, false);
window.addEventListener("unload", mdbChecksum.cancel, false);