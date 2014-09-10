var fs = require('fs');
var config = require('config');
var util = require('util')
  , twitter = require('twitter');
var twit = new twitter(config.Twitter.keys);

var client = require('./client');

var path = config.Log.path;
var size = fs.statSync(path).size;

// observe log
var observeLog = function() {
  console.log('Connect.');
  var observer = fs.watch(path, function(event, filename) {
    switch (event) {
    case 'change':
      if (size < fs.statSync(path).size) {
        var readableStream = fs.createReadStream(path, {start:size}, {encoding: 'utf-8', bufferSize: 1});
        size = fs.statSync(path).size;
        readableStream.on('data', function(data) {
          detectLog(data.toString().trim());
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
}
observeLog();

// detect log
var detectLog = function(line) {
  var match = line.match(/\[[^\[\]]+\] \[([^\[\]]+)\] \S+ - (.+)/);
  if (match[1] == 'ERROR') {
    var message = match[2];
    postTwit("エラーでた : "+message, config.Twitter.reporter);
  }
}

var TwitStatus = function(message, replyName, replyId) {
  this.message = "@"+replyName+" "+message;
  if (replyId) {
    this.param = {
      "in_reply_to_status_id": replyId
    }
  }
}
TwitStatus.prototype.post = function() {
  twit.verifyCredentials(function(data) {
  }).updateStatus(this.message, this.param, function(data) {
  });
}

var twitQue = new Array;
// post twit 
var postTwit = function(message, replyName, replyId) {
  var twitStatus = new TwitStatus(message, replyName, replyId);
  twitQue.push(twitStatus);
  twitWithQue();
}
var twitTimer = null;
var twitWithQue = function() {
  if (twitTimer == null && twitQue.length > 0) {
    twitTimer = setTimeout(function() {
      if (twitQue.length > 0) {
        twitTimer = null;
        twitWithQue();
      } else {
        twitTimer = null;
      }
    }, 60000);

    var twitStatus = twitQue.shift();
    twitStatus.post();
  }
}

// observe twitter
twit.stream('user', function(stream) {
  stream.on('data', function(data) {
    detectTwit(data);
  });
});

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

var detectTwit = function(data) {
  if (!data.text) {
    return;
  }
  var names = [
    "moareco",
    "もあれこ"
  ];
  var repReg = new RegExp("^[@＠](?:"+names.join("|")+")");
  if (!data.text.match(repReg)) {
    return
  }
  var message = data.text.replace(repReg, '').trim();

  generateReplyText(message, function(text) {
    postTwit(text, data.user.screen_name, data.id_str);
  });
}

var generateReplyText = function(message, callback) {
  var reg = new RegExp("^\\s*([^\\s]+)(?:\\s+(.+))?");
  var match = message.match(reg);
  if (match) {
    var operation = match[1];
    var param = match[2];

    if (operation == "検索") {
      // search
      if (!param || param.trim() == "") {
        callback("何を？");
        return;
      }
      client.search(param, function(programs) {
        if (!programs || programs.length == 0) {
          callback(param+" ナイ");
          return;
        }
        var titles = "";
        programs.forEach(function(program) {
          titles += "「"+program.title+"」\n";
        });
        callback(titles + "ミツケタ");
      });
    } else {
      // unknown operation
      if (unkownMessageIndex >= unkownMessages.length - 1) {
        unkownMessageIndex = 0;
      }
      callback(unkownMessages[unkownMessageIndex++]);
    }
  }
}



