var Client = require('node-rest-client').Client;

client = new Client();
var host = "http://localhost:3030";

exports.search = function(word, callback) {
  var url = host + "/program/search/" + word;
  client.get(url, args, function(data, response){
    callback(data);
  });
}

