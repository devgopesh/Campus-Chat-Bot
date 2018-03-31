var fs = require("fs-extra");

var name_db = "./database/name_database.json";
var name_database = JSON.parse(fs.readFileSync(name_db));

function get_name(name)
{
	name = name.toUpperCase().trim();
	if(name in name_database)
	{	
		console.log(name_database.name);
		return name_database[name];
	}
	return undefined;
}

module.exports = get_name;