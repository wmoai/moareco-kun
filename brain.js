var config = require('config');

var util = require('util')
  , twitter = require('twitter');
var twit = new twitter(config.Twitter.keys);

var Client = require('node-rest-client').Client;
  , client = new Client();
var host = "http://localhost:3030";


var unkownMessages = [
  'は？',
  'えっ',
  'ん？',
  'ええこときいたで！',
  'すまんな',
  'いかんのか？',
  'それは報告しなくていいです',
  '誰？',
  'あっ、ふーん',
  'そう・・・'
];
var unkownMessageIndex = Math.floor(Math.random()*unkownMessages.length);



var Talk = function(message, replyName, replyId) {
  if (replyName) {
    this.message = "@"+replyName+" "+message;
  } else {
    this.message = message;
  }
  if (replyId) {
    this.param = {
      "in_reply_to_status_id": replyId
    }
  }
}
Talk.prototype.post = function() {
  twit.verifyCredentials(function(data) {
  }).updateStatus(this.message, this.param, function(data) {
    console.log(data);
  });
}


var talkQue = {
  que : new Array,
  timer : null,
  push : function(talk) {
    this.que.push(talk);
    this.post();
  },
  post : function() {
    var self = this;
    if (self.timer == null && self.que.length > 0) {
      self.timer = setTimeout(function() {
        if (self.que.length > 0) {
          self.timer = null;
          self.post();
        } else {
          self.timer = null;
        }
      }, 60000);

      var talk = self.que.shift();
      talk.post();
    }
  }
}


var report = function(message) {
  var talk = new Talk(message, config.Twitter.reporter);
  talkQue.push(talk);
}


var reply = function(message, status) {
  var replyName = replayId = null;
  if (status) {
    replyName = status.user.screen_name;
    replayId = status.id_str;
  }
  var talk = new Talk(message, replyName, replyId);
  talkQue.push(talk);
}

var sayHum = function(status) {
  if (unkownMessageIndex >= unkownMessages.length - 1) {
    unkownMessageIndex = 0;
  }
  reply(unkownMessages[unkownMessageIndex++], status);
}
exports.dontUnderstood = sayHum;


var readLog = function(line) {
  var match = line.match(/\[[^\[\]]+\] \[([^\[\]]+)\] \S+ - (.+)/);
  if (match[1] == 'ERROR') {
    var message = match[2];
    report("エラーでた : "+message);
  }
}
exports.readLog = readLog;


var searchProgram = function(word, status) {
  if (!word || word.trim == "") {
    sayHum(status);
    return;
  }
  var url = host + "/program/search/" + word;

  client.get(url, function(data, args, response){
    var programs = null;
    try {
      programs = JSON.parse(data);
      if (programs.length == 0) {
        sayHum(status);
      } else {
        var titles = "\n";
        programs.forEach(function(program) {
          titles += "・"+program.title+"\n";
        });
        reply(titles + "ミツケタ", status);
      }
    } catch (e) {
      sayHum(status);
    }
  });
}
exports.searchProgram = searchProgram;

var readTwit = function(status) {
  if (!status.text) {
    return;
  }
  var names = [
    "moareco",
    "もあれこ"
  ];
  var repReg = new RegExp("^[@＠](?:"+names.join("|")+")");
  if (!status.text.match(repReg)) {
    return
  }
  var message = status.text.replace(repReg, '').trim();

  generateReplyText(message, function(text) {
    postTwit(text, status.user.screen_name, status.id_str);
  });
}

