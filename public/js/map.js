function LCZ_Map() {

    var self = this;
    var map;
    var infowindow;
    var sites;
    var sitesLength;
    var sitesDetails = [];
    var storedPolygons = [];
    var sensorRange = 1000;
    var sitesShown = 0;
    var jsonMap = {
        center: {lat: -12.2468922, lng: -38.9488287},
        zoom: 12,
        mapTypeId: 'roadmap',
        overlays: []
    }
    var lczStyles = {
        2: {
            name: 'Compacto de média elevação',
            color: '#FF0000'
        },
        3: {
            name: 'Compacto de baixa elevação',
            color: '#FF00FF',
        },
        5: {
            name: 'Aberto de média elevação',
            color: '#FFFF00'
        },
        6: {
            name: 'Aberto de baixa elevação',
            color: '#00FFFF'
        },
        8: {
            name: 'Largo de baixa elevação',
            color: '#0000FF'
        },
        9: {
            name: 'Escassamente construído',
            color: '#dd8800'
        },
        C: {
            name: 'Arbusto, relva',
            color: '#00FF00'
        }
    };

    this.getMap = function () {
        return map;
    };

    var configureLegends = function () {
        var legend = document.getElementById('legend');
        for (var style in lczStyles) {
            var name = lczStyles[style].name;
            var color = lczStyles[style].color;
            var p = document.createElement('p');
            p.innerHTML = '<span class="color" style="background: ' + color + '"></span> ' + name;
            legend.appendChild(p);
        }
        var gJ = document.createElement('button');
        gJ.innerHTML = 'Obter KML';
        gJ.addEventListener('click', getKML);
        legend.appendChild(gJ);
    };

    var getKML = function () {
        BlitzMap.toKML();
        infowindow.setContent(
                '<textarea id="kmlShow" rows="10" cols="70">' + document.getElementById('kmlString').value + '</textarea>' +
                '<button type="button" onclick="LCZMap.copyKML()">Copiar para área de transferência</button>');
        infowindow.setPosition(map.getCenter());
        infowindow.open(map);
    };

    this.copyKML = function () {
        document.getElementById('kmlShow').select();
        document.execCommand('copy');
    };

    var configureMap = function () {
        configureLegends();
        map = new google.maps.Map(document.getElementById('map'), {
            center: {lat: jsonMap.center.lat, lng: jsonMap.center.lng},
            zoom: jsonMap.zoom,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            disableDefaultUI: true
        });
        infowindow = new google.maps.InfoWindow();
        map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(legend);
        configureMapBuilt();
        showAuthorInfo();
    };

    var makeCircleClickable = function (map, circle, info) {
        google.maps.event.addListener(circle, 'click', function (ev) {
            infowindow.setContent(info);
            infowindow.setPosition(circle.getCenter());
            infowindow.open(map);
        });
    };

    var formatContent = function (site, id) {
        var content =
                '<div id="infotext">' +
                '<h1>' + site.name + '</h1>' +
                '<table>' +
                '<tr><td><b>Classificação LCZ</b></td><td>LCZ ' + site.lczBuildType + '<sub>' + site.lczLowerClass + site.lczCoverType + '</sub></td></tr>' +
                '<tr><td><b>Área construída</b></td><td>~' + site.builtPercentage + '% ' +
                '(<a href="#" onclick="LCZMap.siteBuiltDetail(\'' + id + '\')">ver detalhes</a>)</td></tr>' +
                '<tr><td><b>Temperatura do ar</b></td><td>' + site.temperature + ' °C</td></tr>' +
                '<tr><td><b>Umidade relativa</b></td><td>' + site.humidity + ' %</td></tr>' +
                '<tr><td><b>Ponto de orvalho</b></td><td>' + site.dewPoint + ' °C</td></tr>' +
                '<tr><td><b>Índice de calor</b></td><td>' + site.heatIndex + ' °C</td></tr>' +
                '</table>' +
                '<p><small>Coleta realizada em ' + site.measureDate + '</small></p>' +
                '<p>' + site.description + '</p>' +
                '</div>';
        return content;
    };

    var showAuthorInfo = function () {
        infowindow.setContent(document.getElementsByTagName('header')[0].innerHTML);
        infowindow.setPosition(map.getCenter());
        infowindow.open(map)
    };

    this.initMap = function () {
        var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', 'js/sites.json', true);
        xobj.onreadystatechange = function () {
            if (xobj.readyState == 4 && xobj.status == "200") {
                sites = JSON.parse(xobj.responseText);
                sitesLength = Object.keys(sites).length;
                configureMap();
            }
        };
        xobj.send(null);
    };

    var configureMapBuilt = function () {
        var geoXml = new geoXML3.parser({
            map: null,
            zoom: false,
            singleInfoWindow: true,
            afterParse: checkPolygons
        });
        for (var site in sites) {
            geoXml.parse('built-kml/' + site + '.kml');
        }
    };

    var getArea = function (polygon) {
        return google.maps.geometry.spherical.computeArea(polygon.getPath()) / 10000;
    };

    var createCircle = function (site, id) {
        var siteFarOverlayCircle = new google.maps.Circle({
            strokeColor: lczStyles[site.lczBuildType].color,
            strokeOpacity: 0,
            strokeWeight: jsonMap.zoom,
            fillColor: lczStyles[site.lczBuildType].color,
            fillOpacity: 0.09,
            map: map,
            center: site.center,
            radius: 1500
        });
        var siteNearOverlayCircle = new google.maps.Circle({
            strokeColor: lczStyles[site.lczBuildType].color,
            strokeOpacity: 0,
            strokeWeight: jsonMap.zoom,
            fillColor: lczStyles[site.lczBuildType].color,
            fillOpacity: 0.17,
            map: map,
            center: site.center,
            radius: 500,
            zIndex: 998
        });
        makeCircleClickable(map, siteNearOverlayCircle, formatContent(site, id));
        var siteCircle = new google.maps.Circle({
            strokeColor: lczStyles[site.lczBuildType].color,
            strokeOpacity: 0,
            strokeWeight: jsonMap.zoom,
            fillColor: lczStyles[site.lczBuildType].color,
            fillOpacity: 0.8,
            map: map,
            center: site.center,
            radius: 200,
            zIndex: 999
        });
        makeCircleClickable(map, siteCircle, formatContent(site, id));
        jsonMap.overlays.push(
                {
                    type: 'circle',
                    strokeColor: lczStyles[site.lczBuildType].color,
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: lczStyles[site.lczBuildType].color,
                    fillOpacity: 0.35,
                    center: site.center,
                    radius: 200
                }
        );
    };

    var processJSON = function () {
        document.getElementById('jsonString').innerHTML = self.getJSON();
        BlitzMap.setMap('blitzMap', false, 'jsonString');
        BlitzMap.init();
    };

    var checkPolygons = function (doc) {
        if (doc[0].placemarks) {
            processPolygons(doc[0], doc[0].placemarks[0].name);
        }
    };

    var processPolygons = function (doc, id) {
        var polygon, area, strArea, strTotal, builtPercentage, lczSite;
        lczSite = sites[id];
        if (doc) {
            var totalArea = 0;
            for (var i = 1; i < doc.placemarks.length; i++) {
                polygon = doc.placemarks[i].polygon;
                area = getArea(polygon);
                area = area.toFixed(3);
                totalArea += parseFloat(area);
            }
            polygon = doc.placemarks[0].polygon;
            polygon.setMap(null);
            //id = geoXmlDoc.placemarks[0].name;
            area = getArea(polygon).toFixed(1);
            strArea = area.toString().replace('.', ',') + ' ha';
            strTotal = totalArea.toFixed(3).toString().replace('.', ',') + ' ha';
            builtPercentage = totalArea * 100 / area;
            builtPercentage = builtPercentage.toFixed(0);
            lczSite.builtPercentage = builtPercentage;
            lczSite.details = '<h1>' + lczSite.name + '</h1>' +
                    '<b>Área total:</b> ~' + strArea +
                    '<br><b>Área construída:</b> ~' + strTotal +
                    '<br><b>Porcentagem construída:</b> ~' + builtPercentage + '%';
        }
        createCircle(lczSite, id);
        sitesShown++;
        if (sitesShown === sitesLength) {
            processJSON();
        }
    };

    this.siteBuiltDetail = function (id) {
        document.getElementById('infotext').innerHTML = sites[id].details;
    };

    this.getJSON = function () {
        return JSON.stringify(jsonMap);
    };

}
