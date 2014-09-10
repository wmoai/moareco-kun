var Client = require('node-rest-client').Client;

client = new Client();
var host = "http://localhost:3030";

var search = function(word, callback) {
  if (!word || word.trim == "") {
    callback(null);
    return;
  }
  var url = host + "/program/search/" + word;

  client.get(url, function(data, args, response){
    try {
      var programs = JSON.parse(data);
      callback(programs);
    } catch (e) {
      callback(null);
    }
  });
}
exports.search = search;

