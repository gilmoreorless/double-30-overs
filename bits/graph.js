(function () {

    /*** Helpers ***/


    function debounce(fn, time) {
        var timeout;
        return function bounced() {
            var context = this;
            var args = arguments;
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(function () {
                clearTimeout(timeout);
                fn.apply(context, args);
            }, time);
        };
    }
    window.debounce = debounce;


    /*** D3 extensions ***/


    d3.selection.prototype.translate = function translate(x, y) {
        return this.attr('transform', 'translate(' + x + ',' + y + ')');
    };

    /**
     * A cut-down copy of d3.svg.line()
     * Key differences:
     * - Replace .defined() with .broken() to break the line *without* skipping any data points
     * - Hard-coded projection/interpolation
     * - Removed any unneeded methods
     */
    d3.svg.breakableLine = function () {
        var x = function (d) { return d[0]; },
            y = function (d) { return d[1]; },
            broken = function () { return false; },
            interpolate = function (points) { return points.join('L'); };
        function line(data) {
            var segments = [], points = [], i = -1, n = data.length, d, fx = d3.functor(x), fy = d3.functor(y);
            function segment() {
                segments.push('M', interpolate(points));
            }
            while (++i < n) {
                if (broken.call(this, d = data[i], i) && points.length) {
                    segment();
                    points = [];
                }
                points.push([ +fx.call(this, d, i), +fy.call(this, d, i) ]);
            }
            if (points.length) segment();
            return segments.length ? segments.join('') : null;
        }
        line.x = function(_) {
            if (!arguments.length) return x;
            x = _;
            return line;
        };
        line.y = function(_) {
            if (!arguments.length) return y;
            y = _;
            return line;
        };
        line.broken = function(_) {
            if (!arguments.length) return broken;
            broken = _;
            return line;
        };
        return line;
    };


    /*** RollingAverage ***/


    function RollingAverage(rollingWindow) {
        this.values = [];

        this.push = function () {
            this.values.push.apply(this.values, arguments);
            while (this.values.length > rollingWindow) {
                this.values.shift();
            }
        };

        this.reset = function () {
            this.values = [];
        };
    }

    function average(arr) {
        var values = arr.values || arr;
        var avg = d3.mean(values);
        avg = Math.round(avg * 6) / 6; // Round to balls only
        return avg;
    }


    /*** ODIGraph ***/


    var ODIGraph = window.ODIGraph = function () {
        this.data = [];
        this.inited = false;
    };

    var gproto = ODIGraph.prototype;

    gproto.init = function (data, config) {
        this.inited = true;
        this.data = data;
        this.graph = chartTemplate(this.data);
        if (config !== undefined) {
            this.config(config);
        }
        return this;
    };

    gproto.config = function (config) {
        if (this.graph) {
            this.graph.config(config);
        }
        return this;
    };

    gproto.render = function (elem) {
        d3.select(elem).call(this.graph);
        return this;
    };


    /**
     * Main container. Calling this returns a new chart instance.
     */
    function chartTemplate(rawData) {
        var options = {
            xUseDates: true,
            title: '',
            showRollingAverage: false,
            showInningsPoints: true,
            yBounds: [],
            filters: [],
            highlightRegions: [],
            resetHighlightAverages: false,
            dateStart: null,
            dateEnd: null
        };
        var data = rawData;
        var hasRendered = false;
        var curFilters;

        function chart(selection) {
            var bits = chart.bits = {};
            var nodes = chart.nodes = {};

            nodes.container = selection;
            nodes.svg = selection.append('svg');

            /*** Calculate parameters ***/

            chart.dims = {};
            chart.dims.padding = {
                top: 25,
                left: 30,
                right: 60,
                bottom: 50,
                yAxis: 20,
                xAxis: 3
            };
            getDims();


            /*** Build components ***/

            bits.xScale = d3.time.scale();
            bits.xAxis = d3.svg.axis()
                .scale(bits.xScale)
                .orient('bottom');

            bits.yScale = d3.scale.linear();
            bits.yAxis = d3.svg.axis()
                .scale(bits.yScale)
                .orient('left')
                .tickFormat(d3.format('d'));


            /*** Draw containers and placeholders ***/

            // Overall group at half-pixel offset for crisper lines
            nodes.root = nodes.svg.append('g')
                .translate(0.5, 0.5);

            // Title
            nodes.title = nodes.root.append('text')
                .attr('class', 'title')
                .attr('text-anchor', 'middle')
                .attr('dy', '0.25em');

            // Axes
            nodes.xAxis = nodes.root.append('g')
                .attr('class', 'axis-x');
            nodes.yAxis = nodes.root.append('g')
                .attr('class', 'axis-y');

            // Highlight regions
            nodes.highlights = nodes.root.append('g')
                .attr('class', 'highlight-regions');

            // 30-over mark
            nodes.over30 = nodes.root.append('g')
                .attr('class', 'over-30');
            nodes.over30line = nodes.over30.append('line')
                .attr('x', 0)
                .attr('y', 0)
                .attr('y2', 0);
            nodes.over30text = nodes.over30.append('text')
                .text('30 overs')
                .attr('y', 3);

            // Groups for showing data
            nodes.dataGroupAll = nodes.root.append('g').attr('class', 'data');
            nodes.dataGroupInnings = nodes.dataGroupAll.append('g').attr('class', 'data-innings');
            nodes.dataGroupAverage = nodes.dataGroupAll.append('g').attr('class', 'data-average');
            nodes.dataGroupRolling = nodes.dataGroupAll.append('g').attr('class', 'data-rolling-average');

            // Legend
            nodes.legend = nodes.root.append('g')
                .attr('class', 'legend');
            nodes.legendInner = nodes.legend.append('g')
                .attr('class', 'legend-inner');

            // Line on hover
            nodes.hoverLine = nodes.root.append('line')
                .attr('class', 'hover-rule')
                .attr('x', 0)
                .attr('y', 0)
                .attr('x2', 0);
            nodes.eventRect = nodes.root.append('rect')
                .attr('class', 'hover-events')
                .attr('x', 0)
                .attr('y', 0);

            nodes.eventRect.on('mouseenter', function () {
                chart.hover(true);
            });
            nodes.eventRect.on('mouseleave', function () {
                chart.hover(false);
            });

            // Tooltip
            nodes.tooltip = nodes.container.append('div')
                .attr('class', 'tooltip');
            nodes.tooltipHeader = nodes.tooltip.append('h6')
                .attr('class', 'tooltip-header');
            nodes.tooltipContent = nodes.tooltip.append('div')
                .attr('class', 'tooltip-content');

            chart.resize();
            chart.render();

            window.addEventListener('resize', debounce(function () {
                getDims();
                chart.resize();
                chart.render();
            }, 300), false);
        }

        function getDims() {
            chart.dims.width  = parseFloat(chart.nodes.svg.style('width'))  || 0;
            chart.dims.height = parseFloat(chart.nodes.svg.style('height')) || 0;
            chart.dims.innerWidth  = chart.dims.width  - chart.dims.padding.left - chart.dims.padding.right;
            chart.dims.innerHeight = chart.dims.height - chart.dims.padding.top  - chart.dims.padding.bottom;
        }

        /**
         * Update all container node dimensions to match the SVG's current size
         */
        chart.resize = function () {
            var bits = chart.bits;
            var nodes = chart.nodes;
            var dims = chart.dims;
            var padding = dims.padding;

            bits.xScale.range([0, dims.innerWidth]);
            bits.yScale.range([dims.innerHeight, 0]);

            nodes.title
                .attr('x', padding.left + (dims.innerWidth / 2))
                .attr('y', padding.top / 2);
            nodes.xAxis.translate(padding.left, dims.height - padding.bottom);
            nodes.yAxis.translate(padding.left, padding.top);
            nodes.highlights.translate(padding.left, 0);
            nodes.over30.translate(padding.left, padding.top);
            nodes.over30line.attr('x2', dims.innerWidth);
            nodes.dataGroupAll.translate(padding.left, padding.top);
            nodes.legend.translate(padding.left, dims.height - padding.bottom + 30); // +30 == Clear the x axis
            nodes.hoverLine.attr('y2', dims.innerHeight);
            nodes.eventRect
                .attr('width', dims.innerWidth)
                .attr('height', dims.innerHeight)
                .translate(padding.left, padding.top);
            nodes.tooltip
                .style('left', padding.left + 'px')
                .style('top', (padding.top + dims.innerHeight + 30) + 'px');
        };

        chart.data = function (newData) {
            data = newData;
            if (hasRendered) {
                chart.render();
            }
        };

        chart.config = function (config) {
            config = config || {};
            for (var key in config) {
                options[key] = config[key];
            }
            // Re-render chart if required
            if (hasRendered) {
                chart.render();
            }
        };


        function filterData() {
            var hasDateFilters = false;
            var nonDateFilters = [];
            var highlightBoundaries = [];
            var dateStart, dateEnd;

            options.filters.forEach(function (f) {
                if (f.key.substr(0, 5) === 'date/') {
                    hasDateFilters = true;
                    if (f.key === 'date/start') {
                        dateStart = new Date(f.value);
                    }
                    if (f.key === 'date/end') {
                        dateEnd = new Date(f.value);
                    }
                } else {
                    nonDateFilters.push(f);
                }
            });

            if (options.resetHighlightAverages && options.highlightRegions) {
                // highlightBoundaries == a list of Dates; averages get reset AFTER these dates
                var dates = d3.set();
                options.highlightRegions.forEach(function (region) {
                    var start = new Date(region.start);
                    var end = new Date(region.end);
                    // Normalise so that they're always end dates
                    start.setDate(start.getDate() - 1);
                    [start, end].forEach(function (date) {
                        // D3 sets use string keys, but we want to keep the Date objects,
                        // so this can't just add everything to a set and be done.
                        if (!dates.has(date)) {
                            dates.add(date);
                            highlightBoundaries.push(date);
                        }
                    });
                });
                highlightBoundaries.sort(function (a, b) {
                    return a - b;
                });
            }

            var newData = rawData.filter(function (d) {
                if (hasDateFilters) {
                    var date = new Date(d.date);
                    if (
                        (dateStart && date < dateStart) ||
                        (dateEnd && date > dateEnd)
                    ) {
                        return false;
                    }
                }
                if (!nonDateFilters.length) {
                    return true;
                }
                var matchesFilter = function (filter) {

                    // Short-circuit if the data doesn't have a value for this filter
                    if (!(filter.key in d)) {
                        return !!filter.negate;
                    }

                    var dataValue = d[filter.key];
                    var hasMatch;

                    // Check single value
                    //   "k=v"
                    //   "k=!v"
                    if (filter.value) {
                        hasMatch = dataValue === filter.value;

                    // Check multiple values
                    //   "k=(a,b,c)"   [OR]
                    //   "k=!(a,b,c)"  [NOR]
                    } else if (filter.values) {
                        hasMatch = filter.values.some(function (value) {
                            return dataValue === value;
                        });
                    }

                    return filter.negate ? !hasMatch : hasMatch;
                };

                // Quick hack for more performant filter checking.
                // As soon as a filter returns false, the rest are not checked.
                return !nonDateFilters.some(function (filter) {
                    return !matchesFilter(filter);
                });
            });

            // Update averages
            var avgAll = new RollingAverage(Infinity);
            var avgRolling = new RollingAverage(100);
            for (var i = 0, ii = newData.length; i < ii; i++) {
                var inn = newData[i];

                if (highlightBoundaries.length) {
                    inn.reset_average = false;
                    var date = new Date(inn.date);
                    if (date > highlightBoundaries[0]) {
                        if (avgAll.values.length) {
                            inn.reset_average = true;
                            avgAll.reset();
                            avgRolling.reset();
                        }
                        while (date > highlightBoundaries[0]) {
                            highlightBoundaries.shift();
                        }
                    }
                }

                avgAll.push(inn.half_score_normalised);
                avgRolling.push(inn.half_score_normalised);
                inn.average = average(avgAll);
                inn.rolling_average = average(avgRolling);
            }

            return newData;
        }

        /**
         * Auto-calculate the best domain values for the y axis
         */
        function getOversDomain() {
            var limitMin = 10, limitMax = 50;
            var min, max;

            if (options.yBounds.length >= 2) {
                return options.yBounds.slice(0, 2);
            }
            var overs = d3.merge(data.map(function (d) {
                var values = [d.average];
                if (options.showRollingAverage) {
                    values.push(d.rolling_average);
                }
                if (options.showInningsPoints) {
                    values.push(d.half_score_normalised);
                }
                return values;
            }));
            min = d3.min(overs);
            max = d3.max(overs);

            // Account for padding
            var scale = d3.scale.linear()
                .domain([0, chart.dims.innerHeight])
                .range([0, max - min]);
            var padding = scale(chart.dims.padding.yAxis);
            min = Math.round(Math.max(min - padding, limitMin));
            max = Math.round(Math.min(max + padding, limitMax));

            // If one of the yBounds options is present, set that as the min value
            if (options.yBounds.length === 1) {
                min = options.yBounds[0];
            }

            return [min, max];
        }

        function padXScale(domain) {
            var min = domain[0], max = domain[1];
            var useDates = min instanceof Date;

            var scale = d3.scale.linear()
                .domain([0, chart.dims.innerWidth])
                .range([0, max - min]);
            var padding = scale(chart.dims.padding.xAxis);
            min = Math.round(+min - padding);
            max = Math.round(+max + padding);

            if (useDates) {
                min = new Date(min);
                max = new Date(max);
            }
            return [min, max];
        }

        /**
         * Draw all the data
         */
        chart.render = function () {
            hasRendered = true;

            var dims = chart.dims;
            var bits = chart.bits;
            var nodes = chart.nodes;

            // Update data with filters if needed
            var filtersKey = JSON.stringify(options.filters);
            if (filtersKey !== curFilters) {
                data = filterData();
                curFilters = filtersKey;
            }

            bits.yScale.domain(getOversDomain());
            var xDomain = options.xUseDates ?
                [new Date(data[0].date), new Date(data[data.length - 1].date)] :
                [0, data.length - 1];
            bits.xScale.domain(padXScale(xDomain));

            // Work out how many x axis ticks to show based on available width
            var xTicksCalculated = false;
            var xTickYears = 1;
            var xTickPadding = bits.xAxis.tickPadding();
            var xTickLabelWidth = 35; // Includes a little extra
            var xMaxTicks, xTickCount, xTotalWidth;

            while (!xTicksCalculated) {
                xMaxTicks = bits.xScale.ticks(d3.time.years, xTickYears);
                xTickCount = xMaxTicks.length;
                xTotalWidth = xTickCount * xTickLabelWidth + (xTickCount + 1) * xTickPadding;
                if (xTotalWidth > dims.innerWidth) {
                    xTickYears++;
                } else {
                    xTicksCalculated = true;
                }
            }
            bits.xAxis.ticks(d3.time.years, xTickYears);


            /*** Helpers ***/

            var dataId = bits.dataId = function (d) {
                return d.id;
            };
            var dataX = bits.dataX = function (d, i) {
                var value = options.xUseDates ? new Date(d.date) : i;
                return bits.xScale(value);
            };
            var dataY = bits.dataY = function (key) {
                return function (d) {
                    return bits.yScale(d[key]);
                };
            };
            var dataLine = bits.dataLine = function (key) {
                return d3.svg.breakableLine()
                    .x(dataX)
                    .y(dataY(key))
                    .broken(function (d) {
                        return d.reset_average;
                    });
            };


            /*** Draw pretty things ***/

            var transTime = 1000;

            // Axes, helper lines, etc.
            fitText(nodes.title, options.title, dims.width);
            nodes.xAxis.call(bits.xAxis);
            nodes.yAxis.call(bits.yAxis);
            nodes.over30line.translate(0, bits.yScale(30));
            nodes.over30text.translate(dims.innerWidth + 5, bits.yScale(30));

            // Highlight regions
            options.highlightRegions.forEach(function (d) {
                d.xStart = bits.xScale(new Date(d.start));
                d.xEnd = bits.xScale(new Date(d.end));
                d.xWidth = d.xEnd - d.xStart;
            });
            var colours = chart.colours();

            var highlights = nodes.highlights
                .selectAll('.region')
                .data(options.highlightRegions);
            highlights.enter()
                .append('g')
                .attr('class', 'region');
            highlights.exit()
                .remove();
            nodes.highlights.selectAll('.background, .title').remove();
            highlights.append('rect')
                .attr('class', 'background')
                .attr('x', function (d) { return d.xStart; })
                .attr('y', 0)
                .attr('height', dims.padding.top + dims.innerHeight)
                .attr('width', function (d) { return d.xWidth; })
                .style('fill', function (_, i) {
                    return colours(i);
                });
            highlights.append('text')
                .attr('class', 'title')
                .attr('text-anchor', 'middle')
                .attr('x', function (d) { return d.xStart + d.xWidth / 2; })
                .attr('y', dims.padding.top / 2)
                .attr('dy', '0.25em')
                .each(function (d) {
                    fitText(d3.select(this), d.name, d.xWidth);
                });

            // Dots for individual innings
            var inningsDots = nodes.inningsDots = nodes.dataGroupInnings
                .selectAll('.innings-mark')
                .data(options.showInningsPoints ? data : [], dataId);
            inningsDots.enter()
                .append('circle')
                .attr('class', 'innings-mark');
            inningsDots.exit()
                .transition(transTime)
                .style('opacity', 0)
                .remove();
            inningsDots
                .transition(transTime)
                .attr('r', 3)
                .attr('cx', dataX)
                .attr('cy', dataY('half_score_normalised'));

            // Line for overall average
            var lineAverage = dataLine('average');
            var avgPath = nodes.dataGroupAverage
                .selectAll('.line-average-all')
                .data([data]);
            avgPath.enter()
                .append('path')
                .attr('class', 'line-average line-average-all');
            avgPath
                .transition(transTime)
                .attr('d', lineAverage);

            // Line for rolling average
            var rollingAverage = dataLine('rolling_average');
            var rollPath = nodes.dataGroupRolling
                .selectAll('.line-average-rolling')
                .data(options.showRollingAverage ? [data] : []);
            rollPath.enter()
                .append('path')
                .attr('class', 'line-average line-average-rolling');
            rollPath.exit()
                .style('opacity', 1)
                .transition(transTime)
                .style('opacity', 0)
                .remove();
            rollPath
                .transition(transTime)
                .attr('d', rollingAverage);

            // Legend
            var legendData = [];
            if (options.showInningsPoints) {
                legendData.push({
                    key: 'innings',
                    type: 'circle',
                    name: 'Halfway marks for individual innings',
                });
            }
            legendData.push({
                key: 'average',
                type: 'path',
                name: 'Average halfway mark'
            });
            if (options.showRollingAverage) {
                legendData.push({
                    key: 'rolling-average',
                    type: 'path',
                    name: '100-innings rolling average'
                });
            }
            var legends = nodes.legendInner
                .selectAll('.legend-item')
                .data(legendData);
            legends.exit()
                .remove();

            var hackyWidthCounter = 0;
            var itemSpacing = 20;
            legends.enter()
                .append('g')
                .attr('class', function (d) { return 'legend-item legend-item-' + d.key; })
                .each(addLegend);
            legends
                .attr('transform', function (d) {
                    var x = hackyWidthCounter;
                    var w = d.totalWidth || parseFloat(d3.select(this).attr('total-width')) || 0;
                    hackyWidthCounter += w + itemSpacing;
                    return 'translate(' + x + ', 0)';
                });
            nodes.legendInner.translate(dims.innerWidth - hackyWidthCounter + itemSpacing, 0);
        };

        function addLegend(d) {
            var legendHeight = 19;
            var examplePadding = 7;
            var exampleWidth; // Filled later

            var elem = d3.select(this);
            var example = elem.append(d.type)
                .attr('class', 'legend-example');
            var text = elem.append('text')
                .attr('class', 'legend-name')
                .attr('y', legendHeight / 2)
                .attr('dy', '.35em')
                .text(d.name);

            if (d.type === 'circle') {
                exampleWidth = 8;
                example
                    .attr('r', exampleWidth / 2)
                    .attr('cx', exampleWidth / 2)
                    .attr('cy', legendHeight / 2);
            } else if (d.type === 'path') {
                exampleWidth = 12;
                example
                    .attr('d', legendPath())
                    .translate(0, (legendHeight - exampleWidth) / 2);
            }

            text.attr('x', exampleWidth + examplePadding);
            d.textWidth = text.node().getComputedTextLength();
            d.totalWidth = d.textWidth + exampleWidth + examplePadding;
            elem.attr('total-width', d.totalWidth);
        }

        function legendPath() {
            return [
                'M' + [0, 12],
                'L' + [
                    4, 4,
                    8, 8,
                    12, 0
                ]
            ].join('');
        }

        function fitText(selection, textVersions, maxWidth) {
            var magicNumberPadding = 20;
            var text = textVersions.long;
            selection.text(text);
            if (textVersions.short !== textVersions.long) {
                var width = selection.node().getComputedTextLength();
                if ((width + magicNumberPadding * 2) > maxWidth) {
                    selection.text(textVersions.short);
                }
            }
        }

        chart.colours = function () {
            var colours = ['#c5b0d5', '#f47e7c', '#bcbd22', '#9edae5', '#2ca02c'];
            // Set an explicit domain to work around a D3 bug with ordinal scales
            var domain = colours.map(function (_, i) { return i; });
            return d3.scale.ordinal()
                .domain(domain)
                .range(colours);
        };

        chart.hover = function (isHovering) {
            chart.nodes.hoverLine.classed('active', isHovering);
            chart.nodes.tooltip.classed('active', isHovering);
            if (!isHovering) {
                chart.nodes.dataGroupInnings.selectAll('.hovered')
                    .classed('hovered', false);
            }
            var padding = chart.dims.padding;

            var moveListener = function () {
                // Populate the tooltip
                var mouse = d3.mouse(chart.nodes.eventRect.node());
                var closestPoints = findClosestDataPoints(mouse[0]);
                var pointX = padding.left + chart.bits.xScale(new Date(closestPoints[0].date));
                fillTooltip(closestPoints);

                // Highlight hovered dots (if available)
                if (options.showInningsPoints) {
                    if (chart.hover.curDots) {
                        chart.hover.curDots.classed('hovered', false);
                    }
                    var ids = closestPoints.map(chart.bits.dataId);
                    var dots = chart.nodes.inningsDots.filter(function (d) {
                        return ids.indexOf(d.id) > -1;
                    });
                    dots.classed('hovered', true);
                    chart.hover.curDots = dots;
                }

                // Position the hover indicator
                chart.nodes.hoverLine.translate(pointX, padding.top);
            };
            chart.nodes.eventRect.on('mousemove', isHovering ? moveListener : null);
        };

        function findClosestDataPoints(x) {
            var dataValue = chart.bits.xScale.invert(x);
            var dist = Infinity;
            var points = [];
            for (var i = 0, ii = data.length; i < ii; i++) {
                var d = data[i];
                var value = options.xUseDates ? new Date(d.date) : i;
                var diff = Math.abs(value - dataValue);
                if (diff < dist) {
                    dist = diff;
                    points = [d];
                } else if (diff === dist) {
                    points.push(d);
                } else {
                    break;
                }
            }

            return points;
        }

        function strong(str) {
            return '<strong>' + str + '</strong>';
        }

        function overs(value) {
            var allBalls = value * 6;
            var overNum = Math.floor(value);
            var overBalls = Math.round(allBalls % 6);
            return [overNum, overBalls].join('.');
        }

        function oversText(value) {
            return overs(value) + ' overs';
        }

        function addDataPair(list, pair) {
            list.append('dt').text(pair[0]);
            list.append('dd').text(pair[1]);
        }

        function fillTooltip(points) {
            var cacheKey = points.map(function (d) { return d.id; }).join('|');
            if (fillTooltip.cacheKey === cacheKey) {
                return;
            }
            fillTooltip.cacheKey = cacheKey;

            // Add date to header
            var formatter = d3.time.format('%e %b %Y');
            chart.nodes.tooltipHeader.text(formatter(new Date(points[0].date)));

            // Add averages
            chart.nodes.tooltipContent.html('');
            var avgList = chart.nodes.tooltipContent.append('div')
                .attr('class', 'tooltip-averages')
                .append('dl');
            var lastPoint = points[points.length - 1];
            addDataPair(avgList, ['Overall average', oversText(lastPoint.average)]);
            if (options.showRollingAverage) {
                addDataPair(avgList, ['Rolling average', oversText(lastPoint.rolling_average)]);
            }

            // Build data lists
            var details = chart.nodes.tooltipContent
                .selectAll('.tooltip-innings-details').data(points, chart.bits.dataId);
            var newDetails = details.enter().append('div')
                .attr('class', 'tooltip-innings-details');
            newDetails.append('p').html(function (d) {
                var ordinal = d.inn === 't1' ? '1st' : '2nd';
                var lines = [
                    'Match #' + d.matchid + ', ' + ordinal + ' innings',
                    strong(d.team) + ' against ' + strong(d.other_team),
                    'at ' + strong(d.ground_name)
                ];
                return lines.join('<br>');
            });

            newDetails.append('dl').each(function (d) {
                var pairs = [
                    ['Total score', d.total_runs + '/' + d.total_wickets],
                    ['Half score at', d.half_score_at + ' overs'],
                ];
                var dl = d3.select(this);
                pairs.forEach(function (pair) {
                    addDataPair(dl, pair);
                });
            });
        }

        return chart;
    }
})();