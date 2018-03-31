var fs = require("fs-extra");
var schedule = "./database/schedule.json";
var schedule_db = JSON.parse(fs.readFileSync(schedule));

function check_roll(roll){
	var str;
	roll = roll.toUpperCase();
	if (roll.length === 5) {
		str = roll[0] + roll[1] + roll[2];
	} else {
		str = roll[0] + roll[1] + roll[2] + roll[3] + roll[4];
	}
	if (str in schedule_db) {
		return schedule_db[str];
	} 
	else {
		return undefined;
	}
}

function get_schedule(sch,day) {
	var str = "";
	for(var i=0; i<sch[day].length; i++) {
		str+=sch[day][i] + "\n";
	}
	return str;
}

function get_schedule_week(sch) {
	var day = ["MONDAY","TUESDAY","WEDNESDAY","THRUSDAY","FRIDAY"];
	var str = "";
	for(var i=0; i<day.length; i++) {
		str+=day[i] + "\n";
		for(var j=0; j<sch[day[i]].length; j++) {
			str+=sch[day[i]][j] + "\n";
		}
		str+="\n\n";
	}
	return str;
}

module.exports = {
	check_roll: check_roll,
	get_schedule: get_schedule,
	get_schedule_week: get_schedule_week
};