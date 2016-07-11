
var Header = React.createClass({
  render: function(){
    return <div className="header">layout: {this.props.currentLayoutHint}</div>
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
    this.props.vizServer.on('layoutHints', this.updateLayoutHints)
    this.updateVizDataInfo(this.props.vizServer.getVizDataInfo())
    this.updateLayoutHints(this.props.vizServer.getLayoutHints())
  },
  updateVizDataInfo: function(vizDataInfo){
    this.setState({ vizDataInfo: vizDataInfo });
  },
  updateLayoutHints: function(layoutHints){
    this.setState({ layoutHints: layoutHints });
    if (this.state.keepLayout == false && size(layoutHints) > 0){
      if (this.state.lastLayoutHint != null && this.state.lastLayoutHint in layoutHints){
        this.setLayoutHint(this.state.lastLayoutHint, this.layoutHints[name], true);
      }
      else {
        var keepLayout = this.state.lastLayoutHint == null;
        var layoutHintName = null
        for (var name in layoutHints){
          if (layoutHintName == null)
            layoutHintName = name;
          if (layoutHints[name].isDefault){
            layoutHintName = name;
            break
          }
        }
        this.setLayoutHint(layoutHintName, this.state.layoutHints[layoutHintName], keepLayout)
      }
    }
  },
  setLayoutHint: function(name, hint, keepLayout){
    this.removeAllWindows();
    for (var w in hint){
      var row = hint[w]['position'][0];
      var col = hint[w]['position'][1];
      this.createWindow(row, col)
      hint[w]['data'].forEach(function(name){ 
        this.toggleSelectData(row, col, name) 
      }.bind(this));
    }
    this.setState({ keepLayout: keepLayout, currentLayoutHint: name })
  },
  removeAllWindows: function(){
    this.setState({ windowGrid: [ { id: UUID(), windows: [] } ], keepLayout: true })
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
    this.setState({ windowGrid: windowGrid, keepLayout: true, currentLayoutHint: 'custom' })
  },
  removeWindow: function(rowIdx, colIdx){
    var windowGrid = this.state.windowGrid;
    windowGrid[rowIdx].windows[colIdx] = null;
    this.setState({ windowGrid: windowGrid, keepLayout: true, currentLayoutHint: 'custom' })
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
    this.setState({ windowGrid: this.state.windowGrid, vizDataListenerIds: this.state.vizDataListenerIds, vizDataListenersCounter: this.state.vizDataListenersCounter, keepLayout: true, currentLayoutHint: 'custom' });
  },
  getInitialState: function() {
    return { vizDataInfo: {}, 
             vizDataByName: {},
             vizDataListenersCounter: {},
             vizDataListenerIds: {},
             layoutHints: {},
             keepLayout: false,
             currentLayoutHint: null,
             lastLayoutHint: localStorage.lastLayoutHint,
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
        <Header layoutHints={this.statelayoutHints} currentLayoutHint={this.state.currentLayoutHint}/>
        <div className="windows">
          {windowNodes}
        </div>
      </div>
    );
  },
});

var serverConfig = new SocketVizServerConfig(new SocketConfig());
var vizServer = new SocketVizServer(serverConfig)
//vizServer.socket.test()

ReactDOM.render(
  <WebVizApp vizServer={vizServer}/>,
  document.getElementById('content')
);

