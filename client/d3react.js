
//=============================================================

window.Chart2D = React.createClass({
  componentDidMount: function() {
    var el = ReactDOM.findDOMNode(this.refs.div)

  },

  componentDidUpdate: function() {
    var el = ReactDOM.findDOMNode(this.refs.div)

    var vis = d3.select(el);

    vis.selectAll("*").remove();

    var W = el.parentNode.getBoundingClientRect().width;
    var H = el.parentNode.getBoundingClientRect().height;

    var dataArray = [];
    for (var name in this.props.data)
      dataArray.push(this.props.data[name])

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

      var idx = 0;
      for (var name in this.props.data){
        var d = this.props.data[name];
        var ld = [];
        for (var i = 0; i < d.x.length; i++)
          ld.push([ d.x[i], d.y[i] ]);
        vis.append('svg:path')
            .attr('d', lineGen(ld))
            .attr('stroke', this.props.colors[idx])
            .attr('stroke-width', 1)
            .attr('fill', 'none');
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

