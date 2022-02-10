# Chart.dc.js

:warning: **notice** this repository was created several years ago and since then has not been actively maintained by the original author. Chart.js and crossfilter.js have probably undergone several iterations since that point and other visualization libraries may have emerged as well. If you have interest in taking this project over if there is any value in doing so, feel free to fork and let me know so I can redirect contributors to your repo. thank you! 

Chart.dc.js is an extension of Chart.js devoted to the integration of Crossfilter with Chart.js, with support for dc.js chart groups. 

The need for this grew out of a desire to make use of the clean, simple and unique chart implementations in Chart.js, but to use them with the same kind of behavior that dc.js has incorporated to d3js charts.

Additionally, Chart.dc.js makes it possible to add your chart to a dc.js chartgroup, so these charts can be used in conjunction with dc.js charts or other charts that can be registered to the dc.js chartRegistry.

> Note Chart.dc.js so far is just a small personal project, and there is no guarantee that it will support future versions of its dependencies (d3.js, crossfilter.js, dc.js, Chart.js).

The only Chart.js chart available for Chart.dc.js at present is the Polar Area chart. Please feel free to make pull requests and contribute to flesh out the project with more Chart.js charts. 

# How to Install #

There is no support for Bower or dependency injection with Chart.dc.js at this time, but adding Chart.dc.js is fairly simple with traditional javascript includes. 

1. Add your dependencies first, in the appropriate order
	
	Dependency | Include Example (your directory name/structure may vary)
	--- | ---
	d3js <http://d3js.org> | `<script src='src/d3.js'></script>` 
	crossfilter <http://square.github.io/crossfilter/> |  `<script src='src/crossfilter.js'></script>` 
	dc-js <http://dc-js.github.io/dc.js/> | `<script src='dc.js'></script>`
	Chart.js <http://www.chartjs.org/> | `<script src='Chart.js'></script>`
2. Add the dependency for the Chart.dc.js chart you want to include
	`<script src='Chart.dc.PolarArea.js'></script>`

# How To Use #

   If you have not visited the links for any of the above organizations, you are highly encouraged to do so. Each one provides great getting started and API documentation which goes into more depth about how these charts work. However, if you just want to get started quickly with a chart, you might be able to simply follow the guide below or look at the provided example in the repository and this fiddle: http://jsfiddle.net/nsubordin81/3w725o3c/1/.

   Declare your polar area chart element in HTML same as you would any Chart.js chart element. For example:

	<canvas id="myChart" width="400" height="400"></canvas>

   In your javascript, you will need to initialize crossfilter and create a crossfilter dimension to support your chart: 

```javascript

   var xf = crossfilter([some crossfilter ready data set])
   var myDimension = xf.dimension(function(d) { 
      return d.myColumn; 
   });

```

   Now for the fun part. Chart.js extensions inherit from the Chart.Type prototype function which only accepts a single argument for the data and another for the options object. 

   The data argument is where all of the chart data lives along with the labels and colors it should have in the chart. We need to follow a slightly different format in order to bake in the crossfilter functionality without messing around in the internal chart code. 
   
   Basically, the 'data' argument you pass to your Chart.dc.js chart extension should not be an array of objects but instead take the following format:

```javascript



var data = {
	dimension: // the crossfilter dimension you wish to use for this chart
	colors: // array of the colors you want to have in the chart
	highlights: //an array of highlights corresponding to each color
	labels: //an array of labels (optional), the way you wish crossfilter groups
    //to be displayed. If non are supplied, the keys of the 
    //crossfilter groups will be used. 
    //Getting the order of these right may involve looking at your 
    //crossfilter group array in advance.
	chartGroup: // the dc-js chart group this chart should belong to.
    //If none is supplied, this chart will belong to chart group 0. 
}

var myOptions = {//you can use any of the options available to Polar Area Charts here}

var myPolarArea = new Chart(ctx).PolarAreaXF(data, myOptions);

```

# Licensing #

The project is under the MIT license, a copy of which is included in the repository and in the comment at the top of the source code. Additionally, the project makes use of the following third party libraries: d3.js, crossfilter, dc-js, and Chart.js, all of which come with their own licenses. 

# Contribute #

This project as it stands is not overly robust, the scope is just to extend Chart.js so it can have dc.js-like behavior and work with charts from that library. Any contributions toward that goal are welcomed and encouraged, and ideas that go beyond this scope are welcome as well, but might gain more exposure by being hosted through one of the more mature repositories that this one is based off of, such as d3, dc-js, or Chart.js.
