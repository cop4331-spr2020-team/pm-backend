

// https://github.com/NodeRedis/node-redis (for promisification.)
// const promisify = require('util').promisify;
// const getAsync = promisify(client.get).bind(client);

client.on('connect', function(data) {
  console.log(data);
});
client.on('error', function(error) {
  console.log(error);
});
