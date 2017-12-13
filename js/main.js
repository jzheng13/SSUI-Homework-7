/*****************************************************************************
 *                                                                           *
 *         SSUI F17 Assignment 7 - Jia ZHENG (jzheng2@andrew.cmu.edu)        *          
 *                                                                           *
 *****************************************************************************/

// enable tooltips
$(function () {
    $('[data-toggle="tooltip"]').tooltip()
})

// police blotter stats map
var pol_blotter = d3.map();

// populate police blotter map
d3.csv("data/police_blotter.csv", function (error, data) {
    if (error) throw error;
    data.forEach(function (row) {
        var neighbourhood = row.INCIDENTNEIGHBORHOOD;
        if (pol_blotter.has(neighbourhood)) {
            pol_blotter.set(neighbourhood, pol_blotter.get(neighbourhood) + 1);
        } else {
            pol_blotter.set(neighbourhood, 1);
        }
    });
    //console.log(pol_blotter);
});

// pittsburgh map
var svg = d3.select("#pitt-map");
var width = 480, height = 300;
var zoomed = null;

// scale of incidents and position
var incidents = d3.scaleLinear()
    .domain([1, 10])
    .rangeRound([335, 470]);

// set colours
var colour = d3.scaleThreshold()
    .domain(d3.range(2, 10))
    .range(d3.schemeOrRd[9]);

// legend div
var legend = svg.append("g")
    .attr("id", "legend")
    .attr("transform", "translate(0, 20)");

// draw scale and colour
legend.selectAll("rect").data(colour.range().map(function (d) {
    d = colour.invertExtent(d);
    if (d[0] == null) {
        d[0] = incidents.domain()[0];
    }
    if (d[1] == null) {
        d[1] = incidents.domain()[1];
    }
    return d;
}))
    .enter().append("rect")
    .attr("height", 9)
    .attr("x", function (d) { return incidents(d[0]); })
    .attr("width", function (d) { return incidents(d[1]) - incidents(d[0]); })
    .attr("fill", function (d) { return colour(d[0]) });

// caption for scale
legend.append("text")
    .attr("class", "legend-caption")
    .attr("x", incidents.range()[0])
    .attr("y", -5)
    .attr("fill", "#000")
    .attr("font-size", "8")
    .attr("text-anchor", "start")
    .text("Number of crimes");

// label for scale
legend.call(d3.axisBottom(incidents)
    .tickSize(10)
    .tickFormat(function (incidents) { return (incidents - 1) * 10; })
    .tickValues(colour.domain()))
    .attr("font-size", "7")
    .select(".domain")
    .remove();

// project onto svg (centering at pittsburgh coords, scale, then transform)
var projection = d3.geoMercator()
    .center([-79.9959, 40.4406])
    .scale(95000)
    .translate([width/2, (height/2 + 20)]);

// neighbourhood outlines
var outline = d3.geoPath().projection(projection);

// container to keep neighbourhoods
var pitt_neighbourhoods = svg.append("g")
    .attr("id", "pitt-neighbourhoods");

// draw neighbourhoods
d3.json("data/pittsburgh_neighbourhoods.geojson", function (error, data) {
    if (error) throw error;
    pitt_neighbourhoods.selectAll("path")
        .data(data.features)
        .enter()
        .append("path")
        .attr("class", "neighbourhood")
        .attr("stroke", "white")
        .attr("stroke-width", 0.5)
        .attr("fill", function (d) {
            if (!pol_blotter.has(d.properties.neighborhoods)) {
                pol_blotter.set(d.properties.neighborhoods, 0);
            }
            return colour(pol_blotter.get(d.properties.neighborhoods) / 10 + 1);
        })
        .attr("data-toggle", "tooltip")
        .attr("title", function (d) { return d.properties.neighborhoods + ": " + pol_blotter.get(d.properties.neighborhoods); })
        .attr("d", outline)
        .on("click", zoom);
});

// zoom function
function zoom(n) {
    var x, y, k;

    console.log(n);

    if (n && zoomed !== n) {
        var centroid = outline.centroid(n);
        x = centroid[0];
        y = centroid[1];
        k = 4;
        zoomed = n;
    } else {
        x = width / 2;
        y = height / 2 + 20;
        k = 1;
        zoomed = null;
    }

    pitt_neighbourhoods.selectAll("path")
        .classed("active", zoomed && function (n) { return n === zoomed });

    pitt_neighbourhoods.transition()
        .duration(500)
        .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 20) + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
        .style("stroke-width", 2 / k + "px");
}