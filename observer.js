var fs = require('fs');
var config = require('config');
var util = require('util')
  , twitter = require('twitter');
var twit = new twitter(config.Twitter.keys);

var path = config.Log.path;
var size = fs.statSync(path).size;

// observer
var observeLog = function() {
  console.log('Connect.');
  var observer = fs.watch(path, function(event, filename) {
    switch (event) {
    case 'change':
      if (size < fs.statSync(path).size) {
        var readableStream = fs.createReadStream(path, {start:size}, {encoding: 'utf-8', bufferSize: 1});
        size = fs.statSync(path).size;
        readableStream.on('data', function(data) {
          detect(data.toString().trim());
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

// twitter
var detect = function(line) {
  var match = line.match(/\[[^\[\]]+\] \[([^\[\]]+)\] \S+ - (.+)/);
  if (match[1] == 'ERROR') {
    var message = match[2];
    twit.verifyCredentials(function(data) {
    }).updateStatus("@"+config.Twitter.reporter+" エラーでた : "+message, function(data) {
    });
  }
}


