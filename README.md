# Campus-Chat-Bot
Campus chat bot is basically an info bot which provides information about college activities and students.

1. Profile : The first time user says a Hi, the bot replies back by asking the user, his/her entry number which will be used for all future correspondences and chats.
2. FAQ : The user can ask faqs related to any institute policy. The FAQ mode can be started by sending faq as a message.
3. Who is this? : This allows the user to ask the details about any student in the NITH campus by just sending a message "who is (name/entry number)" . The bot replies by telling the name and entry number person. This has personalized results based on the year and the dept of the user.
4. Mess Menu : The user can ask for the menu of his/her hostel's mess for a particular day or for the current day depending on what the user asks. This can be achieved by the message "mess of <hostelname> hostel".
5. Course : This provide the details of a particular course by sending message "details of <coursecode> course".
6. Syllabus : This provides the syllabus to the user of a particular sem or for all sem by sending a message "my syllabus".
7. Review : By using this functionality a user can see the review of a particular subject as well as can add a review by sending the message "review".
8. Schedule : This provides the user to see schedule for a particular day or for whole week by sending "my schedule" as message to bot.
  
#Technlogy and APIs used

1.The bot is built on the Microsoft Bot Builder Framework in Node.js and uses various APIs.

2.It uses the Language Understanding Intelligent Service (LUIS) that lets the bot to understand language.
3.It uses CleverBot API to converse with the user in the conversation mode.
4.It uses the QnA Maker that enabled us to build, train and publish a simple question and answer bot based on FAQ URLs.
