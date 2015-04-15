(function () {
    var stats = window.stats = {
        data: []
    };

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
        for (var i = 0, ii = queue._q.length; i < ii; i++) {
            var bits = queue._q[i];
            bits[1].call(bits[0]);
        }
        queue._q = [];
    }


    d3.json('data/half-scores-packed.json', function (data) {
        stats.data = unpack(data);

        stats.data.forEach(function (inn) {
            // Provide a unique ID for each innings
            inn.id = inn.matchid + '-' + inn.inn;
            // Calculate extra data
            inn.double_30_over_score = inn.score_30_overs * 2;
            inn.half_score_normalised = inn.half_score_overs + (inn.half_score_balls / 6);
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
     *   <odi-graph rolling-avg="true">
     *     Include a rolling average line (off by default)
     *
     *   <odi-graph innings-points="false">
     *     Don't show data points for individual innings (on by default)
     *
     *   <odi-graph date-start="yyyy-mm-dd" date-end="yyyy-mm-dd">
     *     Specify start/end dates (inclusive)
     *
     *   <odi-graph filter="team=Australia;inn=t1">
     *     Specify data filters.
     *     Filters are separated by semi-colons and in the format "key=value"
     *
     *   <odi-graph highlight="World Cup 2015:yyyy-mm-dd,yyyy-mm-dd; name:start,end">
     *     Add labelled highlight regions with start and end dates (inclusive)
     */
    skate('odi-graph', {
        attached: function (elem) {
            // Move the descriptive text into a hidden span
            var desc = document.createElement('span');
            desc.className = 'description';
            desc.textContent = elem.textContent;
            elem.innerHTML = '';
            elem.appendChild(desc);

            // Create the graph
            elem.graph = new ODIGraph();
            queue(elem, function () {
                elem.graph
                    .init(stats.data, configMapper(elem))
                    .render(elem);
            });
        },
        attributes: {
            'rolling-avg': attrSetter,
            'innings-points': attrSetter,
            'date-start': attrSetter,
            'date-end': attrSetter,
            'filter': attrSetter,
            'highlight': attrSetter
        }
    });

    function configMapper(elem) {
        var config = {
            showRollingAverage: elem.rollingAvg === 'true',
            showInningsPoints: elem.inningsPoints !== 'false'
        };
        var filters = [];
        if (elem.dateStart) {
            filters.push({key: 'date/start', value: elem.dateStart});
        }
        if (elem.dateEnd) {
            filters.push({key: 'date/end', value: elem.dateEnd});
        }
        if (elem.filters) {
            filters = filters.concat(parseFilters(elem.filters));
        }
        config.filters = filters;
        if (elem.highlight) {
            config.highlights = parseHighlights(elem.highlight);
        }
        return config;
    }

    /**
     * Convert `filter` attribute strings into filter config objects
     * @param  {string} filterStr String from a `filter` attribute
     * @return {array}            List of valid filter objects with `key` and `value` properties
     * @example
     * Input:  "team=Australia;inn=t1"
     * Output: [{key: "team", value: "Australia"}, {key: "inn", value: "t1"}]
     */
    function parseFilters(filterStr) {
        var filters = filterStr.split(';').map(function (filter) {
            var parts = filter.split('=').map(function (s) { return s.trim(); });
            if (parts.length > 1) {
                return {key: parts[0], value: parts[1]};
            }
            return false;
        // Get rid of falsey values
        }).filter(function (f) {
            return !!f;
        });
        return filters;
    }

    /**
     * Convert `highlight` attribute strings into highlight config objects
     * @param  {string} highlightStr String from a `highlight` attribute
     * @return {array}               List of valid highlight objects with ??? properties
     * @example
     * Input:  "June 2014:2014-06-01,2014-06-30; ..."
     * Output: [{name: "June 2014", start: "2014-06-01", end: "2014-06-30"}, ...]
     */
    function parseHighlights(highlightStr) {
        var highlights = highlightStr.split(';').map(function (highlight) {
            var ret = {};
            var parts = highlight.split(':');
            if (parts.length > 1) {
                ret.name = parts[0].trim();
                var dates = parts[1].split(',').map(function (s) { return s.trim(); });
                if (dates.length) {
                    ret.start = dates[0];
                    if (dates.length > 1) {
                        ret.end = dates[1];
                    }
                }
                return ret;
            }
            return false;
        // Get rid of falsey values
        }).filter(function (f) {
            return !!f;
        });
        return highlights;
    }

    function attrSetter(elem, data) {
        if (data.newValue !== data.oldValue) {
            if (elem.graph && elem.graph.inited) {
                elem.graph.config(configMapper(elem));
            }
        }
    }
})();