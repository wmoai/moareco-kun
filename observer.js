var fs = require('fs');
var config = require('config');
var util = require('util')
  , twitter = require('twitter');
var twit = new twitter(config.Twitter);

var path = config.Log.path;
var size = fs.statSync(path).size;

// observer
fs.watch(path, function(event, filename) {
  if (size < fs.statSync(path).size) {
    var readableStream = fs.createReadStream('message.txt', {start:size}, {encoding: 'utf-8', bufferSize: 1});
    size = fs.statSync(path).size;
    readableStream.on('data', function(data) {
      detect(data.toString().trim());
    });
    readableStream.on('end', function() {

    });
  }
});

// twitter
var detect = function(line) {
  var message = line.match(/\[[^\[\]]+\] \[[^\[\]]+\] \S+ - (.+)/)[1];
  if (message) {
    twit.verifyCredentials(function(data) {
    }).updateStatus("エラーでた : "+message, function(data) {
    });
  }
}


