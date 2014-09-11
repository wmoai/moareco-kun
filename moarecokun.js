var fs = require('fs');
var config = require('config');
var util = require('util')
  , twitter = require('twitter');
var twit = new twitter(config.Twitter.keys);

var Client = require('node-rest-client').Client
  , client = new Client();
var apiHost = "http://localhost:3030";

var path = config.Log.path;
var size = fs.statSync(path).size;



var startObserve = function() {
  var observeLog = function() {
    console.log('Start : observe file.');
    var observer = fs.watch(path, function(event, filename) {
      switch (event) {
      case 'change':
        if (size < fs.statSync(path).size) {
          var readableStream = fs.createReadStream(path, {start:size}, {encoding: 'utf-8', bufferSize: 1});
          size = fs.statSync(path).size;
          readableStream.on('data', function(data) {
            detectLogFile(data.toString().trim());
          });
          readableStream.on('end', function() {

          });
        }
        break;
      case 'rename':
        observer.close();
        console.log('File was renamed, reconnect in 3sec.');
        setTimeout(function() {
          observeLog();
        }, 3000);
        break;
      }
    });
  }();

  console.log('Start : twitter.');
  twit.stream('user', function(stream) {
    stream.on('data', function(data) {
      detectTwit(data);
    });
  });
}();


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
  var replyName = replyId = null;
  if (status) {
    replyName = status.user.screen_name;
    replyId = status.id_str;
  }
  var talk = new Talk(message, replyName, replyId);
  talkQue.push(talk);
}
var getHum = function() {
  if (unkownMessageIndex >= unkownMessages.length - 1) {
    unkownMessageIndex = 0;
  }
  return unkownMessages[unkownMessageIndex++];
}

var detectLogFile = function(line) {
  var match = line.match(/\[[^\[\]]+\] \[([^\[\]]+)\] \S+ - (.+)/);
  if (match[1] == 'ERROR') {
    var message = match[2];
    report("エラーでた : "+message);
  }
}

var detectTwit = function(data) {
  if (!data.text) {
    return;
  }
  console.log(data.text);
  var names = [
    "moareco",
    "もあれこ"
  ];
  var repReg = new RegExp("^[@＠](?:"+names.join("|")+")");
  if (!data.text.match(repReg)) {
    return
  }
  var message = data.text.replace(repReg, '').trim();

  createMessage(message, function(text) {
    reply(text, data);
  });
}
var createMessage = function(message, callback) {
  var reg = new RegExp("^\\s*([^\\s]+)(?:\\s+(.+))?");
  var match = message.match(reg);
  if (match) {
    var operation = match[1];
    var param = match[2];

    if (operation == "検索") {
      // search
      searchProgram(param, callback);
    } else {
      // unknown operation
      callback(getHum());
    }
  }
}

var searchProgram = function(word, callback) {
  if (!word || word.trim() == "") {
    callback("何を？");
    return;
  }
  var url = apiHost + "/program/search/" + word;

  client.get(url, function(data, args, response){
    try {
      var programs = JSON.parse(data);
      if (!programs || programs.length == 0) {
        callback(word+" ナイ");
        return;
      }
      var titles = "\n";
      programs.forEach(function(program) {
        titles += "・"+program.title+"\n";
      });
      callback(titles + "ミツケタ");
    } catch (e) {
      callback("もあれこ is dead : " + e.message);
    }
  });
}

