(function () {
    var stats = window.stats = {
        data: []
    };

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

    function unpack(data) {
        var ret = [];
        if (!data.length) {
            return ret;
        }
        var keys = data[0];
        var klen = keys.length;
        for (var r = 1, rlen = data.length; r < rlen; r++) {
            var row = data[r];
            var obj = {};
            for (var k = 0; k < klen; k++) {
                obj[keys[k]] = row[k];
            }
            ret.push(obj);
        }
        return ret;
    }

    function queue(context, callback) {
        if (stats.data.length) {
            callback.call(context);
        } else {
            queue._q.push([context, callback]);
        }
    }
    queue._q = [];

    function clearQueue() {
        console.log('clearQueue');
        for (var i = 0, ii = queue._q.length; i < ii; i++) {
            var bits = queue._q[i];
            bits[1].call(bits[0]);
            return;
        }
        queue._q = [];
    }


    d3.json('data/half-scores-packed.json', function (data) {
        stats.data = unpack(data);

        var avgAll = [];
        var avgRolling = new RollingAverage(100);

        stats.data.forEach(function (inn) {
            // Provide a unique ID for each innings
            inn.id = inn.matchid + '-' + inn.inn;
            // Calculate extra data
            inn.double_30_over_score = inn.score_30_overs * 2;
            inn.half_score_normalised = inn.half_score_overs + (inn.half_score_balls / 6);

            // Calculate averages
            avgAll.push(inn.half_score_normalised);
            inn.average = average(avgAll);

            avgRolling.push(inn.half_score_normalised);
            inn.rolling_average = average(avgRolling);
        });
        clearQueue();
    });


    /**
     * <odi-graph> custom element.
     * ___________________________
     *
     * Basic usage:
     *
     *   <odi-graph>Text description as a fallback</odi-graph>
     *
     * Attributes (all are optional):
     *
     *   <odi-graph rolling-avg>
     *     Include a rolling average line (off by default)
     *
     *   <odi-graph start="yyyy-mm-dd" end="yyyy-mm-dd">
     *     Specify start/end dates (inclusive)
     *
     *   <odi-graph filter="team=Australia;inn=t1">
     *     Specify data filters.
     *     Filters are separated by semi-colons and in the format "key=value"
     *
     *   <odi-graph highlight="World Cup 2015:yyyy-mm-dd,yyyy-mm-dd; name:start,end">
     *     Add labelled highlight regions with start and end dates (inclusive)
     *
     * ___________________________
     *
     * TODO:
     *
     * - Make rolling average optional
     * - Specify filters
     *     - Date ranges
     *     - 1st/2nd innings
     *     - Teams
     *     - Grounds
     * - Specify highlight regions
     */
    skate('odi-graph', {
        attached: function (elem) {
            // Move the descriptive text into a hidden span
            var desc = document.createElement('span');
            desc.className = 'description';
            desc.textContent = elem.textContent;
            elem.innerHTML = '';
            elem.appendChild(desc);
            console.log(elem, elem.innerHTML);

            // Create the graph
            elem.graph = new ODIGraph();
            queue(elem, function () {
                elem.graph.init(stats.data);
                elem.graph.render(elem);
            });
        }
    });
})();