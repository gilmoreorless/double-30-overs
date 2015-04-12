(function () {

    /*** D3 extensions ***/


    d3.selection.prototype.translate = function translate(x, y) {
        return this.attr('transform', 'translate(' + x + ',' + y + ')');
    };



    /*** ODIGraph ***/


    var ODIGraph = window.ODIGraph = function (opts) {
        this.opts = opts;
        this.data = [];
    };

    var gproto = ODIGraph.prototype;

    gproto.init = function (data, config) {
        this.data = data;
        console.log('init graph', data.length);
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
        var container = d3.select(elem).append('svg');
        container.call(this.graph);
        return this;
    };


    /**
     * TODO:
     *
     * - Auto-calculate y-axis domain
     * - Show vertical line on hover
     * - Show data details on hover
     * - Legend with toggleable data points
     * - Filtering
     * - Highlight regions
     * - Highlight stddev for averages
     * - Hover on rolling average highlights points/window for previous 100 matches
     * - Toggle between raw and rounded-to-balls values for averages
     * - Allow dynamic updates
     */
    function chartTemplate(data) {
        var options = {
            xUseDates: true,
            showRollingAverage: false
        };

        var hasRendered = false;

        function chart(selection) {
            console.log(data, selection);
            var bits = chart.bits = {};
            var nodes = chart.nodes = {};

            /*** Calculate parameters ***/

            var padding = {
                top: 10,
                left: 30,
                right: 60,
                bottom: 20
            };
            var width = parseFloat(selection.style('width')) || 0;
            var height = parseFloat(selection.style('height')) || 0;
            var innerWidth = width - padding.left - padding.right;
            var innerHeight = height - padding.top - padding.bottom;


            /*** Build components ***/

            bits.xScale = d3.time.scale()
                .domain([new Date(data[0].date), new Date(data[data.length - 1].date)])
                .range([0, innerWidth]);
            bits.xAxis = d3.svg.axis()
                .scale(bits.xScale)
                .orient('bottom');

            bits.yScale = d3.scale.linear()
                .domain([10, 50])
                .range([innerHeight, 0]);
            bits.yAxis = d3.svg.axis()
                .scale(bits.yScale)
                .orient('left');


            /*** Draw basic things ***/

            // Container at half-pixel offset for crisper lines
            nodes.root = selection.append('g')
                .translate(0.5, 0.5);

            // Axes
            nodes.xAxis = nodes.root.append('g')
                .attr('class', 'axis-x')
                .translate(padding.left, height - padding.bottom)
                .call(bits.xAxis);
            nodes.yAxis = nodes.root.append('g')
                .attr('class', 'axis-y')
                .translate(padding.left, padding.top)
                .call(bits.yAxis);

            // 30-over mark
            nodes.over30 = nodes.root.append('g')
                .attr('class', 'over-30')
                .translate(padding.left, padding.top);
            nodes.over30.append('line')
                .attr('x', 0)
                .attr('y', 0)
                .attr('x2', innerWidth)
                .attr('y2', 0)
                .translate(0, bits.yScale(30));
            nodes.over30.append('text')
                .text('30 overs')
                .attr('y', 3)
                .translate(innerWidth + 5, bits.yScale(30));

            // Groups for showing data
            nodes.dataGroupAll = nodes.root.append('g')
                .attr('class', 'data')
                .translate(padding.left, padding.top);
            nodes.dataGroupInnings = nodes.dataGroupAll.append('g').attr('class', 'data-innings');
            nodes.dataGroupAverage = nodes.dataGroupAll.append('g').attr('class', 'data-average');
            nodes.dataGroupRolling = nodes.dataGroupAll.append('g').attr('class', 'data-rolling-average');

            chart.render();
        }

        chart.render = function () {
            hasRendered = true;

            var bits = chart.bits;
            var nodes = chart.nodes;

            if (options.xUseDates) {
                bits.xScale.domain([new Date(data[0].date), new Date(data[data.length - 1].date)]);
            } else {
                bits.xScale.domain([0, data.length - 1]);
            }


            /*** Helpers ***/

            var dataId = function (d) {
                return d.id;
            };
            var dataX = function (d, i) {
                var value = options.xUseDates ? new Date(d.date) : i;
                return bits.xScale(value);
            };
            var dataY = function (key) {
                return function (d) {
                    return bits.yScale(d[key]);
                };
            };



            /*** Draw pretty things ***/

            var transTime = 1000;

            // Dots for individual innings
            var inningsDots = nodes.dataGroupInnings
                .selectAll('.innings-mark')
                .data(data, dataId);
            inningsDots.enter()
                .append('circle')
                .attr('class', 'innings-mark');
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
            if (hasRendered) {
                chart.render();
            }
        };

        return chart;
    }
})();