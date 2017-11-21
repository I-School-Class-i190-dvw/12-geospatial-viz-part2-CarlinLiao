// dictate width and height of svg
var width = Math.max(960, window.innerWidth),
    height = Math.max(500, window.innerHeight);

// useful for polar coordinates
var pi = Math.PI,
    tau = 2*pi; 

// how do we want our maps to display?
var projection = d3.geoMercator()
    .scale(1/tau)
    .translate([0,0]); // set default map projection setting

// use geomercator projection when drawing path
var path = d3.geoPath()
    .projection(projection);

// create the tile we're drawing in
var tile = d3.tile()
    .size([width, height]);

// what happens when you zoom?
var zoom = d3.zoom()
    .scaleExtent([
        1 << 11,
        1 << 24
    ])
    .on('zoom', zoomed) // zoom event

// scale the circles representing our earthquakes wrt their magnitude
var radius = d3.scaleSqrt()
    .range([0, 10])

// add our svg element to the page
var svg = d3.select('body')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

// block to put our basemap images in
var raster = svg.append('g');

// create our drawing
// var vector = svg.append('path');
var vector = svg.selectAll('path');

// asynchronous load
d3.json('data/earthquakes_4326_cali.geojson', function(error, geojson) {
    if (error) throw error;

    console.log(geojson);

    // scale radius 
    radius.domain([0, d3.max(geojson.features, function(d) {
        return d.properties.mag;
    })]);

    // set radii to magnitued (scaled)
    path.pointRadius(function(d) {
        return radius(d.properties.mag);
    })

    // bind our data to the vector
    vector = vector
        // .datum(geojson);
        .data(geojson.features)
        .enter().append('path')
            .attr('d', path)
            .on('mouseover', function(d) { console.log(d); })

    // chris's best guess for the center of CA
    var center = projection([-119.665, 37.414]);

    // dictate what to call zoom on and movement during zoom call
    svg.call(zoom)
        .call(
            zoom.transform,
            d3.zoomIdentity
                .translate(width/2, height/2)
                .scale(1 << 14)
                .translate(-center[0],-center[1])
        );
});

// this gets called on a zoom event
function zoomed() {
    var transform = d3.event.transform;

    // invoke the tile function after giving it attributes
    var tiles = tile
        .scale(transform.k)
        .translate([transform.x, transform.y])
        (); 

    // console.log(transform.x, transform.y, transform.k);

    // adjust projection to zoom level
    projection
        .scale(transform.k / tau)
        .translate([transform.x, transform.y]);
    
    // redraw vector
    vector
        .attr('d', path);

    // d3 update pattern
    var image = raster
        .attr('transform', stringify(tiles.scale, tiles.translate))
        .selectAll('image')
        .data(tiles, function(d) { return d; });

    // remove old group elements
    image.exit().remove();

    // choose which map tile image to load in
    image.enter().append('image')
        .attr('xlink:href', function(d) {
            return 'http://' 
                + 'abc'[d[1] % 3] // selects which tile to render based on data ID
                + '.basemaps.cartocdn.com/rastertiles/voyager/' 
                + d[2]
                + '/'
                + d[0]
                + '/'
                + d[1]
                + '.png';
        })
        .attr('x', function(d) { return d[0]*256; })
        .attr('y', function(d) { return d[1]*256; })
        .attr('width', 256)
        .attr('height', 256);
} // end of zoomed() def

// turn scale into an interprable string for our transform attribute call
function stringify(scale, translate) {
    var k = scale / 256,
        r = scale % 1 ? Number : Math.round;
    return `translate(${r(translate[0]*scale)}, ${r(translate[1] * scale)}) scale(${k})`;
}