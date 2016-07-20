

var port = process.argv[2];
var processFreq = parseFloat(process.argv[3])*1000

var express = require('express');
var app = express();
var server = require('http').createServer(app);  
var io = require('socket.io')(server);

// ================================================

var readline = require('readline');
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', function(line){
    msg = JSON.parse(line)
    parseMessage(msg);
    //console.log(msg);
})

// ================================================

var layoutHints = {};
var nameToType = {};
var nameToData = {};
var dataToAdd = [];

function parseMessage(msg){
  var evt = msg[0];
  var msg = msg[1];
  if (evt === 'addDataInfo'){
    var name = msg[0];
    var type = msg[1];
    nameToType[name] = type;
    sendDataInfo();
  }
  else if (evt === 'layoutHint'){
    var name = msg[0];
    var hint = msg[1];
    layoutHints[name] = hint
    sendLayoutHints();
  }
  else if (evt === 'addData'){
    dataToAdd.push(msg);
  }
  else {
    throw new Error('unknown evt type ' + evt);
  }
}

// ================================================

var idToSockets = {}
var idToSubscriptions = {}
var subscriptionToIds = {}

function sendDataInfo(id){
  var msg = []
  for (name in nameToType)
    msg.push({ name: name, type: nameToType[name] });
  send('vizDataInfo', msg, id);
}

function sendLayoutHints(id){
  send('layoutHints', layoutHints, id);
}

function processDataToAdd(){
  if (dataToAdd.length === 0){
    return;
  }
  var nameToDeltas = {}
  dataToAdd.forEach(function(data){
    var name = data[0];
    var type = nameToType[name];
    var deltaType = data[1];
    var data = data[2];
    if (type === '2D'){
      if (deltaType === 'extend'){
        if (!(name in nameToDeltas))
          nameToDeltas[name] = { deltaType: 'extend', data: { x: [], y: [] } };
        Array.prototype.push.apply(nameToDeltas[name].data.x, data.x);
        Array.prototype.push.apply(nameToDeltas[name].data.y, data.y);
      }
      else if (deltaType === 'replace'){
        nameToDeltas[name] = { deltaType: 'replace', data: data };
      }
      else {
        throw new Error('unknown delta type ' + deltaType);
      }
    }
    else {
      throw new Error('unknown type ' + type);
    }
  });
  for (var name in nameToDeltas){
    var type = nameToType[name];
    var deltaType = nameToDeltas[name].deltaType;
    var data = nameToDeltas[name].data;
    if (type == '2D'){
      if (deltaType === 'extend'){
        if (!(name in nameToData))
          nameToData[name] = { x: [], y: [] };
        Array.prototype.push.apply(nameToData[name].x, data.x)
        Array.prototype.push.apply(nameToData[name].y, data.y)

        doForAllSubscribers(name, function(id){ sendUpdate(name, 'Extend', data, id); });
      }
      else if (deltaType === 'replace'){
        nameToData[name] = data;
        doForAllSubscribers(name, function(id){ sendAllData(id, name) });
      }
      else {
        throw new Error('unknown delta type ' + deltaType);
      }
    }
    else {
      throw new Error('unknown type ' + type);
    }
  }
  dataToAdd = [];
}

function sendUpdate(name, deltaType, data, id){
  send('vizDataDelta', makeUpdate(name, deltaType, data), id);
}

function makeUpdate(name, deltaType, data){
  return { 
    name: name,
    deltaType: deltaType,
    type: nameToType[name],
    data: data
  }
}

function doForAllSubscribers(name, fn){
  for (id in subscriptionToIds[name]){
    fn(id)
  }
}

function sendAllData(id, name){
  if (name in nameToData){
    sendUpdate(name, 'Override', nameToData[name], id);
  }
}

setInterval(processDataToAdd, processFreq);

// ================================================

io.on('connection', function(socket){
  idToSockets[socket.id] = socket;

  sendDataInfo(socket.id)
  sendLayoutHints(socket.id)

  socket.on('subscribe', function(data){
    var name = data;
    if (!(socket.id in idToSubscriptions))
      idToSubscriptions[socket.id] = {}
    idToSubscriptions[socket.id][name] = true;
    if (!(socket.id in subscriptionToIds))
      subscriptionToIds[name] = {}
    subscriptionToIds[name][socket.id] = true;
    sendAllData(socket.id, name);
  });

  socket.on('unsubscribe', function(data){
    var name = data;
    delete idToSubscriptions[socket.id][name]
    delete subscriptionToIds[name][socket.id];
  });

  socket.on('disconnect', function(){
    delete idToSockets[socket.id]
  });
});

function send(evt, msg, id){
  if (id != null)
    idToSockets[id].emit(evt, msg);
  else
    io.sockets.emit(evt, msg);
}

var port = process.argv[2] || 8080;
var dir = __dirname + '/client';
app.use(express.static(dir));
server.listen(port, '127.0.0.1');

//console.log('@' + port + ': ' + dir);
