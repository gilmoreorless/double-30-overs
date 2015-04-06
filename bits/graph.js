(function () {
    var ODIGraph = window.ODIGraph = function (opts) {
        this.opts = opts;
    };

    var gproto = ODIGraph.prototype;

    gproto.init = function (data) {
        console.log('init graph', data.length);
    };
})();