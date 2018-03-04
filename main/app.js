/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var request = require('request');
var botbuilder_azure = require("botbuilder-azure");
var builder_cognitiveservices = require("botbuilder-cognitiveservices");

var useEmulator = (process.env.NODE_ENV == 'development');

var entry2name = require("./entry2name.js");
var whois = require("./whois");
var course = require("./course");
var mess = require('./mess');
var syllabus = require('./syllabus');

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

/*var connector = useEmulator ? new builder.ChatConnector({
        appId: process.env.MicrosoftAppId,
        appPassword: process.env.MicrosoftAppPassword
    }):
    new botbuilder_azure.BotServiceConnector({
        appId: process.env.MicrosoftAppId,
        appPassword: process.env.MicrosoftAppPassword,
        stateEndpoint: process.env.BotStateEndpoint,
        openIdMetadata: process.env.BotOpenIdMetadata
});*/

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector);
bot.set('storage', tableStorage);

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
//bot.dialog('/', basicQnaMakerDialog);
bot.dialog('/', intents);
intents.matches('profile', '/profile');
intents.matches('whois', '/whois');
intents.matches('qna', '/qna');
intents.matches('course', '/course');
intents.matches('mess', '/mess');
intents.matches('syllabus', '/syllabus');

bot.dialog("/profile", [
	function (session, args, next) {
		builder.Prompts.text(session, "What is your entryno.?");
	},
	function (session, results, next) {
		if (results.response) {
			session.userData.en = results.response.toUpperCase();
			session.userData.name = entry2name(session.userData.en);
			if(session.userData.name === undefined) {
                session.send("Invalid Entry Number Given. Please try again");
                session.replaceDialog('/profile');
            } else {
               session.send("hi " + session.userData.name + " welcome to campus bot");
            }
        } else {
            session.endDialog();
		}
	}
]);

bot.dialog('/whois', [
    function (session,args,next) {
      var nameoren = [];
      try{
        nameoren = builder.EntityRecognizer.findAllEntities(args.entities, 'whoisent');
      }
      catch(e)
      {
        nameoren = [];
      }
      if (!nameoren || nameoren.length === 0) {
         builder.Prompts.text(session, 'Give me a Name or an Entry number');
      } else {
        var name ="";
        for( var i =0; i<nameoren.length-1;i++)
        {
            name += nameoren[i].entity + " ";
        }
        name += nameoren[nameoren.length-1].entity;
        next({ response: name });
      }
    },
    function (session, results) {
        var result = whois.identify(results.response);
        if(result.length === 0)
        {
            session.send("No matches found. Please try again.");
        }
        else
        {
            var attach = [];
            result = whois.priority(result,session.userData.en);
            if(result.length > 4)
            {
                session.send("Your query was too general. Here are top 4 results personalized for you :");
            }
            for(var i=0;i<result.length && i < 4;i++)
            {
                attach.push(
                    new builder.HeroCard(session)
                        .title(result[i].name)
                        .text("Roll No - "+result[i].entry)
                    );
                // session.send(whois.story(result[i]));
            }
            var msg = new builder.Message(session)
                    .attachments(attach);
            session.send(msg);
        }
        session.endDialog();
    }
]);

bot.dialog('/qna', [
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

bot.dialog('/syllabus', [
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
        builder.Prompts.text(session, "Which semester?");
    },
    function(session,results) {
        var sem = results.response;
        var c = syllabus.roll(session.userData.en);
        var syl = syllabus.get_syllabus(c);
        if(sem === "all") {
             session.send(syllabus.pretty_get_full_syllabus(syl));
        } else {
            session.send(syllabus.pretty_get_syllabus(syl,sem));
        }
        session.endDialog();
    }
]);

/*if (useEmulator) {
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpoint at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());
} else {
    module.exports = { default: connector.listen() };
}  */ 

