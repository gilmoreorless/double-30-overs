(function () {

    /*** Data handling ***/


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

    function cloneData(data) {
        return data.map(function (d) {
            var obj = {};
            for (var key in d) {
                obj[key] = d[key];
            }
            return obj;
        });
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


    /*** Element visibility checking ***/


    function checkVisibility(elem) {
        return verge.inY(elem, 200);
    }

    function callIfVisible(elem, callback) {
        var isVisible = checkVisibility(elem);
        if (isVisible) {
            callback.call(elem);
        }
        return isVisible;
    }

    /**
     * Fire a callback whenever an element becomes visible in the viewport
     */
    function whenVisible(elem, callback) {
        elem.__visCheck = debounce(function visCheck() {
            callIfVisible(elem, callback);
        }, 100);
        window.addEventListener('resize', elem.__visCheck, false);
        window.addEventListener('scroll', elem.__visCheck, false);
        elem.__visCheck();
    }

    /**
     * Fire a callback the first time an element becomes visible in the viewport
     */
    function onceVisible(elem, callback) {
        whenVisible(elem, function forgetVisibility() {
            if (elem.__visCheck) {
                window.removeEventListener('resize', elem.__visCheck, false);
                window.removeEventListener('scroll', elem.__visCheck, false);
                delete elem.__visCheck;
            }
            callback.call(elem);
        });
    }


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
     *   <odi-graph graph-title="This is a graph">
     *     Add a title to the graph
     *
     *   <odi-graph rolling-average="true">
     *     Include a rolling average line (off by default)
     *
     *   <odi-graph innings-points="false">
     *     Don't show data points for individual innings (on by default)
     *
     *   <odi-graph ybounds="15,45">
     *     Force y axis to have these bounds (in overs)
     *
     *   <odi-graph date-start="yyyy-mm-dd" date-end="yyyy-mm-dd">
     *     Specify start/end dates (inclusive)
     *
     *   <odi-graph filter="team=(Australia,England);inn=t1;ground_name=!Melbourne">
     *     Specify data filters.
     *     Filters are separated by semi-colons and in the format "key=value" for simple matching,
     *     or "key=(value1,value2)" for matching a list of values.
     *     Prefix a value with "!" to negate the match - e.g. "key1=!(val1,val2);key2=!val3"
     *
     *   <odi-graph highlight="World Cup 2015:yyyy-mm-dd,yyyy-mm-dd; name:start,end">
     *     Add labelled highlight regions with start and end dates (inclusive)
     *
     *   <odi-graph highlight="..." reset-highlight-averages="true">
     *     Reset averages at highlighted area boundaries
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
                elem.graph.init(cloneData(stats.data), configMapper(elem));
                onceVisible(elem, function () {
                    elem.graph.render(elem);
                });
            });
        },
        attributes: {
            'graph-title': attrSetter,
            'rolling-average': attrSetter,
            'innings-points': attrSetter,
            'ybounds': attrSetter,
            'date-start': attrSetter,
            'date-end': attrSetter,
            'filter': attrSetter,
            'highlight': attrSetter,
            'reset-highlight-averages': attrSetter
        }
    });

    function configMapper(elem) {
        var config = {
            title: elem.graphTitle || '',
            showRollingAverage: elem.rollingAverage === 'true',
            showInningsPoints: elem.inningsPoints !== 'false',
            resetHighlightAverages: elem.resetHighlightAverages === 'true'
        };
        if (elem.ybounds) {
            config.yBounds = parseBounds(elem.ybounds);
        }
        var filters = [];
        if (elem.dateStart) {
            filters.push({key: 'date/start', value: elem.dateStart});
        }
        if (elem.dateEnd) {
            filters.push({key: 'date/end', value: elem.dateEnd});
        }
        if (elem.filter) {
            filters = filters.concat(parseFilters(elem.filter));
        }
        config.filters = filters;
        if (elem.highlight) {
            config.highlightRegions = parseHighlights(elem.highlight);
        }
        return config;
    }

    /**
     * Convert `ybounds` attribute strings into bounds config objects
     * @param  {string} boundsStr String from a `ybounds` attribute
     * @return {array}            List of bounds in [min, max] format
     */
    function parseBounds(boundsStr) {
        var bounds = boundsStr
            .split(',')
            .slice(0, 2)
            .map(function (b) {
                return parseFloat(b) || 0;
            });
        bounds.sort();
        return bounds;
    }

    /**
     * Convert `filter` attribute strings into filter config objects
     * @param  {string} filterStr String from a `filter` attribute
     * @return {array}            List of valid filter objects with `key` and a value property, either:
     *                                `value` for a single string value, or
     *                                `values` for a list of string values
     * @example
     * Input:  "team=(Australia,England);inn=!t1"
     * Output: [{key: "team", values: ["Australia", "England"]}, {key: "inn", value: "t1", negate: true}]
     */
    function parseFilters(filterStr) {
        var reMultiValues = /^\(.*?\)$/;
        var trimmer = function (s) {
            return s.trim();
        };
        var filters = filterStr.split(';').map(function (filter) {
            var parts = filter.split('=').map(trimmer);
            if (parts.length > 1) {
                var obj = {key: parts[0]};
                var value = parts[1];
                if (value[0] === '!') {
                    obj.negate = true;
                    value = value.slice(1);
                }
                if (reMultiValues.test(value)) {
                    obj.values = value.slice(1, -1).split(',').map(trimmer);
                } else {
                    obj.value = value;
                }
                return obj;
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