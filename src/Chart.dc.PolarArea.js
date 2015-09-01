(function() {
    "use strict";

    var root = this,
        Chart = root.Chart,
        dc = root.dc,
        helpers = Chart.helpers,
        //class for data structure that manages filters as they relate to chart segments. This should probably be generalized to chart elements of all kinds.
        FilterManager = function(segmentList) {

            //private member variable
            var filterMap = [];

            //constructor
            //accepts a list of SegmentArcs that have had the extra properties added to them
            for (var i = 0; i < segmentList.length; i++) {
                add(segmentList[i].segmentID);
            }

            //private methods
            function testOnAll(test) {
                var testResult = true;
                for (var i = 0; i < filterMap.length; i++) {
                    //one failure of test means testOnAll fails
                    if (!test(filterMap[i])) {
                        testResult = false;
                    }
                }
                return testResult;
            }
            //add a filter, pretty much just a wrapper for push
            function add(segmentID) {
                filterMap.push({
                    "segmentID": segmentID,
                    "active": false
                });
            }
            //remove a filter by id, returns removed filter
            function remove(segmentID) {
                var removed = filterMap.find(segmentID);
                filterMap = filterMap.filter(function(elem) {
                    return elem.segmentID !== segmentID;
                });
                return removed;
            }
            //return this segment if it is filtered
            function find(segmentID) {
                for (var i = 0; i < filterMap.length; i++) {
                    if (filterMap[i].segmentID === segmentID) {
                        return filterMap[i];
                    }
                }
                return -1;
            }

            //public methods
            return {
                //tell me if the filter for this segment is active
                isActive: function(segmentID) {
                    var filter = find(segmentID);
                    if (filter === -1) {
                        console.error("something went wrong, the filter for this segment does not exist");
                    }
                    return filter.active;
                },
                //for the given segment, activate or deactivate its filter. return whether the filter is on or off.
                flip: function(segmentID) {
                    var filter = find(segmentID);
                    if (filter === -1) {
                        console.error("something went wrong, the filter for this segment does not exist");
                    }
                    filter.active ? filter.active = false : filter.active = true;
                    return filter.active;
                },
                //if all filters are on, we want to be able to quickly deactivate them all
                turnAllOff: function() {
                    for (var i = 0; i < filterMap.length; i++) {
                        filterMap[i].active = false;
                    }
                },
                //tell me if all of the filters are off
                allOff: function() {
                    return testOnAll(function(elem) {
                        return !elem.active;
                    });
                },
                //tell me if all the filters are on
                allOn: function() {
                    return testOnAll(function(elem) {
                        return elem.active;
                    });
                }
            }
        };

    //utility function, Takes an array that has some property as its key
    //and forms a javascript object with the keys as properties so we can get O(1) access
    function createKeyMap(arr, propName) {
        var keyMap = {}
        for (var i = 0; i < arr.length; i++) {
            keyMap[arr[i][propName]] = arr[i];
        }
        return keyMap;
    }


    Chart.types.PolarArea.extend({
        name: "PolarAreaXF",
        //this will have to be a member
        dimension: undefined,
        colorTypes: {
            "NORMAL": 0,
            "HIGHLIGHT": 1,
            "FILTER": 2,
            "FILTER_HIGHLIGHT": 3
        },
        chartGroup: undefined,
        filters: undefined,
        originalDataKeys: undefined,
        initialize: function(data) {
            //--PRE--
            var that = this;
            //Polar Area initialize method is expecting (data, options) in arguments,
            //but we pass in an array of components to merge. Let's clean this up.
            var argsArray = Array.prototype.slice.call(arguments);
            //remove the first element of arguments which is our array, then we do a bunch of Chartjs converison on it . . . 
            argsArray.splice(0, 1);
            //TODO - check if data is an array, if not, put a message in a console explaining how you are supposed to send 
            this.dimension = data.dimension;
            data.chartGroup ? this.chartGroup = data.chartGroup : this.chartGroup = 0;
            //short but magical line. Now we are linked with all dc charts in this group!
            dc.registerChart(this, this.chartGroup);
            var data = this.setupChartData(data.colors, data.highlights, data.labels);
            //... and push the result in its place.
            argsArray.unshift(data);
            //originalDataArray -- this is used as a reference to the original state of the chart, since segments can come and go,
            //we use this to track what a segment's original colors were when adding it back in. This would mess up adding a truly new segment, but who 
            //is gonna do that? Assumption here is dimensions start with so many groups and that is it.
            this.originalDataKeys = createKeyMap(data, "key");
            //parent's initialize
            Chart.types.PolarArea.prototype.initialize.apply(this, argsArray);
            //--modify SegmentArcs--
            //assign colors and ids to all existing segment arcs
            var mySegments = this.segments;
            for (var i = 0; i < mySegments.length; i++) {
                mySegments[i].colorList = [undefined, undefined, "#777", "#aaa"];
                mySegments[i].colorList[this.colorTypes.NORMAL] = mySegments[i].fillColor;
                mySegments[i].colorList[this.colorTypes.HIGHLIGHT] = mySegments[i].highlight;
                mySegments[i].segmentID = i;
                mySegments[i].key = data[i].key;
            }
            //add methods to SegmentArc objects that will color them one way or the other depending on their filter
            this.SegmentArc.prototype.setIncluded = function(include) {
                    if (include) {
                        this.fillColor = this.colorList[that.colorTypes.NORMAL];
                        this.highlight = this.colorList[that.colorTypes.HIGHLIGHT];
                    } else {
                        this.fillColor = this.colorList[that.colorTypes.FILTER];
                        this.highlight = this.colorList[that.colorTypes.FILTER_HIGHLIGHT];
                    }
                }
                //--initialize filters--
            this.filters = new FilterManager(this.segments);
            //handle clicks on segments as filter events, do the styling and crossfilter changes at the Chart level in the filter method.
            helpers.bindEvents(this, ["mousedown"], function(evt) {
                var activeSegment = Chart.types.PolarArea.prototype.getSegmentsAtEvent.apply(this, [evt])[0];
                this.handleFilter(activeSegment);
            });

        },
        //convert crossfilter dimension into chart.js Polar Area data object array
        setupChartData: function(colors, highlights, labels) {
            var chartJSible = [];
            //probably need checks here to make sure client actually passed in a crossfilter dimension
            var grouped = this.dimension.group().reduceCount().top(Infinity);
            //probably need checks here to either fail if the arrays aren't all long enough or have some way to add random colors/highlights if they are shorter.
            for (var i = 0; i < grouped.length; i++) {
                var dataObject = {
                    value: grouped[i].value,
                    key: grouped[i].key,
                    color: colors[i],
                    highlight: highlights[i],     
                    label: labels ? (labels[i] ? labels[i] : grouped[i].key) : grouped[i].key
                };
                chartJSible.push(dataObject);
            }

            return chartJSible;

        },
        //figure out what changed between Chart.js' internally maintained data object array and crossfilter's dimension data. use the saved information
        //about what colors and highlight a key has to rebuild the segmentArc list 'segments'. can't trash the old, it might mess up the animations. 
        redraw: function() {
            var grouped = this.dimension.group().reduceCount().top(Infinity);
            var currentSegmentKeys = createKeyMap(this.segments, "key");
            var crossfilterGroupKeys = createKeyMap(grouped, "key");
            //loop through the segment list, if the segment for a group is already there, update the value, if it is not there, add it back using the 
            //original data as a guide for what it's color and highlight color should be. if there are segments in the existing list

            var length = Math.max(this.segments.length, grouped.length);
            //going through both lists, whichever is longer
            for (var i = 0; i < length; i++) {
                var sList = this.segments;
                var gList = grouped;
                //only do this part if we still have items in the new filtered list
                if (gList[i]) {
                    //we already have a segment for this crossfilter group, just get that segment and update its value 
                    if (currentSegmentKeys[gList[i].key]) {
                        currentSegmentKeys[gList[i].key].value = gList[i].value;
                    } else {
                        //the chart doesn't have the crossfilter group item, add a new segment with the right colors and values from original data
                        var theSegment = this.originalDataKeys[gList[i].key];
                        this.addData(theSegment, 0, true);
                    }
                }
                //only do this part if we still have items in the current chart segment list
                if (sList[i]) {
                    //we don't have this segment in the new crossfilter group, remove it from the chart 
                    if (!crossfilterGroupKeys[sList[i].key]) {
                        this.removeData(i);
                    }
                }
            }

            this.update();
            console.log("called for me!");
        },
        filterAll: function() {
            //implements dc chart registry interface but does nothing!
        },
        handleFilter: function(clicked) {
            //after we have all of the filters figured out, change the colors to reflect what they should be and update the chart
            function colorMeIn(segments) {
                var activeFilters = [];
                for (var i = 0; i < segments.length; i++) {
                    var segment = segments[i];
                    if (this.filters.isActive(segment.segmentID) || this.filters.allOff()) {
                        segment.setIncluded(true);
                        activeFilters.push(segment.key);
                    } else {
                        segment.setIncluded(false); 
                    }
                }
                    this.dimension = this.dimension.filterFunction(function(d) {
                        for(var i = 0; i < activeFilters.length; i++) {
                            if(d === activeFilters[i]) {
                                return true;
                            }
                        }
                        return false;
                    });   
            }
            this.filters.flip(clicked.segmentID);
            colorMeIn.call(this, this.segments);
            if (this.filters.allOn()) {
                this.dimension = this.dimension.filterAll();
                dc.redrawAll();
                this.filters.turnAllOff();
            }
             dc.redrawAll();

             


            
           
        }
    })
}).call(this);
