
var Header = React.createClass({
  render: function(){
    return <div className="header" /> 
  }
});


function mkNewWindow(rowIdx, colIdx, dims){
  var vws = new WindowState();
  vws.id = 'r' + rowIdx + ',c' + colIdx;
  vws.type = 'new'
  setWindowDims(vws, rowIdx, colIdx, dims)
  return vws;
}

function setWindowDims(vws, rowIdx, colIdx, dims){
  vws.rowIdx = rowIdx
  vws.colIdx = colIdx
  vws.x = colIdx*dims.width;
  vws.y = rowIdx*dims.height;
  vws.w = dims.width;
  vws.h = dims.height;
}

//=============================================================

var WebVizApp = React.createClass({
  componentDidMount: function(){
    this.props.vizServer.on('vizDataInfo', this.updateVizDataInfo);
    this.updateVizDataInfo(this.props.vizServer.getVizDataInfo())
    this.createWindow(0, 0);
  },
  updateVizDataInfo: function(vizDataInfo){
    vizDataInfo.forEach(function(vdi){
      this.props.vizServer.registerVizDataDeltaListener(vdi.name, function(name, vdd){
        console.log(name, vdd)
        console.log(this.props.vizServer.getVizData(name))
      }.bind(this));
    }.bind(this));
    this.setState({ vizDataInfo: vizDataInfo });
  },
  createWindow: function(rowIdx, colIdx){
    var windowState = new WindowState();
    windowState.vizWindowState = new VizWindowState();
    setWindowDims(windowState, rowIdx, colIdx, this.state.dims)
    var windowGrid = this.state.windowGrid;
    if (!(rowIdx in windowGrid)){
      while (windowGrid.length <= rowIdx){
        windowGrid.push({ id: UUID(), windows: [] });
      }
    }
    if (!(colIdx in windowGrid[rowIdx].windows)){
      while (windowGrid[rowIdx].windows.length <= colIdx){
        windowGrid[rowIdx].windows.push(null);
      }
    }
    windowGrid[rowIdx].windows[colIdx] = windowState;
    this.setState({ windowGrid: windowGrid })
  },
  removeWindow: function(rowIdx, colIdx){
    var windowGrid = this.state.windowGrid;
    windowGrid[rowIdx].windows[colIdx] = null;
    this.setState({ windowGrid: windowGrid })
  },
  updateVizData: function(name, data){
    this.state.vizDataByName[name] = this.props.vizServer.getVizData(name);
    this.setState({ vizDataByName: this.state.vizDataByName })
  },
  toggleSelectData: function(rowIdx, colIdx, name){
    var vws = this.state.windowGrid[rowIdx].windows[colIdx].vizWindowState;
    if (vws.selectedVizDataInfo[name]){
      this.state.vizDataListenersCounter[name] -= 1;
      if (this.state.vizDataListenersCounter[name] === 0){
        delete this.state.vizDataListenersCounter[name];
        this.props.vizServer.unregisterVizDataDeltaListener(this.state.vizDataListenerIds[name]);
      }
      delete vws.selectedVizDataInfo[name];
    }
    else {
      var didSet = setDefault(this.state.vizDataListenersCounter, name, 0)
      this.state.vizDataListenersCounter[name] += 1;
      if (didSet){
        var id = this.props.vizServer.registerVizDataDeltaListener(name, this.updateVizData)
        this.state.vizDataListenerIds[name] = id;
        this.updateVizData(name);
      }
      vws.selectedVizDataInfo[name] = true;
    }
    this.setState({ windowGrid: this.state.windowGrid, vizDataListenerIds: this.state.vizDataListenerIds, vizDataListenersCounter: this.state.vizDataListenersCounter });
  },
  getInitialState: function() {
    return { vizDataInfo: [], 
             vizDataByName: {},
             vizDataListenersCounter: {},
             vizDataListenerIds: {},
             windowGrid: [ { id: UUID(), windows: [] } ], 
             dims: { width: 360, height: 240 },  };
  },
  render: function(){
    var rows = this.state.windowGrid.length;
    var columns = this.state.windowGrid.map(function(r){ return r.windows.length; })
                                       .reduce(function(a,b){ return Math.max(a,b); });
    var windowNodes = this.state.windowGrid.map(function(windowRow, rowIdx){
      var windowRowNodes = windowRow.windows.map(function(vizWindowState, colIdx){
        if (vizWindowState == null){
          var vws = mkNewWindow(rowIdx, colIdx, this.state.dims);
          return <Window key={vws.id} ws={vws} handleMakeNewWindow={this.createWindow}/>
        }
        return <Window key={vizWindowState.id} ws={vizWindowState} 
                                               vizDataInfo={this.state.vizDataInfo} 
                                               vizDataByName={this.state.vizDataByName}
                                               handleToggleSelectData={this.toggleSelectData}
                                               handleRemove={this.removeWindow}/>
      }.bind(this));
      while (windowRowNodes.length <= columns){
        var vws = mkNewWindow(rowIdx, windowRowNodes.length, this.state.dims);
        windowRowNodes.push(<Window key={vws.id} ws={vws} handleMakeNewWindow={this.createWindow}/>)
      }
      return <div key={windowRow.id} >{windowRowNodes}</div>;
    }.bind(this));

    var windowRowNodes = [];
    while (windowRowNodes.length <= columns){
      var vws = mkNewWindow(rows, windowRowNodes.length, this.state.dims);
      windowRowNodes.push(<Window key={vws.id} ws={vws} handleMakeNewWindow={this.createWindow}/>)
    }
    windowNodes.push(<div key={'rows' + rows} >{windowRowNodes}</div>);

    return (
      <div>
        <Header />
        <div className="windows">
          {windowNodes}
        </div>
      </div>
    );
  },
});

var serverConfig = new SocketVizServerConfig();
var vizServer = new SocketVizServer(serverConfig)
vizServer.test()

ReactDOM.render(
  <WebVizApp vizServer={vizServer}/>,
  document.getElementById('content')
);

