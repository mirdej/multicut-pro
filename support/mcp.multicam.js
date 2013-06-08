outlets = 2;

function Clip(offset,ref) {
	this.offset = eval ((""+offset).replace('s',''));
	this.offset = parseFloat(this.offset);
	this.path = assets.get(ref);
	if (this.path === null) {this.path = "gap";}
	this.path = this.path.replace(/%20/g," ");
	
	this.post = function () {
		post("clip: "+this.path,this.offset,"\n");
	}
}

function Angle(name) {
	this.name = name;
	this.sent = -1;
	this.idx = -1;
	this.clips = new Array();
	
	this.push = function(elem) {
		this.clips.push(elem);
		this.clips.sort(function(a,b) {
			return (a.offset > b.offset);
		});
	}
	
	this.findclip = function (t) {
		for (var i = 0; i < this.clips.length; i++) {
			if (this.clips[i].offset > t) {
				if (i)	return this.clips[i-1];
				else return -1
			}	
		}
		return this.clips[i-1];
	}
	
	this.update = function (t) {
		var s = this.findclip(t);
		if (s.path != "gap") {	outlet(0,this.idx,"time",t - s.offset);}
		
		if (s != this.sent) {
			this.sent = s;
			outlet(0,this.idx,"path",s.path);
		}
	}
	
	this.clipsFromString = function (s) {
		var items = s.split(" ");
		for (var i = 0; i < items.length; i = i + 2) {
			this.push(new Clip(items[i],items[i+1]))
		}
	}
	
	this.announce = function () {
			outlet(0,this.idx,"name",this.name);
	}
	
	this.inspect = function() {
		for (var i = 0; i < this.clips.length; i++) {
			this.clips[i].post()
		}
	}
}


var xsltpath = ""
var tmppath = "/var/tmp/mcptmp.json"
var assets = new Dict("assets")
var angles = new Array();

function mypath(p) {
	xsltpath = p+"support/mcp.transform.xsl";
	tmppath = p+"mcptmp.json";
}

function filesValid(p) {
//check if file valid
	var f = new File(p);
	var s = f.readline();
	s =  f.readline();
	f.close();  

	if (s != "<!DOCTYPE fcpxml>") {
		error("This file does not seem to be a Final Cut XML export. Aborting.");
		return 0;
	}

	//check for xslt file
	 f = new File(xsltpath);
	 var s = f.readline();
	 f.close();  
	 if (s != '<?xml version="1.0" encoding="utf-8"?>') {
		error("Cannot find valid XSLT file. Aborting.");
		return 0;
	}
	
	return 1;
	 
}

function read(p) {

	if (!filesValid(p)) return;
	post("Parsing FinalCutPro XML");
	
	s = "xsltproc -o "+tmppath+" "+xsltpath+" "+p;
	outlet(1,s);	
	//outlet(0,"import",tmppath);

	// import JSON
	var d1 = new Dict("import");
	d1.import_json(tmppath);
	outlet(1,"rm "+tmppath);	

	assets = d1.get("assets");
	var mc = new Dict();
	mc = d1.get("multiclip");
	var temp = new Dict();
	var keys = mc.getkeys();
	for (var i = 0; i < keys.length; i++) {
		temp = mc.get(keys[i]);
		angles[i] = new Angle(temp.get("name"));
		angles[i].id =keys[i];
		angles[i].idx = i;
		angles[i].clipsFromString(temp.get("clips"))
		angles[i].clipsFromString(temp.get("gaps"))
		angles[i].announce();
	}
}

function msg_float(f) {
	for (var i = 0; i < angles.length; i++) {
		angles[i].update(f);
	}
}

