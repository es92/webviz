

window.WindowState = function(){
  this.id = UUID();
  this.x = 0;
  this.y = 0;
  this.w = 320;
  this.h = 240;
}

window.VizWindowState = function(){
  this.selectedVizDataInfo = {}
}

window.Window = React.createClass({
  componentDidMount: function(){
    this._setPosition()
  },
  componentDidUpdate: function(prevProps, prevState){
    this._setPosition()
  },
  _setPosition: function(){
    var node = ReactDOM.findDOMNode(this.refs.window)
    node.style.left = this.props.ws.x + 'px';
    node.style.top = this.props.ws.y + 'px';
    node.style.width = this.props.ws.w-1 + 'px';
    node.style.height = this.props.ws.h-1 + 'px';
  },
  toggleSelectData: function(name){
    this.props.handleToggleSelectData(this.props.ws.rowIdx, this.props.ws.colIdx, name)
  },
  removeWindow: function(){
    this.props.handleRemove(this.props.ws.rowIdx, this.props.ws.colIdx)
  },
  makeNewWindow: function(){
    this.props.handleMakeNewWindow(this.props.ws.rowIdx, this.props.ws.colIdx)
  },
  render: function(){
    if (this.props.ws.type === 'new'){
      return (<div className='window mkNewWindow' ref="window" onClick={this.makeNewWindow}>
                <div className="text">+</div>
              </div>);
    }
    else {
      return <VizWindow ref="window" vizDataInfo={this.props.vizDataInfo} 
                                     vws={this.props.ws.vizWindowState} 
                                     vizDataByName={this.props.vizDataByName}
                                     handleToggleSelectData={this.toggleSelectData}
                                     handleRemove={this.removeWindow}/>
    }
  }
});

//=============================================================

window.VizWindow = React.createClass({
  togglePlotSelector: function(){
    this.setState({ showPlotSelector: !this.state.showPlotSelector });
  },
  toggleSelectData: function(name){
    this.props.handleToggleSelectData(name);
  },
  getInitialState: function(){
    return { 'showPlotSelector': true };
  },
  render: function(){
    var plotSelector = null;
    if (this.state.showPlotSelector){
      plotSelector = (<VizWindowPlotSelector vizDataInfo={this.props.vizDataInfo} 
                                             selectedVizDataInfo={this.props.vws.selectedVizDataInfo} 
                                             handleToggleSelectData={this.toggleSelectData} />)
    }
    return (<div className='window'>
            {plotSelector}
            <VizWindowDisplay vws={this.props.vws} vizDataByName={this.props.vizDataByName} vizDataInfo={this.props.vizDataInfo}/>
            <VizWindowHeader handleTogglePlotSelector={this.togglePlotSelector}
                             handleRemove={this.props.handleRemove} />
            </div>)
  }
});

//=============================================================

window.VizWindowDisplay = React.createClass({
  render: function(){
    var colors = [ 'blue', 'red', 'green', 'magenta', 'orange', 'purple', 'aqua', 'peru', 'pink', 'slategray', 'darkred', 'coral' ];
    var data = {}
    var type = null
    for (var name in this.props.vws.selectedVizDataInfo){
      data[name] = this.props.vizDataByName[name];
      var subtype = this.props.vizDataInfo[name];
      if (type == null)
        type = subtype;
      if (subtype != type)
        throw new Error('bad subtype ' + subtype + ' for type ' + type)
    }
    if (type === null)
      return <div className="vizWindowDisplay"></div>;
    else if (type === '2D')
      return <div className="vizWindowDisplay"><Chart2D data={data} colors={colors}/></div>
    else
        throw new Error('unimplemented or unsupported type ' + type);
  }
});

window.VizWindowHeader = React.createClass({
  render: function(){
    return (<div className='vizWindowHeader' >
              <div className='vizWindowToggleSelectPlots' onClick={this.props.handleTogglePlotSelector}>v</div>
              <div className='vizWindowRemove' onClick={this.props.handleRemove}>x</div>
            </div>)
  }
});

window.VizWindowPlotSelector = React.createClass({
  toggleSelectData: function(name){
    this.props.handleToggleSelectData(name);
  },
  render: function(){
    var vizDataInfoToggleNodes = []
    for (var name in this.props.vizDataInfo){
      var checked = name in this.props.selectedVizDataInfo;
      vizDataInfoToggleNodes.push(<div key={name}><input type="checkbox" checked={checked} onChange={this.toggleSelectData.bind(this, name)}/>{this.props.vizDataInfo[name]} {name}</div>)
    }

    return (<div className='vizWindowPlotSelector'>
            {vizDataInfoToggleNodes}
            </div>)
  },
});
