
//=============================================================

function SocketVizServerConfig(){
  this.port = 10012;
}

//=============================================================

function SocketVizServer(config){
  makeEventable(this);
  
  this.vizDataInfo = [];

  this.socket = new TestSocket();
  this._watchForUpdates();

  this.listenersByName = {}
  this.listenerNamesById = {}

  this.vizDataByName = {}
}

//=============================================================

SocketVizServer.prototype.getVizDataInfo = function(){
  return this.vizDataInfo;
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
    this.vizDataInfo = vizDataInfo;
    this.vizDataInfo.forEach(function(vdi){
      setDefault(this.vizDataByName, vdi.name, VizTypeDefaultValues[vdi.type])
    }.bind(this));
    this.emit('vizDataInfo', this.vizDataInfo)
  }.bind(this));
  this.socket.on('vizDataDelta', function(vizDataDelta){
    if (vizDataDelta.deltaType == VizDataDeltaTypes._Override){
      this.vizDataByName[vizDataDelta.name] = vizDataDelta.data;
    }
    else if (vizDataDelta.deltaType == VizDataDeltaTypes._AddRemove){
      function throwAddRemoveNI(type){ throw new Error('VizDataDeltaType AddRemove Not Implemented for type ' + type) }
      if (vizDataDelta.type == VizTypes._2D){ 
        Array.prototype.push.apply(this.vizDataByName[vizDataDelta.name].x, vizDataDelta.add.x)
        Array.prototype.push.apply(this.vizDataByName[vizDataDelta.name].y, vizDataDelta.add.y)
        for (var i = vizDataDelta.remove.length-1; i >= 0; i--){
          var idx = vizDataDelta.remove[i];
          this.vizDataByName[vizDataDelta.name].x.splice(idx,1);
          this.vizDataByName[vizDataDelta.name].y.splice(idx,1);
        }
      }
      else if (hasValue(VizTypes, vizDataDelta.type)){ throwAddRemoveNI(vizDataDelta.type) }
      else { throw new Error('Unknown VizDataType: ' + vizDataDelta.type); }
    }
    else { throw new Error('Unknown VizDataDeltaType: ' + vizDataDelta.deltaType); }
    for (var id in this.listenersByName[vizDataDelta.name]){
      this.listenersByName[vizDataDelta.name][id](vizDataDelta.name, vizDataDelta);
    }
  }.bind(this));
}

//=============================================================

SocketVizServer.prototype.test = function(){
  this.socket.emit('vizDataInfo', [
    { name: 'global cost', type: VizTypes._2D },
  ]);
  this.socket.on('subscribe', function(name){
    this.socket.emit('vizDataDelta', {
      name: 'global cost',
      deltaType: VizDataDeltaTypes._Override,
      type: VizTypes._2D,
      data: { 'x': [ 1, 2, 3 ], 'y': [ 2, 4, 6 ] }
    });
    setInterval(function(){
      this.socket.emit('vizDataDelta', {
        name: 'global cost',
        deltaType: VizDataDeltaTypes._AddRemove,
        type: VizTypes._2D,
        add: { 'x': [ 4, 5, 6 ], 'y': [ 9, 12, 15 ] },
        remove: [],
      });
    }.bind(this), 2000);
  }.bind(this));
}

//=============================================================

var VizDataDeltaTypes = {
  _Override: 'Override',
  _AddRemove: 'AddRemove',
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

function TestSocket(){
  makeEventable(this);
}

window.SocketVizServerConfig = SocketVizServerConfig;
window.SocketVizServer = SocketVizServer;
