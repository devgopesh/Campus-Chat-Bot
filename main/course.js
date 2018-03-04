var fs = require("fs-extra");
var course_db_file = "./database/courses.json";
var course_db = JSON.parse(fs.readFileSync(course_db_file));

function get_course(code)
{
	code = code.toUpperCase();
	if(code in course_db)
	{
		var temp = course_db[code];
		return temp;
	}
	else
	{
		return undefined;
	}
}

function pretty_course(course)
{
	if(course === undefined)
	{
		return "";
	}
	else
	{
		var pretty = course.name +" ["+course.code+"]\n\nCredit = "   + course.credit;
		return pretty;
	}
}

module.exports = {
	get_course: get_course,
	pretty_course: pretty_course
};