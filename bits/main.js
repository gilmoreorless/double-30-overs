(function () {
    var stats = {
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
        console.log('clearQueue');
        for (var i = 0, ii = queue._q.length; i < ii; i++) {
            var bits = queue._q[i];
            bits[1].call(bits[0]);
        }
        queue._q = [];
    }


    d3.json('data/half-scores-packed.json', function (data) {
        stats.data = unpack(data);
        clearQueue();
    });

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
            });
        }
    });
})();