/* global process */
/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var request = require('request');
var botbuilder_azure = require("botbuilder-azure");
var builder_cognitiveservices = require("botbuilder-cognitiveservices");
var Cleverbot = require('cleverbot-node');
var cleverbot = new Cleverbot;
cleverbot.configure({botapi: "CC77q1BzPZSmvS40gcd3XveSqNA"});

var useEmulator = (process.env.NODE_ENV == 'development');

var entry2name = require("./name.js");
var whois = require("./whois");
var course = require("./course");
var mess = require('./mess');
var syllabus = require('./syllabus');
var review = require('./review');
var schedule = require('./schedule');

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector).set('storage', tableStorage);

var introMessage = ['Main functionalities are described below-\n\nProfile : Say \'hi\' or \'hello\' at any time to setup your profile.\n\nClass Schedule : Ask the bot "my schedule" to get your lecture schedule.\n\nConversation : Say "converse" or "chat" to enter converation mode. Say "end" to exit this mode.\n\nWho is :   Ask the bot \'who is Name/Roll no.\' to find students in the institute with that Name/EN.\n\nCourse info :  Type "details of coursecode course" to see some details about that course.\n\nSyllabus : Enter "my syllabus" to know about your syllabus.\n\nReview : Enter "review" to get reviews of courses.\n\nResult : Get info about your result.\n\nFaculty: Type "faculty members" to get info about faculties.'  
];

bot.on('conversationUpdate', function (activity) {
if (activity.membersAdded) {
    activity.membersAdded.forEach(function (identity) {
        if (identity.id === activity.address.bot.id) {
            var reply = new builder.Message()
                .address(activity.address)
                .text("Hi, Welcome to Campus bot!" + "\n\n" + introMessage[0]);
            bot.send(reply);
        }
    });
}});

// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer('https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/8dd9269d-e36e-47da-9fa5-0d6aaa4d1d7a?subscription-key=a39218a11a7d4d1dbb1e16b27e58a820&verbose=true&timezoneOffset=330');
var intents = new builder.IntentDialog({ recognizers: [recognizer] });
var recognizerqna = new builder_cognitiveservices.QnAMakerRecognizer({
            knowledgeBaseId: "1163618b-1d95-4a68-9975-84ab2be545c6",
            subscriptionKey: "9fe32d3701b740b5b693ea976fc36504"
});
var basicQnAMakerDialog = new builder_cognitiveservices.QnAMakerDialog({
                recognizers: [recognizerqna],
                defaultMessage: 'No match! Try changing the query terms!',
                qnaThreshold: 0.3
});

bot.dialog('/', intents);
intents.matches('profile', '/profile');
intents.matches('whois', '/whois');
intents.matches('qna', '/qna');
intents.matches('course', '/course');
intents.matches('mess', '/mess');
intents.matches('syllabus', '/syllabus');
intents.matches('review', '/review');
intents.matches('converse', '/converse');
intents.matches('schedule', '/schedule');
intents.matches('result', '/result');
intents.matches('faculty', '/prof');
intents.matches('None', '/none');

bot.dialog("/profile", [
	function (session) {
		builder.Prompts.text(session, "What is your roll no.?");
	},
	function (session, results, next) {
		if (results.response) {
			session.userData.en = results.response.toUpperCase();
			session.userData.name = entry2name(session.userData.en);
			if(session.userData.name === undefined) {
                session.send("Invalid Roll Number Given. Please try again");
                session.replaceDialog('/profile');
            } else {
               session.send("Hi " + session.userData.name + "!\nWelcome to Campus Bot");
            }
        }
        session.endDialog(); 
	}
]);

bot.dialog('/whois', [
    function (session,args,next) {
      var nameoren = [];
        nameoren = builder.EntityRecognizer.findAllEntities(args.entities, 'whoisent');
      if (!nameoren || nameoren.length === 0) {
         builder.Prompts.text(session, 'Give me a Name or roll number');
      } else {
        var name ="";
        for( var i =0; i<nameoren.length-1;i++)
        {
            name += nameoren[i].entity + " ";
        }
        name += nameoren[nameoren.length-1].entity;
        console.log(name);
        next({ response: name });
      }
    },
    function (session, results) {
        var result = whois.identify(results.response);
        console.log(result);
        if(result.length === 0)
        {
            session.send("No matches found. Please try again.");
        }
        else
        {
            var attach = [];
            for(var i=0;i<result.length;i++)
            {
                attach.push(
                    new builder.HeroCard(session)
                        .title(result[i].name)
                        .subtitle("Roll No - "+result[i].entry)
                        .text("Branch - "+result[i].branch)
                    );
            }
            var msg = new builder.Message(session)
                    .attachments(attach);
            session.send(msg);
        }
        session.endDialog();
    }
]);

bot.dialog('/course',[
    function(session,args,next)
    {
        var coursecode = builder.EntityRecognizer.findEntity(args.entities, 'coursecode');
        if (!coursecode) {
              builder.Prompts.text(session,"Give me the course code");
        } else {
            next({ response: coursecode.entity });
        }
    },
    function(session,results)
    {
        var c = course.get_course(results.response);
        if(c === undefined)
        {
            session.send("No such course code found!");
        }
        else
        {
            session.send(course.pretty_course(c));
        }
        session.endDialog();
    }
]);

var branches = {
    "CSE": "CSE",
    "ECE": "ECE",
    "ELECTRICAL": "ELECTRICAL",
    "CIVIL": "CIVIL",
    "MECHANICAL":"MECHANICAL",
    "ARCHITECTURE": "ARCHITECTURE",
    "CHEMICAL": "CHEMICAL",
    "PHYSICS": "PHYSICS",
    "MATHEMATICS": "MATHEMATICS",
    "MANAGEMENT & HUMANITIES": "MANAGEMENT & HUMANITIES",
    "CHEMISTRY": "CHEMISTRY"
};

bot.dialog('/syllabus', [
    function(session) {
        session.send("Type the no. of your branch from the following branches:");
        builder.Prompts.choice(session, "Branches:", branches);
    },
    function(session,results) {
        var no = results.response.entity;
            if(no === "CSE") {
                session.send("Syllabus can be found in the 'scheme & syllabus' section of the given link.");
                session.send("http://nith.ac.in/nith/?page_id=11979");
            }
            else if(no === "ECE") {
                 session.send("Syllabus can be found in the 'scheme & syllabus' section of the given link.");
                session.send("http://nith.ac.in/nith/?page_id=11981");
            }
            else if(no === "ELECTRICAL") {
                 session.send("Syllabus can be found in the 'scheme & syllabus' section of the given link.");
                session.send("http://nith.ac.in/nith/?page_id=11985");
            }
            else if(no === "CIVIL") {
                 session.send("Syllabus can be found in the 'scheme & syllabus' section of the given link.");
                session.send("http://nith.ac.in/nith/?page_id=11977");
            }
            else if(no === "MECHANICAL") {
                 session.send("Syllabus can be found in the 'scheme & syllabus' section of the given link.");
                session.send("http://nith.ac.in/nith/?page_id=11993");
            }
            else if(no === "ARCHITECTURE") {
                 session.send("Syllabus can be found in the 'scheme & syllabus' section of the given link.");
                session.send("http://nith.ac.in/nith/?page_id=11971");
            }
            else if(no === "CHEMICAL") {
                 session.send("Syllabus can be found in the 'scheme & syllabus' section of the given link.");
                session.send("http://nith.ac.in/nith/?page_id=11973");
            }
            else if(no === "PHYSICS") {
                 session.send("Syllabus can be found in the 'scheme & syllabus' section of the given link.");
                session.send("http://nith.ac.in/nith/?page_id=11995");
            }
             else if(no === "MATHEMATICS") {
                 session.send("Syllabus can be found in the 'scheme & syllabus' section of the given link.");
                session.send("http://nith.ac.in/nith/?page_id=11991");
            }
             else if(no === "CHEMISTRY") {
                 session.send("Syllabus can be found in the 'scheme & syllabus' section of the given link.");
                session.send("http://nith.ac.in/nith/?page_id=11975");
            }
             else if(no === "MANAGEMENT & HUMANITIES") {
                 session.send("Syllabus can be found in the 'scheme & syllabus' section of the given link.");
                session.send("http://nith.ac.in/nith/?page_id=11987");
            }
            else {
                session.send("Please type the correct number.");
                session.send("Enter 'my syllabus' to start again.");
            }
            session.endDialog();
    }
]);

bot.dialog('/none', [
    function(session){
        session.beginDialog('converse1');
    }  
]);

bot.dialog('/converse', [
    function(session,args,next)
    {
        if(args.in_conv !== "yes") {
            builder.Prompts.text(session, "Hi!, what would you like to talk about? (type \"end\" to exit)");
        } else {
            builder.Prompts.text(session,args.msg);
        }
    },
    function(session,results) {
        var check;
        if((typeof results.response !== 'undefined') && results.response){
            check = results.response.toUpperCase().trim();
        }
        if(check === "END" || check === "\"END\""){
            session.send("Thank you for chatting :)");
            session.endDialog();
        } else {
            cleverbot.write(results.response, function (response) {
         		session.endDialog();
                session.beginDialog('/converse',{in_conv: "yes",msg: response.message});
    		});
        }
    }
]);

bot.dialog('converse1', [
    function(session,args,next){
        builder.Prompts.text(session, "Let me review your query! (type \"end\" to exit)");
    },
    function(session,results) {
        var check;
        if((typeof results.response !== 'undefined') && results.response){
            check = results.response.toUpperCase().trim();
        }
        if(check === "END" || check === "\"END\""){
            session.send("Thank you for chatting :)");
            session.endDialog();
        } else {
            cleverbot.write(results.response, function (response) {
         		session.endDialog();
                session.beginDialog('/converse',{in_conv: "yes",msg: response.message});
    		});
        }
    }
]);

bot.dialog('/schedule', [
    function(session,args,next) {
        if (!session.userData.en) {
            builder.Prompts.text(session, "What's your roll number?");
        } else {
            next();
        }
    },
    function(session,results) {
        if(results.response) {
            session.userData.en = results.response;
        }
        var sch = schedule.check_roll(session.userData.en);
        if (sch === undefined) {
            session.send("Invalid roll number.");
            session.endDialog();
        } else {
            builder.Prompts.text(session, "For which day you want the schedule?(type 'week' to get schedule for whole week)");
        }
    },
    function(session,results) {
        var day = results.response;
        day = day.toUpperCase();
        if (day === "SATURDAY" || day === "SUNDAY") {
            session.send("No schedule for this day.");
            session.endDialog();
        } else if (day === "WEEK") {
            var sch = schedule.check_roll(session.userData.en);
            session.send(schedule.get_schedule_week(sch));
        } 
        else {
            var sch = schedule.check_roll(session.userData.en);
            session.send(schedule.get_schedule(sch,day));
        }
        session.endDialog();
    }
]);

bot.dialog('/prof',[
    function(session) {
        session.send("Type the no. of your branch from the following branches:");
        builder.Prompts.choice(session, "Branches:", branches);
    },
    function(session,results) {
        if(results.response) {
            var no = results.response.entity;
            if(no === "CSE") {
                session.send("List of faculty members can be found in the 'faculty' section of the given link.");
                session.send("http://nith.ac.in/nith/?page_id=11979");
            }
            else if(no === "ECE") {
                 session.send("List of faculty members can be found in the 'faculty' section of the given link.");
                session.send("http://nith.ac.in/nith/?page_id=11981");
            }
            else if(no === "ELECTRICAL") {
                 session.send("List of faculty members can be found in the 'faculty' section of the given link.");
                session.send("http://nith.ac.in/nith/?page_id=11985");
            }
            else if(no === "CIVIL") {
                 session.send("List of faculty members can be found in the 'faculty' section of the given link.");
                session.send("http://nith.ac.in/nith/?page_id=11977");
            }
            else if(no === "MECHANICAL") {
                 session.send("List of faculty members can be found in the 'faculty' section of the given link.");
                session.send("http://nith.ac.in/nith/?page_id=11993");
            }
            else if(no === "ARCHITECTURE") {
                 session.send("List of faculty members can be found in the 'faculty' section of the given link.");
                session.send("http://nith.ac.in/nith/?page_id=11971");
            }
            else if(no === "CHEMICAL") {
                 session.send("List of faculty members can be found in the 'faculty' section of the given link.");
                session.send("http://nith.ac.in/nith/?page_id=11973");
            }
            else if(no === "PHYSICS") {
                 session.send("List of faculty members can be found in the 'faculty' section of the given link.");
                session.send("http://nith.ac.in/nith/?page_id=11995");
            }
             else if(no === "MATHEMATICS") {
                 session.send("List of faculty members can be found in the 'faculty' section of the given link.");
                session.send("http://nith.ac.in/nith/?page_id=11991");
            }
             else if(no === "CHEMISTRY") {
                 session.send("List of faculty members can be found in the 'faculty' section of the given link.");
                session.send("http://nith.ac.in/nith/?page_id=11975");
            }
             else if(no === "MANAGEMENT & HUMANITIES") {
                 session.send("List of faculty members can be found in the 'faculty' section of the given link.");
                session.send("http://nith.ac.in/nith/?page_id=11987");
            }
            else {
                session.send("Please type the correct number.");
                session.send("Enter 'faculty members' to start again.");
            }
        }
        session.endDialog();
    }
]);

bot.dialog('/result', [
    function(session) {
         session.send("You can see the result at ");
         session.send("http://14.139.56.15/result.htm");
         session.endDialog();
    }
]);



bot.dialog('/review', [
    function(session,args) {
        builder.Prompts.text(session, "What's the course code of the course?");
    },
    function(session,results) {
        if (results.response) {
			session.dialogData.cod = results.response;
			if(review.get_course(results.response)===undefined){
				session.send("Invalid response. Say 'review' again to retry.")
                session.endDialog();
            } else {
                var res = review.get_reviews(results.response);
                if(res.length === 0) {
                    session.send("Sorry there are no reviews yet.");
                } else{
                    var attach = [];
    				session.send("Reviews for this course are - ");
    				for(var i=0;i<res.length;i++){
                        attach.push(
                            new builder.HeroCard(session)
                                .text(i+1 + ". " + res[i])
                        );
    				}
                    var msg = new builder.Message(session)
                        .attachments(attach);
                    session.send(msg);
    			}
                builder.Prompts.text(session, "Would you like to add a review for this course?");
            }
        } 
    },
    function(session,results) {
        if (results.response) {
			var rr = results.response;
			rr = rr.toUpperCase();
			if(rr=="YES"||rr=="YEAH"||rr=="Y"){
				builder.Prompts.text(session, "What is your review?");
			}
			else{
                session.send("Okay.");
				session.endDialog();
			}
        }
    },
    function (session, results) {
		if (results.response) {
            review.record_review(session.dialogData.cod,results.response);
            session.send("Thanks! Your review has been recorded.");
        }
        session.endDialog();
    }
]);

/*bot.dialog('/qna', [
    function (session) {
        builder.Prompts.text(session, 'Ask me anything!');
    },
    function (session, results) {
        var postBody = '{"question":"' + results.response + '"}';
            request({
                url: "https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/1163618b-1d95-4a68-9975-84ab2be545c6/generateAnswer",
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Ocp-Apim-Subscription-Key': "9fe32d3701b740b5b693ea976fc36504"
                },
                body: postBody
            },
            function (error, response, body) {
                var result;
                result = JSON.parse(body);
                result.score = result.score / 100;
                session.send(result.answers[0].answer);
                //session.replaceDialog('/qna', { reprompt: true });
            }
            );
       session.endDialog();
    }
]);

bot.dialog('/mess', [
    function(session,args,next){
        var hostel = builder.EntityRecognizer.findEntity(args.entities, 'hostelname');
        if(!hostel){
            builder.Prompts.text(session, "Which hostel?");
        } else {
            next( {response: hostel.entity});
        }
    },
    function(session,results){
        if (results.response) {
            session.userData.hostel = results.response;
        }
        var hostel = mess.get_mess_hostel(session.userData.hostel);
        var day = "monday";
        if(hostel!==null)
        {
            var menu_day = mess.get_mess_day(hostel,day);
            var pretty_menu = mess.pretty_mess(menu_day);
            session.send(pretty_menu[0]);
            session.send(pretty_menu[1]);
            session.send(pretty_menu[2]);
        }
        else
        {
            session.userData.hostel = undefined;
            session.send("Invalid Hostel provided!");
        }
        session.endDialog();
    }
]);

if (useEmulator) {
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpoint at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());
} else {
    module.exports = { default: connector.listen() };
}  */ 

