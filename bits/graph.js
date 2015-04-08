(function () {
    var ODIGraph = window.ODIGraph = function (opts) {
        this.opts = opts;
        this.data = [];
    };

    var gproto = ODIGraph.prototype;

    gproto.init = function (data) {
        this.data = data;
        console.log('init graph', data.length);
    };

    gproto.render = function (elem) {
        var container = d3.select(elem).append('svg');
        // var graph = chartTemplate_ChartKit().data(this.data.slice(0, 10));
        // this.graph = chartTemplate_Custom(this.data.slice(0, 10));
        this.graph = chartTemplate_Custom(this.data);
        container.call(this.graph);
    };


    function chartTemplate_Custom(data) {
        return function chart(selection) {
            console.log(data, selection);

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
            var xKey = 'i';


            /*** Helpers ***/

            d3.selection.prototype.translate = function translate(x, y) {
                return this.attr('transform', 'translate(' + x + ',' + y + ')');
            };

            var dataId = function (d) {
                return d.id;
            };
            var dataX = function (d, i) {
                var value = xKey === 'i' ? i : d[xKey];
                return bits.xScale(value);
            };
            var dataY = function (key) {
                return function (d) {
                    return bits.yScale(d[key]);
                };
            };


            /*** Build components ***/

            var bits = {};
            bits.xScale = d3.scale.linear()
                .domain([0, data.length - 1])
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


            /*** Draw pretty things ***/

            // Container at half-pixel offset for crisper lines
            var root = selection.append('g')
                .translate(0.5, 0.5);

            // Axes
            root.append('g')
                .attr('class', 'axis-x')
                .translate(padding.left, height - padding.bottom)
                .call(bits.xAxis);
            root.append('g')
                .attr('class', 'axis-y')
                .translate(padding.left, padding.top)
                .call(bits.yAxis);

            // 30-over mark
            var over30 = root.append('g')
                .attr('class', 'over-30')
                .translate(padding.left, padding.top);
            over30.append('line')
                .attr('x', 0)
                .attr('y', 0)
                .attr('x2', innerWidth)
                .attr('y2', 0)
                .translate(0, bits.yScale(30))
            over30.append('text')
                .text('30 overs')
                .attr('y', 3)
                .translate(innerWidth + 5, bits.yScale(30))

            // Groups for showing data
            var dataGroup = root.append('g')
                .attr('class', 'data')
                .translate(padding.left, padding.top);
            var dgInnings = dataGroup.append('g').attr('class', 'data-innings');
            var dgAverage = dataGroup.append('g').attr('class', 'data-average');
            var dgRolling = dataGroup.append('g').attr('class', 'data-rolling-average');

            // Dots for individual innings
            dgInnings.selectAll('.innings-mark').data(data, dataId)
                .enter().append('circle')
                    .attr('class', 'innings-mark')
                    .attr('r', 3)
                    .attr('cx', dataX)
                    .attr('cy', dataY('half_score_normalised'));

            // Line for overall average
            var lineAverage = d3.svg.line()
                .x(dataX).y(dataY('average'));
            dgAverage.selectAll('path').data([data])
                .enter().append('path')
                    .attr('class', 'line-average line-average-all')
                    .attr('d', lineAverage);

            // Line for rolling average
            var rollingAverage = d3.svg.line()
                .x(dataX).y(dataY('rolling_average'));
            dgRolling.selectAll('path').data([data])
                .enter().append('path')
                    .attr('class', 'line-average line-average-rolling')
                    .attr('d', rollingAverage);
        };
    }


    function chartTemplate_ChartKit() {
        function chart(selection) {
            console.log(chart.data());
            var plot = chart.plot();
            plot.scale(plot, selection);

            var innings = plot(chart.inningsRenderer(), selection);
            innings.update.style('fill', '#090');
        }

        return ck.component(chart).props({
            data: [],
            plot: ck.plot().region(ck.region().xBand(0.9).left(50).right(50).top(50).bottom(50)),
            inningsRenderer: ck.circleRenderer()
                .delegateTo(chart, 'data')
                .dataKey('half_score_normalised')
                .r(5)
        });
    }
})();