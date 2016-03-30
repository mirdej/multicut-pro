outlets = 3;

var outpath = "";
var xsltpath = "";
var xmlpath = "";
var xmlfiles = new Array();
var temppath = "";
var logpath = "";
var projectdir = "";
var jsonfile = "";
var multiclipref = "";
var multiclipname = "";
var assets = new Dict("assets")
var angles = new Array();
var master_angle = 0;
var stored_master = 0;
var duration = 0;
var last_time = 0;
var last_cam = 0;
var timediff = 0;
var verbose = 1;
var tcStart = 0;

var events = new Array();
var assets = new Array();
var idCount = 0;
var lanecounter;
var d1;

// ----------------------------------------------------------------------------------------
//																parse time

function	parseFcpTime(t) {
	var tt = eval ((""+t).replace('s',''));
	return parseFloat(tt);
}

// ----------------------------------------------------------------------------------------
//																check if input files are valid

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


	 
}

// ----------------------------------------------------------------------------------------
//																get path to xslt file

function patcherpath(p) {
	xsltpath = p+"support/mcp.transform.xsl";
	
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



// ----------------------------------------------------------------------------------------
//																read project directory

function read(p) {
	var f = new Folder (p);
	
	f.typelist = ["fold"];
	while (!f.end) {
  	  if (f.filename == "xml") xmlpath = p+"xml";
  	  if (f.filename == "logs") logpath = p+"logs";
  	  if (f.filename == "temp") temppath = p+"temp";
   	 f.next();
 	 }
	f.close();
	
	if (xmlpath == "") {	error("Cannot find valid XML directory. Aborting.");	return 0;	}
	if (logpath == "") {	error("Cannot find valid LOG directory. Aborting.");	return 0;	}
	if (temppath == "") {
		temppath = p+"/temp";		
		post("Creating temp folder.");
		outlet(1,"mkdir "+temppath.replace(" ","\\\ "));
	}
	outpath = p;
	
	xmlfiles.length = 0;
	f = new Folder (xmlpath);
	//f.typelist = ["xml"];
	while (!f.end) {
		//post(f.extension)
  	  	if (f.extension == ".fcpxml") {xmlfiles.push(xmlpath+"/"+f.filename);}
   	 f.next();
 	 }
	f.close();

	if (xmlfiles.length == 0 ) {	error("Cannot find valid XML files. Aborting.");	return 0;	}
	s = "xsltproc -o "+temppath.replace(" ","\\\ ")+"/mcptmp.json "+xsltpath.replace(" ","\\\ ")+" "+xmlfiles[0].replace(" ","\\\ ");
	outlet(1,s);	
	
	
	jsonfile = temppath+"/mcptmp.json";
		f = new File(jsonfile);
	 var s = f.readline();f.close();
	 if (s=="") {	error("Cannot find valid generated JSON file. Aborting.");	return 0;	}
	 
		// import JSON
	d1 = new Dict("import");
	outlet(0,"dict","import",jsonfile);
	d1.import_json(jsonfile);

	tcStart = parseFcpTime(d1.get("tcStart"));

	assets = d1.get("assets");
	var mc = new Dict();

	mc = d1.get("multiclip");
	var temp = new Dict();
	var keys = mc.getkeys();

				
	for (var i = 0; i < keys.length; i++) {
		temp = mc.get(keys[i]);
		post (temp);post();
		angles[i] = new Angle(temp.get("name"));
		angles[i].id =keys[i];
		angles[i].idx = i;
		angles[i].clipsFromString(temp.get("clips"))
		angles[i].clipsFromString(temp.get("gaps"))
		angles[i].announce();
	}
	

	var	mc = d1.get("sequence");
	duration = 	parseFcpTime(mc.get("duration"));
	multiclipref = mc.get("ref");
	outlet(0,'duration',duration);

}

function getTimeStamp() { var now = new Date(); return (now.getFullYear() +'-'+ (now.getMonth() + 1) + '-' + (now.getDate()) +  " " + now.getHours() + ':' + ((now.getMinutes() < 10) ? ("0" + now.getMinutes()) : (now.getMinutes())) + ':' + ((now.getSeconds() < 10) ? ("0" + now.getSeconds()) : (now.getSeconds()))); }

// ----------------------------------------------------------------------------------------
//																PARSE LOGFILE

function parselog() {
	var ff = new Folder (logpath);
	ff.next();
	p = logpath+"/"+ff.filename;
	var f = new File(p);
	var mode = 0;
	if (f.readline() == "mcp.eventlist") mode = 1;
	
	if (!mode) {
		f.close();
		error ("Unknown file format for file: ",p);
		return;
	}
	
	var s;
	log("Parsing file "+ p);
	while (f.position != f.eof) {
		s = f.readline();
		s = s.replace(/#.*/g,''); 			// remove comments
		s = s.replace(/^\s+|\s+$/g,'')  	// remove leading/trailing whitespace
		s = s.replace(/\"(.*) (.*)\"/g,"$1%20$2")	// escape spaces if in parenthesis
		s = s.replace(/"/g,'');						// remove parenthesis
		s = s.replace(/\s+/g,' ');			// replace whitespace with exactly one space
	//	log(s);
		if (s.length) {
			if (mode == 1) {
				events.push(new Event(s));
			}
		}
	}
	f.close();
	log ("Sorting Events");
	
	events.sort(function(a,b){return(a.time > b.time);});
	
	//create last endcut and calculate duration
	var lastevent = events[events.length -1];

	if (lastevent.type != "cut") { 
				events.push(new Event(parseInt(lastevent.time + 1) + " cut 0"))
	}
	
	//inspect_events();
	
	write();
}


// ------------------------------------------------------------------------------------------
// Write XML
// ------------------------------------------------------------------------------------------

function write() {
	var a = outpath.split('/');
	outname = a.pop();
	outname = a.pop();
	outname +="_MCP.fcpxml"
	var f = new File(outpath+outname,"write");
	f.eof = 0;
	
	
	var s, inr;
	var ff = new File (xmlfiles[0]) ;
	while (ff.position != ff.eof){ 
		var s = ff.readline();
		f.writeline(s); 
		if (s.indexOf("<spine>") > -1)  break;
	}
    
    var e;
    var start = -1;
    var cam = 0;
    var end = -1;
    var inline = "";
    
    for (var i = 0; i < events.length; i++) {
    	e = events[i];
    	if (e.time < 0) continue;  //skip values below 0
		
		switch (e.type) {
		
			case "cut":
				if (start < 0) start = 0;
				f.writestring(get_multiclipitem_xml(start,e.time-start,cam));
				if (inline != '' ) {f.writeline(inline);}
				f.writeline('</mc-clip>');
				inline = "";
				lanecounter = 1;
				start = e.time;
				cam = e.params[0]
				break;
			
			case "start":
				start = e.time;
				cam = e.params[0];
				break;
				
			case "clip": 
				inline += get_clip_xml(e.time,e.params[0]);
				break;
			
			case "title":
				inline += get_title_xml(e.time,e.params[0]);
				break;
		}
		

    }
 

    f.writeline('					</spine>');
    f.writeline('				</sequence>');
    f.writeline('			</project>');
    f.writeline('		</event>');
    f.writeline('	</library>');
  	f.writeline('</fcpxml>');
	f.close();

}

function get_title_xml(time,name) {
return "";
        var s =   '<title lane="'+(lanecounter++)+'" ';
        s+= 					'offset="'+time+'/1000s" ref="r15" name="SchulTV-Namentitel" ';
        s+=						'duration="1290240/153600s" start="3600s">';
        s+=							'<text></text>';
		s+=							'<text>'+name+'</text></title>';
		return s;
}
function get_clip_xml(time,name) {

	var theAsset = "";
	var keys = assets.getkeys();

				
	for (var i = 0; i < keys.length; i++) {
		temp = assets.get(keys[i]);
		if (temp.get("name") == name) {theAsset = temp; break;}
	}

	if (theAsset === "") {error ("Cannot find asset "+name);return "";}
	
    var s =   '<clip lane="'+(lanecounter++)+'" ';
    s +=				'offset="'+time+'/1000s" ';
    s +=				'name="'+name+'" ';
    s +=				'duration="'+theAsset.get("duration")+'/1000s" ';
    s +=				'start="'+theAsset.get("start")+'/1000s" ';
    s +=				'tcFormat="NDF">';
    s +=				'	<video offset="'+theAsset.get("start")+'" ref="'+theAsset.get("id")+'" duration="'+theAsset.get("duration")+'">';
    s +=				'	<audio lane="-1" offset="'+theAsset.get("start")+'" ref="'+theAsset.get("id")+'" duration="'+theAsset.get("duration")+'" role="dialogue"/>';
    s +=				'</video>';
    s +=				'</clip>';
    return s;
}

function get_multiclipitem_xml(time,duration,cam) {
var start = time + tcStart*1000;
var s = '<mc-clip offset="'+time+'/1000s" ';
s +=				'ref="'+multiclipref+'" ';
s +=				'name="'+outname+'" ';
s +=				'duration="'+duration+'/1000s" ';
s +=				'start="'+start+'/1000s">';
s +=					'	<mc-source ';
s +=							'angleID="'+angles[cam].id+'" ';
s +=								'srcEnable="video"/>';
s +=					'	<mc-source ';
s +=							'angleID="'+angles[4].id+'" ';
s +=								'srcEnable="audio"/>';
return s; 
}


function msg_float(f) {
//	angles[master_angle].update(f);
	for (var i = 0; i < angles.length; i++) {
		angles[i].update(f);
	}
}


// ----------------------------------------------------------------------------------------
//																map log time to xml time
function timemap(sequencetime,logtime) {
	timediff = 	sequencetime - logtime;
}


function inspect_events() {
	if (!verbose) return;
	var i;
	post (events.length, "Events:");post();
	for (i = 0; i < events.length; i++) {
		events[i].inspect();
	}
}


function log(s) {if (verbose) {post(s); post();}}


function add_asset (n,path,duration,start) {
	n = n.replace(/\.mov$/g,'');
	assets.push(new Asset(n,path,duration,start));
}
// ------------------------------------------------------------------------------------------
// Classes
// ------------------------------------------------------------------------------------------

// ----------------------------------------------------------------------------------------
//															Event

function Event (s) {

	if ((s.match(/ /g)||[]).length < 2) { error("Not enough arguments:",s); s = "-1 nop nop"}
	s = s.split(" ");
	
	this.time = parseInt(s[0]) + timediff;
	this.time /= 20.;								// keep in 50fps edit boundaries
	this.time = Math.floor(this.time);
	this.time *= 20.;
	
	if (isNaN(this.time) ) { error("Coud not parse time:",s); this.time = -1;}
	
	this.type = s[1];
	this.params = new Array();

	for (var i = 2; i < s.length;i++) {
		this.params.push(s[i].replace(/%20/g,' '));
	}
	
	this.inspect = function () {
		post("time: "+this.time);
		post("event: "+this.type);
		post("with: "+this.params);
		post("params:",this.params.length)
		post();
	}
}

// ----------------------------------------------------------------------------------------
//															Asset

function Asset (name,path,duration,start) {
	this.name = name;
	this.path = path.replace(/^(.*):/g,'file://localhost');
	this.path  = encodeURI(this.path); //.replace(/\s/g,'%20');
	this.duration = duration;
	this.start = start;
	this.id = "assetID"+(idCount++);
	
	this.getxml = function () {
	     var s = ' <asset id="'+this.id+'" name="'+this.name+'" projectRef="r2" src="'+this.path+'" ';
	     s += 			'start="'+this.start+'/1000s" duration="'+this.duration+'/1000s" ';
	     s +=			'hasVideo="1" hasAudio="1" audioSources="1" audioChannels="2" audioRate="48000" />';
			return s;
		
	}
}


// ----------------------------------------------------------------------------------------
//															clip object

function Clip(offset,ref) {
	if (ref == "gap") return;
	this.offset = parseFcpTime(offset)
	this.path = assets.get(ref).get("path");
	if (this.path === null) {this.path = "gap";}
	this.path = this.path.replace(/%20/g," ");
	this.path = this.path.replace(/%23/g,"#");
	
	this.post = function () {
		post("clip: "+this.path,this.offset,"\n");
	}
}

// ----------------------------------------------------------------------------------------
//															angle object

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

