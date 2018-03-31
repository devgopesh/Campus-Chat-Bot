var fs = require('fs-extra');
var rev_db = "./database/reviews.json";
var rev = JSON.parse(fs.readFileSync(rev_db));

function get_course(code) {
	code = code.toUpperCase();
	if(code in rev){
		return rev[code];
	} else {
		return undefined;
	}
}

function record_review(code,gotreview) {
	var courseobj = get_course(code);
	courseobj.push(gotreview);
	fs.writeJson(rev_db, rev, function (err) {
  		console.log(err);
	});
}

function get_reviews(code){
	var courseobj = get_course(code);
	return courseobj;
}
module.exports = {
	get_course : get_course,
	record_review : record_review,
	get_reviews : get_reviews
};