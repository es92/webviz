
//=============================================================

function SocketVizServer(config){
  makeEventable(this);
  
  this.vizDataInfo = {};

  if (config.socketConfig == null)
    this.socket = new TestSocket();
  else
    this.socket = mkSocket(config.socketConfig);
  this._watchForUpdates();

  this.listenersByName = {}
  this.listenerNamesById = {}

  this.vizDataByName = {}

  this.layoutHints = {}
}

//=============================================================

SocketVizServer.prototype.getVizDataInfo = function(){
  return this.vizDataInfo;
}

SocketVizServer.prototype.getLayoutHints = function(){
  return this.layoutHints;
}

SocketVizServer.prototype.registerVizDataDeltaListener = function(name, listener){
  var didSet = setDefault(this.listenersByName, name, {})
  var id = UUID()
  this.listenersByName[name][id] = listener;
  this.listenerNamesById[id] = name;
  if (didSet){
    this.socket.emit('subscribe', name);
  }
  return id;
}

SocketVizServer.prototype.unregisterVizDataDeltaListener = function(id){
  var name = this.listenerNamesById[id];
  delete this.listenersByName[name][id];
  delete this.listenerNamesById[id];

  if (size(this.listenersByName[name]) === 0){
    delete this.listenersByName[name]
    this.socket.emit('unsubscribe', name);
  }
}

SocketVizServer.prototype.getVizData = function(name){
  return this.vizDataByName[name];
}

//=============================================================

SocketVizServer.prototype._watchForUpdates = function(){
  this.socket.on('vizDataInfo', function(vizDataInfo){
    vizDataInfo.forEach(function(vdi){
      this.vizDataInfo[vdi.name] = vdi.type;
    }.bind(this));

    vizDataInfo.forEach(function(vdi){
      setDefault(this.vizDataByName, vdi.name, VizTypeDefaultValues[vdi.type])
    }.bind(this));
    this.emit('vizDataInfo', this.vizDataInfo)
  }.bind(this));

  this.socket.on('layoutHints', function(hints){
    this.layoutHints = hints
    this.emit('layoutHints', this.layoutHints);
  }.bind(this));

  this.socket.on('vizDataDelta', function(vizDataDelta){
    if (vizDataDelta.deltaType == VizDataDeltaTypes._Override){
      this.vizDataByName[vizDataDelta.name] = vizDataDelta.data;
    }
    else if (vizDataDelta.deltaType == VizDataDeltaTypes._Extend){
      function throwExtendNI(type){ throw new Error('VizDataDeltaType Extend Not Implemented for type ' + type) }
      if (vizDataDelta.type == VizTypes._2D){ 
        Array.prototype.push.apply(this.vizDataByName[vizDataDelta.name].x, vizDataDelta.data.x)
        Array.prototype.push.apply(this.vizDataByName[vizDataDelta.name].y, vizDataDelta.data.y)
      }
      else if (hasValue(VizTypes, vizDataDelta.type)){ throwExtendNI(vizDataDelta.type) }
      else { throw new Error('Unknown VizDataType: ' + vizDataDelta.type); }
    }
    else { throw new Error('Unknown VizDataDeltaType: ' + vizDataDelta.deltaType); }
    for (var id in this.listenersByName[vizDataDelta.name]){
      this.listenersByName[vizDataDelta.name][id](vizDataDelta.name, vizDataDelta);
    }
  }.bind(this));

  var disconnected = false;
  
  this.socket.on('connect', function(){
    if (disconnected)
      window.location.reload()
  }.bind(this));

  this.socket.on('disconnect', function(){
    disconnected = true;
  }.bind(this));
}

//=============================================================


//=============================================================

var VizDataDeltaTypes = {
  _Override: 'Override',
  _Extend: 'Extend',
}

var VizTypes = {
  _2D: '2D',
  _3D: '3D',
  _2DScatter: '2DScatter',
  _3DScatter: '3DScatter',
  _Graph: 'Graph',
  _Log: 'Log',
}

var VizTypeDefaultValues = {}
VizTypeDefaultValues[VizTypes._2D] = { 'x': [], 'y': [] };
VizTypeDefaultValues[VizTypes._3D] = { grid: { 'x': [], 'y': [] }, values: [] };
VizTypeDefaultValues[VizTypes._2DScatter] = { 'x': [], 'y': [] };
VizTypeDefaultValues[VizTypes._3DScatter] = { 'x': [], 'y': [], 'z': [] };
VizTypeDefaultValues[VizTypes._Graph] = { nodes: [] };
VizTypeDefaultValues[VizTypes._Log] = { lines: [] };

//=============================================================

function SocketVizServerConfig(socketConfig){
  this.socketConfig = socketConfig;
}

function SocketConfig(){

}

//=============================================================

function TestSocket(){
  makeEventable(this);
}

TestSocket.prototype.test = function(){
  this.emit('vizDataInfo', [
    { name: 'global cost', type: VizTypes._2D },
  ]);
  this.on('subscribe', function(name){
    this.emit('vizDataDelta', {
      name: 'global cost',
      deltaType: VizDataDeltaTypes._Override,
      type: VizTypes._2D,
      data: { 'x': [ 1, 2, 3 ], 'y': [ 2, 4, 6 ] }
    });
    setInterval(function(){
      this.emit('vizDataDelta', {
        name: 'global cost',
        deltaType: VizDataDeltaTypes._AddRemove,
        type: VizTypes._2D,
        data: { 'x': [ 4, 5, 6 ], 'y': [ 9, 12, 15 ] }
      });
    }.bind(this), 2000);
  }.bind(this));
}

//=============================================================

function mkSocket(config){
  var socket = io()
  return socket;
}

//=============================================================

window.SocketConfig = SocketConfig;

window.SocketVizServerConfig = SocketVizServerConfig;
window.SocketVizServer = SocketVizServer;
