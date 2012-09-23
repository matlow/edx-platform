<%page args="grade_summary, grade_cutoffs, graph_div_id, **kwargs"/>
<%!
  import json
  import math
%>

$(function () {
  function showTooltip(x, y, contents) {
    $('<div id="tooltip">' + contents + '</div>').css( {
      position: 'absolute',
      display: 'none',
      top: y + 5,
      left: x + 15,
      border: '1px solid #000',
      padding: '4px 6px',
      color: '#fff',
      'background-color': '#333',
      opacity: 0.90
    }).appendTo("body").fadeIn(200);
  }

  function sortGradeCutoffs(obj) {
    var arr = [];
    for (var prop in obj)
      if (obj.hasOwnProperty(prop))
        arr.push({'key': prop, 'value': obj[prop]});
    arr.sort(function(a, b) { return b.value - a.value; });
    return arr.map(function (el) { return el.key; });
  }

  /* -------------------------------- Grade detail bars -------------------------------- */
    
  <%
  colors = ["#b72121", "#600101", "#666666", "#333333"]
  categories = {}

  tickIndex = 1
  sectionSpacer = 0.25
  sectionIndex = 0

  ticks = [] #These are the indices and x-axis labels for the data
  bottomTicks = [] #Labels on the bottom
  detail_tooltips = {} #This an dictionary mapping from 'section' -> array of detail_tooltips
  droppedScores = [] #These are the datapoints to indicate assignments which are not factored into the total score
  dropped_score_tooltips = []

  for section in grade_summary['section_breakdown']:
      if section.get('prominent', False):
          tickIndex += sectionSpacer
            
      if section['category'] not in categories:
          colorIndex = len(categories) % len(colors)
          categories[ section['category'] ] = {'label' : section['category'], 
                                              'data' : [], 
                                              'color' : colors[colorIndex]}
      
      categoryData = categories[ section['category'] ]
    
      categoryData['data'].append( [tickIndex, section['percent']] )
      ticks.append( [tickIndex, section['label'] ] )
    
      if section['category'] in detail_tooltips:
          detail_tooltips[ section['category'] ].append( section['detail'] )
      else:
          detail_tooltips[ section['category'] ] = [ section['detail'], ]
          
      if 'mark' in section:
          droppedScores.append( [tickIndex, 0.05] )
          dropped_score_tooltips.append( section['mark']['detail'] )
        
      tickIndex += 1
    
      if section.get('prominent', False):
          tickIndex += sectionSpacer
          
  ## ----------------------------- Grade overviewew bar ------------------------- ##
  tickIndex += sectionSpacer
  
  series = categories.values()
  overviewBarX = tickIndex
  extraColorIndex = len(categories) #Keeping track of the next color to use for categories not in categories[]

  for section in grade_summary['grade_breakdown']:
      if section['percent'] > 0:
          if section['category'] in categories:
              color = categories[ section['category'] ]['color']
          else:
              color = colors[ extraColorIndex % len(colors) ]
              extraColorIndex += 1
        
          series.append({
              'label' : section['category'] + "-grade_breakdown",
              'data' : [ [overviewBarX, section['percent']] ],
              'color' : color
          })
            
          detail_tooltips[section['category'] + "-grade_breakdown"] = [ section['detail'] ]
  
  ticks += [ [overviewBarX, "Total"] ]
  tickIndex += 1 + sectionSpacer
  
  totalScore = math.floor(grade_summary['percent'] * 100) / 100 #We floor it to the nearest percent, 80.9 won't show up like a 90 (an A)
  detail_tooltips['Dropped Scores'] = dropped_score_tooltips
  
  
  ## ----------------------------- Grade cutoffs ------------------------- ##
  
  grade_cutoff_ticks = [ [1, "100%"], [0, "0%"] ]
  descending_grades = sorted(grade_cutoffs, key=lambda x: grade_cutoffs[x], reverse=True)
  for grade in descending_grades:
      percent = grade_cutoffs[grade]
      grade_cutoff_ticks.append( [ percent, "{0} {1:.0%}".format(grade, percent) ] )
  %>
  
  var series = ${ json.dumps( series ) };
  var ticks = ${ json.dumps(ticks) };
  var bottomTicks = ${ json.dumps(bottomTicks) };
  var detail_tooltips = ${ json.dumps(detail_tooltips) };
  var droppedScores = ${ json.dumps(droppedScores) };
  var grade_cutoff_ticks = ${ json.dumps(grade_cutoff_ticks) }
  
  //Always be sure that one series has the xaxis set to 2, or the second xaxis labels won't show up
  series.push( {label: 'Dropped Scores', data: droppedScores, points: {symbol: "cross", show: true, radius: 3}, bars: {show: false}, color: "#333"} );
  
  // Allow for arbitrary grade markers e.g. ['A', 'B', 'C'], ['Pass'], etc.
  //    by building the grade markers and grid markings from the `grade_cutoffs` object
  var grade_cutoffs = JSON.parse('${ json.dumps(grade_cutoffs) }');
  descending_grades = sortGradeCutoffs(grade_cutoffs);

  var colors = ['#ddd', '#e9e9e9', '#f3f3f3'];
  var markings = [];
  var marking_from, marking_to = 1;
  for(var i=0; i<descending_grades.length; i++) {
    marking_from = grade_cutoffs[descending_grades[i]];
    var marking = {yaxis: {from: marking_from, to: marking_to}, color: colors[i % colors.length]};
    marking_to = marking_from;
    markings.push(marking);
  }

  var options = {
    series: {stack: true,
              lines: {show: false, steps: false },
              bars: {show: true, barWidth: 0.8, align: 'center', lineWidth: 0, fill: .8 },},
    xaxis: {tickLength: 0, min: 0.0, max: ${tickIndex - sectionSpacer}, ticks: ticks, labelAngle: 90},
    yaxis: {ticks: grade_cutoff_ticks, min: 0.0, max: 1.0, labelWidth: 50},
    grid: { hoverable: true, clickable: true, borderWidth: 1, markings: markings },
    legend: {show: false},
  };
  
  var $grade_detail_graph = $("#${graph_div_id}");
  if ($grade_detail_graph.length > 0) {
    var plot = $.plot($grade_detail_graph, series, options);
    //We need to put back the plotting of the percent here
    var o = plot.pointOffset({x: ${overviewBarX} , y: ${totalScore}});
    $grade_detail_graph.append('<div style="position:absolute;left:' + (o.left - 12) + 'px;top:' + (o.top - 20) + 'px">${"{totalscore:.0%}".format(totalscore=totalScore)}</div>');
  }
      
  var previousPoint = null;
  $grade_detail_graph.bind("plothover", function (event, pos, item) {
    $("#x").text(pos.x.toFixed(2));
    $("#y").text(pos.y.toFixed(2));
    if (item) {
      if (previousPoint != (item.dataIndex, item.seriesIndex)) {
        previousPoint = (item.dataIndex, item.seriesIndex);
            
        $("#tooltip").remove();
            
        if (item.series.label in detail_tooltips) {
          var series_tooltips = detail_tooltips[item.series.label];
          if (item.dataIndex < series_tooltips.length) {
            var x = item.datapoint[0].toFixed(2), y = item.datapoint[1].toFixed(2);
                
            showTooltip(item.pageX, item.pageY, series_tooltips[item.dataIndex]);
          }
        }

      }
    } else {
      $("#tooltip").remove();
      previousPoint = null;            
    }
  });
});
