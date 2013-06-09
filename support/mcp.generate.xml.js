// ------------------------------------------------------------------------------------------
// Generate Final Cut Pro X XML file from eventlist and assertlist files
// ------------------------------------------------------------------------------------------
//
// Part of the MultiCutPro Tools for FinalCutPro
//
//		(c) 2013 by Michael Egger, me@anyma.ch
// 		Published und GNU GPL v3
//
// ------------------------------------------------------------------------------------------

var events = new Array();
var assets = new Array();
var idCount = 0;
var lanecounter;

var verbose = 0;

var attrs = {};

attrs.sequenceformat  	= "r1"
attrs.projectname	  	= "Test-Export"
attrs.angles 			= ["a0","a1","a2","a3","a4"];
attrs.multicam_ref 		= "r3000"
attrs.multicam_name 	= "InclMaster"

masterangle				= 4

declareattribute("verbose");
// ------------------------------------------------------------------------------------------
// Read a folder'o'logs
// ------------------------------------------------------------------------------------------
function folder(p) {
	var f = new Folder (p);
	  f.typelist = [ "TEXT" ]; 
	 while (!f.end) {
	 if (f.filename) {    read(f.pathname+f.filename); } // strange bug?
    f.next();
  }
}

// ------------------------------------------------------------------------------------------
// Read and parse file
// ------------------------------------------------------------------------------------------
function read(p) {
	var f = new File(p);
	var mode = 0;
	if (f.readline() == "mcp.eventlist") mode = 1;
	
	if (!mode) {
		f.close();
		error ("Unknown file format for file: ",p);
		return;
	}
	
	var s;
	log("Parsing file");
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
	
	inspect_events();
	
	outlet(0,"read",1);
}

// ------------------------------------------------------------------------------------------
// Write XML
// ------------------------------------------------------------------------------------------

function write(p) {
	var f = new File(p,"write");
	var ff = new File('Macintosh HD:/Users/tv/multicut-pro/tests/temp.xml')
	//if (!f.open()) {error("Could not open file for writing:",p);return;}
	
	f.eof = 0;
	
	f.writeline('<?xml version="1.0" encoding="UTF-8" standalone="no"?>');
	f.writeline('<!DOCTYPE fcpxml>');
	f.writeline('');
	f.writeline('<fcpxml version="1.2">');
	f.writeline('	<project name="'+attrs.projectname+'">');

	f.writeline('		<resources>');
	f.writeline('            <format id="'+attrs.sequenceformat+'" name="FFVideoFormatDV720x576i50_16x9" frameDuration="200/5000s" fieldOrder="lower first" width="720" height="576" paspH="118" paspV="81"/>');
	
	while (ff.position != ff.eof){ f.writeline(ff.readline()); }
	for (var i = 0; i < assets.length; i++)	{
		 f.writeline(assets[i].getxml());
	 }

	f.writeline('		</resources>');
	
	f.writeline('		<sequence duration="11077800/5000s" format="'+attrs.sequenceformat+'" tcStart="0s" tcFormat="NDF" audioLayout="stereo" audioRate="48k">');
    f.writeline('			<spine>');
    
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
    
    f.writeline('			</spine>');
    f.writeline('		</sequence>');
    f.writeline('	</project>');
  	f.writeline('</fcpxml>');
	f.close();

}

function get_title_xml(time,name) {

        var s =   '<title lane="'+(lanecounter++)+'" ';
        s+= 					'offset="'+time+'/1000s" ref="r15" name="SchulTV-Namentitel" ';
        s+=						'duration="1290240/153600s" start="3600s">';
        s+=							'<text></text>';
		s+=							'<text>'+name+'</text></title>';
		return s;
}
function get_clip_xml(time,name) {
	
	var theAsset;
	for (var i = 0; i < assets.length; i++) {
		if (assets[i].name == name) {theAsset = assets[i]; break;}
	}

	
	
    var s =   '<clip lane="'+(lanecounter++)+'" ';
    s +=				'offset="'+time+'/1000s" ';
    s +=				'name="'+name+'" ';
    s +=				'duration="'+theAsset.duration+'/1000s" ';
    s +=				'start="'+theAsset.start+'/1000s" ';
    s +=				'tcFormat="NDF">';
    s +=				'	<video offset="'+theAsset.start+'/1000s" ref="'+theAsset.id+'" duration="'+theAsset.duration+'/1000s">';
    s +=				'	<audio lane="-1" offset="'+theAsset.start+'/1000s" ref="'+theAsset.id+'" duration="'+theAsset.duration+'/1000s" role="dialogue"/>';
    s +=				'</video>';
    s +=				'</clip>';
    return s;
}
function get_multiclipitem_xml(time,duration,cam) {
var s = '<mc-clip offset="'+time+'/1000s" ';
s +=				'ref="'+attrs.multicam_ref+'" ';
s +=				'name="'+attrs.multicam_name+'" ';
s +=				'duration="'+duration+'/1000s" ';
s +=				'start="'+time+'/1000s">';
s +=					'	<mc-source ';
s +=							'angleID="'+attrs.angles[cam]+'" ';
s +=								'srcEnable="video"/>';
s +=					'	<mc-source ';
s +=							'angleID="'+attrs.angles[masterangle]+'" ';
s +=								'srcEnable="audio"/>';
return s; 
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

function Event (s) {

	if ((s.match(/ /g)||[]).length < 2) { error("Not enough arguments:",s); s = "-1 nop nop"}
	s = s.split(" ");
	
	this.time = parseInt(s[0]);
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

