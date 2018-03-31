var fs = require("fs-extra");

var name = "./database/name.json";
var database_file = fs.readFileSync(name);
var database = JSON.parse(database_file);

function synthesize(entry,name,branch)
{
	return {
		"name":name,
		"entry": entry,
		"branch": branch
	};
}

function get_data(name) {
	var result = [];
	name = name.toUpperCase();
	for (var key in database)
	{	
		if(key === name){
			result.push(synthesize(database[key].roll_no,database[key].full_name,database[key].branch));
			return result;
		}
		if(database[key].name === name)
		{
			result.push(synthesize(database[key].roll_no,database[key].full_name,database[key].branch));
		}
	}
	return result;
}

module.exports = {
	identify: get_data
};