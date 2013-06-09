outlets = 3;

function	parseFcpTime(t) {
	var tt = eval ((""+t).replace('s',''));
	return parseFloat(tt);
}

function Clip(offset,ref) {
	this.offset = parseFcpTime(offset)
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
		if (i)	return this.clips[i-1]
		else if (this.clips.length = 1 )return this.clips[0];
		return -1;
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
		if (s.length == 0) return;
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


var logpath = ""
var xsltpath = ""
var tmppath = "/var/tmp/mcptmp.json"
var assets = new Dict("assets")
var angles = new Array();
var master_angle = 0;
var stored_master = 0;
var duration = 0;
var last_time = 0;
var last_cam = 0;
var log = "";
var ref = "";

function mypath(p) {
	xsltpath = p+"support/mcp.transform.xsl";
	tmppath = p+"mcptmp.json";
	logpath = p+"log.xml";
	
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
	outlet(0,"dict","import",tmppath);
	d1.import_json(tmppath);
	//outlet(1,"rm "+tmppath);	

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
	mc = d1.get("sequence");
	duration = 	parseFcpTime(mc.get("duration"));
	ref = mc.get("ref");
	outlet(0,'duration',duration);
	//angles[4].inspect();
	setmaster();
}

function msg_float(f) {
	angles[master_angle].update(f);
	for (var i = 0; i < angles.length; i++) {
		if (i != master_angle) { angles[i].update(f); }
	}
}

function change(cam,time) {
	
	var fact = 5000;
	
	var 	s = 	'<mc-clip offset="'+parseInt(last_time*fact)+'/'+fact+'s" ref="'+ref+'" duration="'+parseInt((time - last_time) * fact)+'/'+fact+'s" start="'+parseInt(last_time*fact)+'/'+fact+'s" >';
			s += 		'<mc-source angleID="'+angles[last_cam].id+'"  srcEnable="all"/>';
			s += 	'</mc-clip>';

	log += s;
		
	last_cam = cam;
	last_time = time;

}


function getlog (){	

	var logfile = new File(logpath,"write");
	logfile.writestring(log);
	logfile.close;
}

function master(i) {
	stored_master = i;
}

function setmaster() {
	i = stored_master;
	if (i < 0) i = 0;
	if (i > (angles.length - 1) > (angles.length - 1)) ;
	master_angle = i;
		post("MASTER:",i,"\n")

	for (var i = 0; i < angles.length; i++) {
			outlet(0,i,"master",(i == master_angle));
			outlet(0,i,"index",i );

	}
}

