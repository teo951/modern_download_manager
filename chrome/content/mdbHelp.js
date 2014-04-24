var mdbPanelContent = {

  mdbLoadHelp: function() {
    var index = window.arguments[0];
    var field = window.arguments[1];
    const HTMLNS = "http://www.w3.org/1999/xhtml";

    document.getElementById("field").value = field;
    var fh = document.getElementById('mdb-help');
    var helpTxt = fh.getString("mdb.help_"+index+".text1");

    // XUL pallette
    var desc = document.createElement('description');
    desc.setAttribute('flex', "1");
    var separator = document.createElement('separator');
    separator.setAttribute('class', "thin");
    var vbox = document.createElement('vbox');
    var hbox = document.createElement('hbox');
    var grid = document.createElement('grid');
    var columns = document.createElement('columns');
    var column = document.createElement('column');
    var rows = document.createElement('rows');
    var row = document.createElement('row');
    var spacer = document.createElement('spacer');
    spacer.setAttribute('flex', "1");
    var image = document.createElement('image');
    var label = document.createElement('label');
    var text = document.createElement('text');

    // HTML namespace elements
    var htmlul = document.createElementNS(HTMLNS, "html:ul");
    var htmlli = document.createElementNS(HTMLNS, "html:li");

    var helpTxtbox = document.getElementById('helptextbox');

    switch(index) {
      case "01": case "02": case "03": case "04": case "05": case "06":
       case "07": case "08": case "09": case "10":
        helpTxt = fh.getString("mdb.help_"+index+".text1");
        this.mdbAddTxtHelpLine(helpTxtbox,helpTxt);

        helpTxt = fh.getString("mdb.help_"+index+".text2");
        this.mdbAddTxtHelpLine(helpTxtbox,helpTxt);

        helpTxt = fh.getString("mdb.help_"+index+".text3");
        this.mdbAddTxtHelpLine(helpTxtbox,helpTxt);

        helpTxt = fh.getString("mdb.help_"+index+".text4");
        this.mdbAddTxtHelpLine(helpTxtbox,helpTxt);

        helpTxt = fh.getString("mdb.help_"+index+".text5");
        this.mdbAddTxtHelpLine(helpTxtbox,helpTxt);

        helpTxt = fh.getString("mdb.help_"+index+".text6");
        this.mdbAddTxtHelpLine(helpTxtbox,helpTxt);

        helpTxt = fh.getString("mdb.help_"+index+".text7");
        this.mdbAddTxtHelpLine(helpTxtbox,helpTxt);

        helpTxt = fh.getString("mdb.help_"+index+".text8");
        this.mdbAddTxtHelpLine(helpTxtbox,helpTxt);

        helpTxt = fh.getString("mdb.help_"+index+".text9");
        this.mdbAddTxtHelpLine(helpTxtbox,helpTxt);
        break;
    }
  },

  mdbAddTxtHelpLine: function(box,txt) {
    var desc = document.createElement('description');
    desc.setAttribute('flex', "1");
    desc.appendChild(document.createTextNode(txt));
    box.appendChild(desc);
    var separator = document.createElement('separator');
    separator.setAttribute('class', "thin");
    box.appendChild(separator);
  }
}