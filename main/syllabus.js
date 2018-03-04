var fs = require('fs-extra');

var syllabus = "./database/syllabus.json";
var syllabus_db = JSON.parse(fs.readFileSync(syllabus));

function get_roll(en) {
	en = en.toUpperCase();
	if(en.length === 5) {
		return "en[2]";
	} else {
		var a = en[2] + en[3] + en[4];
		return a;
	}
}

function get_syllabus(roll) {
	if(roll in syllabus_db) {
		return syllabus_db[roll];
	}
}

function pretty_get_syllabus(syl,sem) {
	if(syl[sem] === undefined) {
		var str = "no course";
		return str;
	} 
	var str = "";
	for(var i=0; i<syl[sem].length; i++) {
		var name = syl[sem][i].course_name;
		var code = syl[sem][i].course_code;
		var credit = syl[sem][i].course_credit;
		str+="Course Name: " + name + "\n" + "Course Code: " + code + "\n" + "Course Credit: " + credit + "\n\n";
	}
	return str;
}

function pretty_get_full_syllabus(syl) {
	var str = "";
	for(var j=1; j<=10; j++) {
		if(syl[j]!== undefined) {
			str+="Sem " + j + "\n";
			for(var i=0; i<syl[j].length; i++) {
				var name = syl[j][i].course_name;
				var code = syl[j][i].course_code;
				var credit = syl[j][i].course_credit;
				str+="Course Name: " + name + "\n" + "Course Code: " + code + "\n" + "Course Credit: " + credit + "\n\n";
			}
		}
	}
	return str;
}

module.exports = {
		roll: get_roll,
		get_syllabus: get_syllabus,
		pretty_get_syllabus: pretty_get_syllabus,
		pretty_get_full_syllabus: pretty_get_full_syllabus
};