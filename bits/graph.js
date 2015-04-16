(function () {

    /*** D3 extensions ***/


    d3.selection.prototype.translate = function translate(x, y) {
        return this.attr('transform', 'translate(' + x + ',' + y + ')');
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

    /**
     * TODO:
     *
     * - Title
     * - Legend with toggleable data points
     * - Highlight regions
     * - Highlight stddev for averages
     * - Hover on rolling average highlights points/window for previous 100 matches
     */
    function chartTemplate(rawData) {
        var options = {
            xUseDates: true,
            showRollingAverage: false,
            showInningsPoints: true,
            yBounds: [],
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
                top: 10,
                left: 30,
                right: 60,
                bottom: 70,
                yAxis: 20
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

            // Axes
            nodes.xAxis = nodes.root.append('g')
                .attr('class', 'axis-x');
            nodes.yAxis = nodes.root.append('g')
                .attr('class', 'axis-y');

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
            nodes.dataGroupAll = nodes.root.append('g')
                .attr('class', 'data');
            nodes.dataGroupInnings = nodes.dataGroupAll.append('g').attr('class', 'data-innings');
            nodes.dataGroupAverage = nodes.dataGroupAll.append('g').attr('class', 'data-average');
            nodes.dataGroupRolling = nodes.dataGroupAll.append('g').attr('class', 'data-rolling-average');

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

        chart.resize = function () {
            var bits = chart.bits;
            var nodes = chart.nodes;
            var dims = chart.dims;
            var padding = dims.padding;

            bits.xScale.range([0, dims.innerWidth]);
            bits.yScale.range([dims.innerHeight, 0]);

            nodes.xAxis.translate(padding.left, dims.height - padding.bottom);
            nodes.yAxis.translate(padding.left, padding.top);
            nodes.over30.translate(padding.left, padding.top);
            nodes.over30line.attr('x2', dims.innerWidth);
            nodes.dataGroupAll.translate(padding.left, padding.top);
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
            var dateStart, dateEnd;
            var hasDateFilters = false;
            var nonDateFilters = [];
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
            var avgAll = [];
            var avgRolling = new RollingAverage(100);
            newData.forEach(function (inn) {
                avgAll.push(inn.half_score_normalised);
                inn.average = average(avgAll);

                avgRolling.push(inn.half_score_normalised);
                inn.rolling_average = average(avgRolling);
            });

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

        chart.render = function () {
            hasRendered = true;

            var bits = chart.bits;
            var nodes = chart.nodes;

            // Update data with filters if needed
            var filtersKey = JSON.stringify(options.filters);
            if (filtersKey !== curFilters) {
                data = filterData();
                curFilters = filtersKey;
            }

            bits.yScale.domain(getOversDomain());
            if (options.xUseDates) {
                bits.xScale.domain([new Date(data[0].date), new Date(data[data.length - 1].date)]);
            } else {
                bits.xScale.domain([0, data.length - 1]);
            }


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


            /*** Draw pretty things ***/

            var transTime = 1000;

            // Axes, helper lines, etc.
            nodes.xAxis.call(bits.xAxis);
            nodes.yAxis.call(bits.yAxis);
            nodes.over30line.translate(0, bits.yScale(30));
            nodes.over30text.translate(chart.dims.innerWidth + 5, bits.yScale(30));

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
            var lineAverage = d3.svg.line()
                .x(dataX).y(dataY('average'));
            var avgPath = nodes.dataGroupAverage
                .selectAll('path')
                .data([data]);
            avgPath.enter()
                .append('path')
                .attr('class', 'line-average line-average-all');
            avgPath
                .transition(transTime)
                .attr('d', lineAverage);

            // Line for rolling average
            var rollingAverage = d3.svg.line()
                .x(dataX).y(dataY('rolling_average'));
            var rollPath = nodes.dataGroupRolling
                .selectAll('path')
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