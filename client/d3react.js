
//=============================================================

window.Chart2D = React.createClass({
  componentDidMount: function() {
    var el = ReactDOM.findDOMNode(this.refs.div)
    this._dataVersion = {}
  },

  componentDidUpdate: function() {

    var el = ReactDOM.findDOMNode(this.refs.div)

    var vis = d3.select(el);

    var W = el.parentNode.getBoundingClientRect().width;
    var H = el.parentNode.getBoundingClientRect().height;

    var hasUpdate = false;

    var dataArray = [];
    for (var name in this.props.data){
      dataArray.push(this.props.data[name])
      if (this.props.dataVersion[name] !== this._dataVersion[name]){
        hasUpdate = true;
        this._dataVersion[name] = this.props.dataVersion[name];
      }
    }

    if (!hasUpdate)
      return;

    vis.selectAll("*").remove();

    if (dataArray[0].x.length > 0){

      var minX = Math.min.apply(Math, dataArray.map(function(d){ return Math.min.apply(Math, d.x); }));
      var maxX = Math.max.apply(Math, dataArray.map(function(d){ return Math.max.apply(Math, d.x); }));

      var minY = Math.min.apply(Math, dataArray.map(function(d){ return Math.min.apply(Math, d.y); }));
      var maxY = Math.max.apply(Math, dataArray.map(function(d){ return Math.max.apply(Math, d.y); }));

      var T = 5;
      var B = 20;
      var R = 20;
      var L = 40;

      var xScale = d3.scaleLinear().range([L, W-R]).domain([minX, maxX]);
      var yScale = d3.scaleLinear().range([H-B, T]).domain([minY, maxY]);


      var xAxis = d3.axisBottom(xScale)
      var yAxis = d3.axisLeft(yScale)

      vis.append("svg:g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + (H - B) + ")")
          .call(xAxis);
      vis.append("svg:g")
          .attr("class", "y axis")
          .attr("transform", "translate(" + L + ",0)")
          .call(yAxis);

      var lineGen = d3.line()
          .x(function(p) {
              return xScale(p[0]);
          })
          .y(function(p) {
              return yScale(p[1]);
          })

        // add legend   
      var legend = vis.append("g")
        .attr("class", "legend")
        .attr("x", W - 65)
        .attr("y", 25)
        .attr("height", 100)
        .attr("width", 100);

      var idx = 0;
      for (var name in this.props.data){
        var d = this.props.data[name];
        var ld = [];
        var color = this.props.colors[idx];
        for (var i = 0; i < d.x.length; i++)
          ld.push([ d.x[i], d.y[i] ]);

        var LR = 150
        var LH = 10

        var g = legend.append('g');
            g.append("rect")
             .attr("x", W - LR)
             .attr("y", T + idx*LH)
             .attr("width", 8)
             .attr("height", 8)
             .style("fill", color);
            
            g.append("text")
             .attr("x", W - LR+15)
             .attr("y", T + idx * LH + 6)
             .attr("height",30)
             .attr("width",100)
             .attr('font-size', '10px')
             .style("fill", color)
             .text(name);

        vis.append('svg:path')
            .attr('d', lineGen(ld))
            .attr('stroke', color)
            .attr('stroke-width', 1)
            .attr('fill', 'none')
            .attr('data-legend', name);
        idx += 1
      }
    }
  },

  componentWillUnmount: function() {
    var el = ReactDOM.findDOMNode(this.refs.div)
    //destroy d3
  },

  render: function() {
    return (
      <svg className="d3chart" ref="div"></svg>
    );
  }
});

//=============================================================

