/**
 * Chart Kit: https://bitbucket.org/dtang/chart-kit
 * Git hash 2bf8372 (2014-04-03)
 */

var ck = {};

ck.annotate = function(annotation, o) {
    o['__ck_' + annotation] = true;
    return o;
};

ck.isAnnotated = function(annotation, o) {
    return o != null && !!o['__ck_' + annotation];
};

ck.get = function(o, name) {
    var fn = o;
    if (name != null) {
        fn = function() {
            return o[name]();
        };
    }
    return ck.annotate('get', fn);
};

ck.doGet = function(value) {
    return ck.isAnnotated('get', value) ? value() : value;
};

ck.prop = function(value) {
    var defaultValue;
    var prop = ck.annotate('prop', function prop(newValue) {
        if (arguments.length) {
            value = newValue;
            return this;
        }
        return ck.doGet(value == null ? defaultValue : value);
    });
    prop.defaultTo = function(newDefaultValue) {
        defaultValue = newDefaultValue;
        return prop;
    };
    return prop;
};

ck.props = function(o, props) {
    // Assign props
    if (props) {
        for (var name in props) {
            o[name] = ck.isAnnotated('prop', props[name]) ?
                props[name] :
                ck.prop(props[name]);
        }
        return o;
    }

    // Return all props
    props = {};
    for (var key in o) {
        if (ck.isAnnotated('prop', o[key])) {
            props[key] = o[key]();
        }
    }
    return props;
};

ck.component = function(fn) {
    fn.props = function(o) {
        return ck.props(fn, o);
    };
    fn.delegateTo = function(delegatee) {
        var args = Array.prototype.slice.call(arguments, 1);
        if (!args.length)
            throw "No props were specified for delegation";
        args.forEach(function(propName) {
            if (!propName in fn)
                throw "The prop '" + propName + "' doesn't exist on the delegator";
            if (!ck.isAnnotated('prop', fn[propName]))
                throw "'" + propName + "' exists on the delegator but is not a prop";
            fn[propName](ck.get(function() {
                if (!propName in delegatee) {
                    throw "The prop '" + propName + "' doesn't exist on the delegatee";
                }
                return delegatee[propName]();
            }));
        });
        return fn;
    };
    fn.configure = function(callback) {
        callback.call(fn, fn);
        return fn;
    };
    return fn;
};
ck.barRenderer = function() {
    function barRenderer(selection) {
        var join = barRenderer.elementRenderer()(selection);
        var x = barRenderer.x();
        var barWidth = barRenderer.barWidth();
        var barHeight = barRenderer.barHeight();
        join.update.attr({
            x: function(d, i) {
                return x(d, i) - barWidth(d, i) / 2;
            },
            y: barRenderer.y(),
            width: barWidth,
            height: barRenderer.barHeight()
        });
        return join;
    }

    return ck.component(barRenderer).props({
        elementClass : null,
        data         : [],
        dataKey      : null,
        x            : ck.x(),
        y            : ck.y(),
        barWidth     : ck.xBand(),
        barHeight    : ck.yLength(),
        elementRenderer: ck.elementRenderer().elementTag('rect')
            .delegateTo(barRenderer, 'data', 'dataKey', 'elementClass')
    });
};

ck.borderLayout = function() {
    function borderLayout() {
        var north = borderLayout.north();
        var south = borderLayout.south();
        var east = borderLayout.east();
        var west = borderLayout.west();
        return {
            northPlot  : ck.plot().top(0).height(north).left(west).right(east),
            southPlot  : ck.plot().bottom(0).height(south).left(west).right(east),
            westPlot   : ck.plot().left(0).width(west).top(north).bottom(south),
            eastPlot   : ck.plot().right(0).width(east).top(north).bottom(south),
            centerPlot : ck.plot().top(north).bottom(south).left(west).right(east)
        };
    }

    return ck.component(borderLayout).props({
        north: 0,
        south: 0,
        west: 0,
        east: 0
    });
};
ck.circleRenderer = function() {
    function circleRenderer(selection) {
        var join = circleRenderer.elementRenderer()(selection);
        join.update.attr({
            cx: circleRenderer.cx(),
            cy: circleRenderer.cy(),
            r: circleRenderer.r()
        });
        return join;
    };

    return ck.component(circleRenderer).props({
        elementClass : null,
        data         : [],
        dataKey      : null,
        cx           : ck.x(),
        cy           : ck.y(),
        r            : ck.r(),
        elementRenderer: ck.elementRenderer()
            .delegateTo(circleRenderer, 'elementClass', 'data', 'dataKey')
            .elementTag('circle')
    });
};

ck.elementRenderer = function() {
    function elementRenderer(selection) {
        var join = elementRenderer.joiner()(selection);
        var enter = join.enter();
        var exit = join.exit();
        elementRenderer.adder()(enter);
        elementRenderer.remover()(exit);
        return {
            enter: enter,
            exit: exit,
            update: join
        };
    }
    return ck.component(elementRenderer).props({
        data: [],
        dataKey: null,
        elementTag: 'g',
        elementClass: null,
        joiner: function(selection) {
            return ck.selectChildren(selection, elementRenderer.elementTag(), elementRenderer.elementClass())
                .data(elementRenderer.data(), elementRenderer.dataKey());
        },
        adder: function(selection) {
            var elements = selection.append(elementRenderer.elementTag());
            if (elementRenderer.elementClass() != null) {
                elements.classed(elementRenderer.elementClass(), true);
            }
        },
        remover: function(selection) {
            selection.remove();
        }
    });
};

ck.group = function() {
    var groupClass = 'ck-group-' + ck.guid();

    function group(selection) {
        var g = selection.select('g.' + groupClass);
        g.data([group.data()])
            .enter().append('g').classed(groupClass, true)
            .exit().remove();
        return g;
    }

    return ck.component(group).props({
        data: null
    });
};
ck.lineRenderer = function() {
    function lineRenderer(selection) {
        var join = renderer(selection);
        var line = d3.svg.line()
            .x(lineRenderer.x())
            .y(lineRenderer.y());
        join.update.attr({
            d: line(lineRenderer.data()),
            stroke: 'black',
            fill: 'none'
        });
        return join;
    }

    var renderer = ck.elementRenderer().delegateTo(lineRenderer, 'elementClass', 'dataKey')
        .elementTag('path')
        .data(ck.get(function() {
            return [ lineRenderer.data() ];
        }));

    return ck.component(lineRenderer).props({
        elementClass : null,
        data         : [],
        dataKey      : null,
        x            : ck.x(),
        y            : ck.y()
    });
};

ck.plot = function() {
    function plot(renderer, selection) {
        return plot.scale(renderer, selection)(selection);
    }

    function getRenderableValues(renderer) {
        var renderableValues = [];
        var props = renderer.props();
        for (var key in props) {
            var value = props[key];
            if (value && value.value && value.scale && value.dimension) {
                renderableValues.push(value);
            }
        }
        return renderableValues;
    }

    plot.scale = function(renderer, selection) {
        var data = ck.firstNonNull(renderer.data && renderer.data(), []);
        var ranges = plot.region().data(data)(selection);
        getRenderableValues(renderer).forEach(function(renderableValue) {
            renderableValue.scale().domain(ck.autoDomain(renderableValue, data));
            var dimension = renderableValue.dimension();
            if (dimension) {
                var range = ranges[dimension + 'Range'];
                if (range) {
                    renderableValue.scale().range(range());
                }
            }
        });
        return renderer;
    };

    return ck.component(plot).props({
        region: ck.region()
    });
};

/**
 * A region defines a 2-dimensional space that can be drawn to.
 * Applying a region to either a selection or a container region
 * returns range functions that yield ranges for use in scales.
 */
ck.region = function() {
    // TODO Show helpful error message on NaNs

    function region(container) {
        return {
            xRange: function() {
                return xRange(container, region.xBand());
            },
            yRange: function() {
                return yRange(container, region.yBand()).reverse();
            },
            xLengthRange: function() {
                return xLengthRange(container);
            },
            yLengthRange: function() {
                return yLengthRange(container);
            },
            xBandRange: function() {
                var range = xLengthRange(container);
                var band = region.xBand();
                var dataLength = Math.max(1, region.data().length);
                range[1] = range[1] / dataLength * band;
                return range;
            },
            yBandRange: function() {
                var range = yLengthRange(container);
                var band = region.yBand();
                var dataLength = Math.max(1, region.data().length);
                range[1] = range[1] / dataLength * band;
                return range;
            }
        };
    }

    function range(start, relativeEnd, extent, band, getAvailable) {
        // TODO extent is the incorrect term to use here
        var absoluteEnd;
        if (start == null && relativeEnd == null) {
            start = 0;
        }
        // The only condition where available space doesn't need to be calculated
        if (extent != null && start != null ) {
            absoluteEnd = start + extent;
        } else {
            var available = getAvailable();
            absoluteEnd = available - ck.firstNonNull(relativeEnd, 0);
            if (start == null) {
                start = extent == null ? 0 : absoluteEnd - extent;
            }
        }
        // Adjust for banding
        if (band) {
            var dataLength = region.data().length;
            var adjustment = (absoluteEnd - start) / Math.max(1, dataLength) / 2;
            start += adjustment;
            absoluteEnd -= adjustment;
        }
        return [start, absoluteEnd];
    }

    function xRange(container, band) {
        return range(region.left(), region.right(), region.width(), band,
            ck.getAvailableWidth.bind(null, container));
    }

    function yRange(container, band) {
        return range(region.top(), region.bottom(), region.height(), band,
            ck.getAvailableHeight.bind(null, container));
    }

    function xLengthRange(container) {
        var range = xRange(container);
        return [0, range[1] - range[0]];
    }

    function yLengthRange(container) {
        var range = yRange(container);
        return [0, range[1] - range[0]];
    }

    return ck.component(region).props({
        data      : [],
        xBand     : 0,
        yBand     : 0,
        width     : null,
        height    : null,
        top       : null,
        left      : null,
        bottom    : null,
        right     : null
    });
};
ck.renderableValue = function() {
    function renderableValue(d, i) {
        var value = renderableValue.value();
        return renderableValue.scale()(value(d, i));
    }
    return ck.component(renderableValue).props({
        value: ck.identity,
        scale: d3.scale.linear(),
        dimension: null
    });
};

ck.x = function() {
    return ck.renderableValue().dimension('x')
        .value(function(d) {
            return ck.firstNonNull(d.x, d[0]);
        });
};

ck.y = function() {
    return ck.renderableValue().dimension('y')
        .value(function(d) {
            return ck.firstNonNull(d.y, d[1]);
        });
};

ck.r = function() {
    return ck.renderableValue().dimension('r')
        .value(function(d) {
            return ck.firstNonNull(d.r, d[2], 1);
        });
};

ck.xBand = function() {
    return ck.renderableValue().dimension('xBand')
        .value(ck.constant(1));
};

ck.yBand = function() {
    return ck.renderableValue().dimension('yBand')
        .value(ck.constant(1));
};

ck.xLength = function() {
    return ck.renderableValue().dimension('xLength')
        .value(function(d) {
            return ck.firstNonNull(d.width, d.x, d[0]);
        });
};

ck.yLength = function() {
    return ck.renderableValue().dimension('yLength')
        .value(function(d) {
            return ck.firstNonNull(d.height, d.y, d[1]);
        });
};
ck.singletonRenderer = function() {
    function singletonRenderer(selection) {
        return ck.renderer()
            .elementTag(singletonRenderer.elementTag())
            .elementClass(singletonRenderer.elementClass())
            .data([0])(selection);
    }
    return ck.component(singletonRenderer).props({
        elementTag: 'g'
    });
};

ck.identity = function(d) { return d; };

ck.index = function(d, i) { return i; };

ck.constant = function(c) {
    return function() { return c; };
};

ck.guid = (function() {
    var guid = 0;
    return function guid() {
        return guid++;
    };
})();

ck.firstNonNull = function(/* args */) {
    var first = null;
    Array.prototype.some.call(arguments, function(arg) {
        if (arg != null) {
            first = arg;
            return true;
        }
    });
    return first;
};

ck.autoDomain = function(renderableValue, data) {
    var value = renderableValue.value();
    var domain;
    if (typeof value === 'function') {
        domain = data.length ? [d3.min(data, value), d3.max(data, value)] : [0, 1];
        if (domain[0] === domain[1]) {
            domain[0] = 0;
        }
    } else {
        domain = [0, value];
    }
    return domain;
};

ck.getWidth = function(selection) {
    var width = parseInt(selection.style('width'), 10);
    if (isNaN(width)) {
        var node = selection.node();
        width = node.getBBox ? node.getBBox().width : 0;
    }
    return width;
};

ck.getHeight = function(selection) {
    var height = parseInt(selection.style('height'), 10);
    if (isNaN(height)) {
        var node = selection.node();
        height = node.getBBox ? node.getBBox().height : 0;
    }
    return height;
};

ck.svgContainer = function(selection) {
    var node = selection.node();
    while (node && node.tagName !== 'svg') {
        node = node.parentNode;
    }
    return node ? d3.select(node) : null;
};

ck.getAvailableWidth = function(selection) {
    var width = parseInt(ck.svgContainer(selection).style('width'), 10);
    return width || 0;
};

ck.getAvailableHeight = function(selection) {
    var height = parseInt(ck.svgContainer(selection).style('height'), 10);
    return height || 0;
};

ck.selectChildren = function(selection, elementTag, elementClass) {
    var containerNode = selection.node();
    var selector = elementClass ? elementTag + '.' + elementClass : elementTag;
    return selection.selectAll(selector).filter(function() {
        return this.parentNode === containerNode;
    });
};