$( document ).ready(function() {
    // Check my script has loaded
    console.log("Hello from script.js");

    function drawMap() {
        // Load my map using Leaflet
        var mymap = L.map('mapid').setView([40.696,-73.989], 14);

        // add a tile layer to it using Open Street Map provided tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        }).addTo(mymap);

        return mymap;
    }

    let currentSelectedFeature;
    let currentSelectedFilter;
    /// We'll use this to define the behavior we'd like for each feature on our map
    function onEachFeature(feature, layer) {
        // does this feature have a property named popupContent?
        if (feature.properties) {
            if (currentSelectedFeature) {
               currentSelectedFeature.resetStyle();
            }

            // what do we want to happen when we click our layer
            layer.on('click', function(e) {
                if (currentSelectedFeature) {
                    currentSelectedFeature.setStyle({color: '#3388ff', fillColor: '#3388ff'})
                }
                showLandmarkDisplayCard(feature.properties);
                layer.setStyle({color:'red', fillColor:'yellow'});
                currentSelectedFeature = layer;
            });
        }
    }

    function resetCurrentSelectedFilter() {
        if (currentSelectedFilter) {
            currentSelectedFilter.css('background', '')
            currentSelectedFilter.css('color', '')
            currentSelectedFilter = null;
        }
    }

    function makeArchStyleFilterButtons(architectureStyles) {
        return architectureStyles.map(function (style) {
            const styleValue = style.style_prim;
            const mapButton = $(`<button class="map-filter primary-style">${styleValue}</button>`);

            mapButton.click((e) => {
                clearLandmarkCard();
                resetCurrentSelectedFilter();
                mapButton.css('background', 'lightblue');
                mapButton.css('color', 'black');
                currentSelectedFilter = mapButton;
                currentSelectedFeature = null;
                propertyLayer.clearLayers();
                fetchLandmarksWithFilter(styleValue, "style_prim").then(function (data) {
                    propertyLayer.addData(data).addTo(mymap);
                });
                fetchOverviewByField("style_prim", styleValue).then(function(data){
                    showOverviewOnLandmarkDisplayCard(data, styleValue);
                });
            });

            return mapButton;
        });
    }

    function makeDistrictFilterButtons(districts) {
        return districts.map(function (district) {
            const districtValue = district.hist_dist;
            const mapButton = $(`<button class="map-filter district">${districtValue}</button>`);

            mapButton.click((e) => {
                clearLandmarkCard();
                resetCurrentSelectedFilter();
                mapButton.css('background', 'salmon');
                mapButton.css('color', 'black');
                currentSelectedFilter = mapButton;
                currentSelectedFeature = null;
                propertyLayer.clearLayers();
                fetchLandmarksWithFilter(districtValue, "hist_dist").then(function (data) {
                    propertyLayer.addData(data).addTo(mymap);
                });
                fetchOverviewByField("hist_dist", districtValue).then(function(data){
                    showOverviewOnLandmarkDisplayCard(data, districtValue);
                });
            });

            return mapButton;
        });
    }

    function clearLandmarkCard() {
        $("#landmark-info-container").empty();
    }

    function getBoroughName(code) {
        const boroughDictionary = {
            "BK": "Brooklyn",
            "SI": "Staten Island",
            "QN": "Queens",
            "MN": "Manhattan",
            "BX": "Bronx"
        };

        return code ? boroughDictionary[code.toUpperCase()]: "NYC"
    }
    

    function showLandmarkDisplayCard(landmarkData) {

        /** let's now build up the html markup for our card with jQuery, it'll look something like:
            <div class='landmark-info-card'>
                <div class="detail">123 Brooklyn, NYC</div>
                <div class="detail">Historic District: Cobble Hill District</div>
                <div class="detail">Cobble Hill Waldorf</div>
                <div class="detail">Primary Style: Neo-Roman</div>
                ....

                <button> See Complaints</button>
                <button> See Violations</button>
                <ul class="complaint-list"></ul>
                <ul class="violation-list"></ul>
            </div>
        **/

        function showComplaintButton() {
            // Let's make a button for complaints
            const complaintButton = $('<button>See Complaints</button>');
            complaintButton.click(() => { 
                fetchLandmarkComplaints(bin).then((complaints) => {
                    $('.complaints-list').remove();
                    const complaintSection = $("<ul class='complaints-list'><h3>Complaints</h3></ul>");
                    if (complaints.length > 0) {
                        const complaintList = complaints.map((complaint) => {
                            const {date, work_reported} = complaint;
                            return $(`<li><div>Complaint Date: ${date}</div><div>Work Reported: ${work_reported}</div></li>`)
                        });
                        complaintSection.append(complaintList);
                    } else {
                        complaintSection.append('<p>No complaints in dataset</p>')
                    }
                    landmarkCardDiv.append(complaintSection);
                });
            });
            // add it to our landmark card div
            landmarkCardDiv.append(complaintButton);
        }

        function showViolationButton() {
            // lets make a button for violations
            const violationButton = $('<button>See Violations</button>');
            violationButton.click(() => { 
                fetchLandmarkViolations(bin).then((violations) => {
                    $('.violations-list').remove();
                    const violationSection = $("<ul class='violations-list'><h3>Violations</h3></ul>")
                    if (violations.length > 0) {
                        const violationList = violations.map((violation) => {
                            const {vio_date, violation_class} = violation;
                            return $(`<li><div>Violation Date: ${vio_date}</div><div>Violation Class: ${violation_class}</div></li>`)
                        });
                        violationSection.append(violationList);
                    } else {
                        violationSection.append("<p>No violations in dataset</p>")
                    }
                    landmarkCardDiv.append(violationSection);
                });
            });
            // add it to our landmark card div
            landmarkCardDiv.append(violationButton);
        }

        // Lets clear the existing card
        clearLandmarkCard();

        // grab the variables we care about
        const { bin, bbl, borough, zip_code, address, owner_name, 
                num_floors,year_build, arch_build, style_prim, mat_prim, 
                use_orig, use_other, build_type,  build_nme, hist_dist, era } = landmarkData;

        const landmarkCardDiv = $("<div class='landmark-info-card'></div>");
        landmarkCardDiv.append(`<h3>${address}, ${getBoroughName(borough)}, NYC ${zip_code}</h3>`);
        if (hist_dist != '0') { landmarkCardDiv.append(`<div class="detail">Historic District: ${hist_dist}</div>`); };
        if (build_nme != '0') { landmarkCardDiv.append(`<div class="detail">${build_nme}</div>`); }
        landmarkCardDiv.append(`<div class="detail">Primary Style: ${style_prim}</div>`);
        landmarkCardDiv.append(`<div class="detail">Era: ${era}</div>`);
        landmarkCardDiv.append(`<div class="detail">Year Built: ${year_build}</div>`);
        landmarkCardDiv.append(`<div class="detail">Primary Style: ${style_prim}</div>`);
        landmarkCardDiv.append(`<div class="detail">Primary Material: ${mat_prim}</div>`);
        landmarkCardDiv.append(`<div class="detail">Building Type: ${build_type}</div>`);
        landmarkCardDiv.append(`<div class="detail">See it on Google: <a target="_blank" href="https://www.google.com/maps/place/${address}, ${getBoroughName(borough)}, NYC ${zip_code}">here!</a></div>`);

        showComplaintButton();
        showViolationButton();

        $('#landmark-info-container').append(landmarkCardDiv);
    }

    function showOverviewOnLandmarkDisplayCard(data, title) {
        $('#landmark-info-container').empty();
        const overviewList = $(`<ul class='overview-list'><h2>${title}</h2></ul>`)
        const overviewItems = Object.keys(data[0]).map(function(key) {
            const field = key;
            const value = data[0][key];
            return $(`<li>${field} - ${value}</li>`);
        });
        overviewList.append(overviewItems);
        $('#landmark-info-container').append(overviewList);

    }


    /***************
    EDIT CODE HERE
    ***************/

    async function fetchLandmarks() {
      let response = await fetch(`https://data.cityofnewyork.us/resource/x3ar-yjn2.geojson?$LIMIT=5000`);
      let data = await response.json();
      return data;
    }

    async function fetchLandmarksWithFilter(filterValue, filterType) {
      let response = await fetch(`https://data.cityofnewyork.us/resource/x3ar-yjn2.geojson?$WHERE=${filterType}='${filterValue}'&$LIMIT=5000`);
      let data = await response.json();
      return data;
    }

    async function fetchPrimaryStyles() {
        let response = await fetch(`https://data.cityofnewyork.us/resource/x3ar-yjn2.json?$SELECT=style_prim, count(style_prim) as count_of_landmarks&$GROUP=style_prim&$ORDER=count_of_landmarks DESC&$LIMIT=20`);
        let data = await response.json();
        return data;
    }

    async function fetchHistoricDistricts() {
        let response = await fetch(`https://data.cityofnewyork.us/resource/x3ar-yjn2.json?$SELECT=hist_dist, count(hist_dist) as count_of_landmarks&$GROUP=hist_dist&$ORDER=count_of_landmarks DESC&$LIMIT=20`);
        let data = await response.json();
        return data;
    }

    async function fetchLandmarkViolations(bin) {
        let response = await fetch(`https://data.cityofnewyork.us/resource/wycc-5aqt.json?bin=${bin}`);
        let data = await response.json();
        return data;
    }

    async function fetchLandmarkComplaints(bin) {
        let response = await fetch(`https://data.cityofnewyork.us/resource/ck4n-5h6x.json?bin=${bin}`);
        let data = await response.json();
        return data;
    }

    async function fetchOverviewByField(fieldName, fieldValue) {
        // Let's have this function fetch the total number of landmarks for a specific category of landmarks
        let response = await fetch(`https://data.cityofnewyork.us/resource/x3ar-yjn2.json?$SELECT=count(*) AS count_of_landmarks&$WHERE=${fieldName}='${fieldValue}'`);
        let data = await response.json();
        return data;
    }

    /****************************************************************************************************************/
    /****************************************************************************************************************/
    /****************************************************************************************************************/
    // We use the functions above to start doing stuff here

    // Let's draw our map here and set up our shape layers
    const mymap = drawMap();

    const layerOptions = {onEachFeature:onEachFeature, style: function(feature) { return {weight: "2"} } };
    let propertyLayer = L.geoJSON([], layerOptions).addTo(mymap);

    // Let's Fetch some initial landmark data and add it to our map so we can take a look at it
    fetchLandmarks().then((data) => {
        propertyLayer.addData(data).addTo(mymap);   
    });

    // Let's add filter buttons for our map based on the primary styles
    fetchPrimaryStyles().then((data) => {
        const styleButtons = makeArchStyleFilterButtons(data, propertyLayer);
        $("#button-list .primary-styles").append(styleButtons);
    });

    // Let's add more filter buttons for map based on the historic districts
    fetchHistoricDistricts().then((data) => {
        const districtButtons = makeDistrictFilterButtons(data, propertyLayer);
        $("#button-list .historic-districts").append(districtButtons);
    });
});  


