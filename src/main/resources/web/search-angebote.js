


// --- Angebote Search UI Model -- Client State ---

var location_input = undefined
var location_coords = undefined
var location_radius = 1.5
var available_radiants = [ 0.5, 1.0, 1.5, 2.5, 5.0, 10.0, 15.0 ]
var search_input = []
var street_coordinates = []
var street_coords_idx = 0
var time_parameter = undefined


function init_search_page() {
    load_username(render_user_menu)
    // load tag cloud
    load_and_render_tag_search_dialog()
    // do search by time
    render_search_frontpage()
    tagging.init("query", function(e) {
        // console.log("Tag selection input handler received", e)
        fire_angebote_search()
    })
}

// ----------------------------------  The Major Search Operations --------- //

function fire_angebote_search() {
    var queryString = $('#query').val()
    if (search_input.length === 0 && (queryString.length === 0 && !location_coords)) {
        // ### graphically highlight
        $('#query').attr("placeholder", "Bitte Suchbegriff eingeben").focus().attr("style", "border: 1px solid red")
        console.log("Aborted angebote search cause of missing user input")
        return
    }
    show_search_loading_sign()
    var dateTime = new Date().getTime()
    if (time_parameter) { // de-activate time parameter display
        time_parameter = undefined
    }
    var locationValue = undefined
    if (location_coords) { // existing geo-coodinates values have a higher priority
        locationValue = encodeURIComponent(location_coords.longitude.toFixed(4) + ","+ location_coords.latitude.toFixed(4))
    }
    // Parse text search parameter and prepare lucene query
    search_input = queryString.split(",") // split by tag delimiter // ### clean up value
    var luceneQueryString = ""
    for (var el in search_input) {
        if (search_input.length === 1) {
            luceneQueryString = search_input[el].trim()
        } else if (search_input.length > 1) {
            luceneQueryString += " " + search_input[el].trim()
        }
    }
    // display text parameter
    render_query_parameter()
    console.log("Search Query: " + luceneQueryString + ", Location", locationValue, "Radius", location_radius, "DateTime", dateTime)
    $.getJSON('/angebote/search?query=' + luceneQueryString + '&location=' + locationValue + '&radius='
            + location_radius + '&datetime=' + dateTime, function(results) {
        hide_search_loading_sign()
        angebotsinfos = results
        render_search_results()
    })
}

function fire_angebote_timesearch() {
    var result = JSON.parse($.ajax('/angebote/filter/' + new Date().getTime(),
        { async: false, dataType: 'json' }).responseText)
    angebotsinfos = result // .timely query results are also assigned to .spatial (server side)
    render_search_results()
}

// ----------------------------------  Two Utility Search Operations -------- //

function do_search_streetcoordinates() {
    var locationString = $('#nearby').val().trim()
    $.getJSON('/website/search/coordinates?query=' + encodeURIComponent(locationString), function(results) {
        if (results) {
            street_coordinates = results
            select_locationsearch_parameter()
            fire_angebote_search()
        }
    })
}

function do_browser_location() {
    var $loc_status = $('.filter-area .parameter.location')
    if ($loc_status.length === 0) {
        $loc_status = $('<div class="parameter location">Standortermittlung angefragt ...</div>')
        $('.filter-area .query-parameter').append($loc_status)
    } else {
        $loc_status.html('Standortermittlung angefragt...')
    }
    // functionality provided by ka-locating.js script (dm4-kiezatlas-website)
    locating.get_browser_location(function(ok) {
        console.log("Location Detected", ok.coords, "Time Attribute", time_parameter, "Search Input", search_input)
        location_coords = ok.coords
        time_parameter = undefined
        $loc_status.empty()
        fire_angebote_search()
    }, function(error) {
        var reason = "Position unavailable"
        if (error.code === 1) {
            reason = "Permission denied"
            $loc_status.html('<a class="close" href="javascript:remove_location_parameter()">x</a>Wir konnten deinen '
                + 'aktuellen Standort leider nicht automatisch ermitteln (' + reason + ')')
        } else if (error.code === 2) {
            $loc_status.html('<a class="close" href="javascript:remove_location_parameter()">x</a>Wir konnten deinen '
                + 'aktuellen Standort leider nicht automatisch ermitteln (' + reason + ')')
        } else if (error.code === 3) {
            reason = "Timeout"
        } else {
            console.warn("Standortermittlung fehlerhaft", error, reason)
        }
        location_coords = undefined
    }, {
        enableHighAccuracy: true, timeout: 7000, maximumAge: 0
    })
}

// ----------------------------------  Tagcloud Search View --------- //

function load_and_render_tag_search_dialog() {
    $.getJSON('/tag/with_related_count/ka2.angebot', function(result) {
        var $tags = $('.tag-view')
        for (var r in result) {
            var tag = result[r]
            var name = tag["value"]
            var tagHTML = '<a href="#stichwort/' + encodeURIComponent(name) +'" id="'
                    + tag.id + '" class="' + tag["view_css_class"]
                    +'" title="Finde Angebotsinfos unter dem Stichwort '
                    + name + '" onclick="handle_tag_button_select(this)">' + name + '</a>'
            if (r < result.length - 1) tagHTML += ", "
            $tags.append(tagHTML)
        }
    })
}

// --------------------------- GUI methods for rendering all Search UI elements ------------ //

function render_search_frontpage() {
    fire_angebote_timesearch()
    time_parameter = "Heute"
    location_coords = undefined
    search_input = []
    render_query_parameter()
}

function render_search_results() {
    var $listing = $('.list-area .results')
    var result_length = 0
    if (angebotsinfos) {
        result_length = angebotsinfos.fulltext.length + angebotsinfos.spatial.length + angebotsinfos.timely.length
        $listing.empty()
    }
    // console.log("Search Result Item Object", angebotsinfos)
    $listing.empty()
    // status
    if (angebotsinfos.length === 0) {
        $listing.append('<li class="read-more">Sie k&ouml;nnen '
            + 'uns helfen neue oder aktuelle Angebote in unsere <a class="create-link" href=\"/sign-up/login\">Datenbank aufzunehmen</a>.</li>')
        // ("+new Date().toLocaleDateString()+")
    }
    // ### var complete_resultset = split_angebote_results(angebotsinfos)
    // console.log("Split Search Results", complete_resultset)
    // assigned location search list items
    if (angebotsinfos.spatial) {
        // ### special sorting by distance
        // ... angebotsinfos.spatial.sort(angebote_compare_by_end_earliest_last)
        for (var el in angebotsinfos.spatial) {
            var element = angebotsinfos.spatial[el]
            render_spatial_list_item(element, $listing)
        }
    }
    if (angebotsinfos.timely) {
        angebotsinfos.timely.sort(angebote_compare_by_end_earliest_last)
        for (var el in angebotsinfos.timely) {
            var element = angebotsinfos.timely[el]
            render_fulltext_list_item(element, $listing)
        }
    }
    // overall (text search listing) not necessarily with locations assigned
    if (angebotsinfos.fulltext) {
        angebotsinfos.fulltext.sort(angebote_compare_by_end_earliest_last)
        for (var el in angebotsinfos.fulltext) {
            var element = angebotsinfos.fulltext[el]
            render_fulltext_list_item(element, $listing)
        }
    }
    var message = (result_length === 1) ? "1 Angebot" : result_length + " Angebote"
    if (result_length === 0) message = "F&uuml;r diese Suche haben wir leider keine Ergebnisse"
    $('.list-area .status').html(message)
}

function split_angebote_results(items_to_render) {
    var split_time = new Date().getTime()
    // var latest_end = get_latest_angebote_end_time(element)
    var complete_resultset = {
        current: [], outdated: []
    }
    for (var idx in items_to_render) {
        for (var el in items_to_render[idx]) {
            var element = items_to_render[idx][el]
            // render_overall_list_item(element, $listing)
            var latest_end = get_latest_angebote_end_time(element)
            if (split_time > latest_end) {
                complete_resultset.outdated.push(element)
            } else {
                complete_resultset.current.push(element)
            }
        }
    }
    return complete_resultset
}

function render_spatial_list_item(element, $list) {
    // ### sort by distance
    var locationName = element.name
    var name = element.angebots_name
    var angebots_id = element.angebots_id
    var contact = element.kontakt
    var html_string = '<li class="read-more"><a href="/angebote/'+angebots_id+'">'
            + '<div id="' + angebots_id + '" class="concrete-assignment"><h3 class="angebot-name">"'
            + name + '" @ ' + locationName + '</h3>Vom <i>'+element.anfang+'</i> bis </i>'+element.ende+'</i>&nbsp;'
        if (!is_empty(contact)) html_string += '<br/><span class="contact">Kontakt: ' + contact + '</span>'
        html_string += '<span class="klick">Ausw&auml;hlen f&uuml;r mehr Infos</span>'
        html_string += '</div></a><div class="air-distance">Entfernung ca. ' + (element.search_distance * 1000).toFixed(0) + 'm</div></li>'
    $list.append(html_string)
}

function render_fulltext_list_item(element, $list) {
    var location_count = element.locations.length
    var first_assignment = element.locations[get_random_int_inclusive(1, location_count+1)]
    if (!first_assignment) first_assignment = element.locations[0]
    if (first_assignment) {// Angebote werden nur angezeigt wenn sie mindestens ein "Assignment" haben
        var standort_html = (location_count > 1) ? location_count + ' Standorten' : ' einem Standort'
        var zb_html = (location_count > 1) ? 'z.B. vom' : 'Vom'
        var html_string = '<li class="read-more"><a href="/angebote/'+element.id+'">'
            + '<div id="' + element.id + '" class="concrete-assignment">'
            + '<h3>"' +element.name + '" wird an ' + standort_html + ' angeboten</h3>'
            + zb_html +' <i>'+first_assignment.anfang+'</i> bis </i>'+first_assignment.ende+'</i>, <b>' + first_assignment.name + '</b><br/>'
        if (!is_empty(element.kontakt)) html_string += '<span class="contact">Kontakt: ' + element.kontakt + '</span>'
        html_string += '<span class="klick">Ausw&auml;hlen f&uuml;r mehr Infos</span></div></a>'
            + '<div class="air-distance">&nbsp;</div></li>'
        $list.append(html_string)
    }
}

// -------------------------------------- Search UI Helper and Utility Methods ------------------- //

function select_locationsearch_parameter(idx) {
    if (street_coordinates.length > 0 && !idx) {
        location_coords = street_coordinates[0]
    } else if (street_coordinates.length > 0 && idx) {
        location_coords = street_coordinates[idx]
        street_coords_idx = idx
    } else {
        location_coords = undefined
        console.log("Clear Location Search Parameter")
    }
    time_parameter = undefined // clear "Heute"
    render_query_parameter()
}

function select_prev_locationsearch_result() {
    prev_idx = street_coords_idx - 1
    if (street_coords_idx === 0) {
        prev_idx = street_coordinates.length - 1
    }
    select_locationsearch_parameter(prev_idx)
}

function select_next_locationsearch_result() {
    next_idx = street_coords_idx + 1
    if (street_coords_idx === street_coordinates.length - 1) {
        next_idx = 0
    }
    select_locationsearch_parameter(next_idx)
}

function toggle_location_parameter_display($filter_area) {
    if (location_coords) {
        // ### geo-coded address value has no "name" attribute
        var $locationParameter = $('.filter-area .parameter.location')
        var parameterHTML = '<a class="close" title="Standortfilter entfernen" href="javascript:remove_location_parameter()">x</a>'
        parameterHTML += 'N&auml;he '
        if (location_coords.name) {
            parameterHTML += ' \"' + location_coords.name + '\" '
        }
        parameterHTML += '<span class="coord-values">(' + location_coords.longitude.toFixed(3)
                + ', ' + location_coords.latitude.toFixed(3) + ')</span>'
        if (street_coordinates.length > 1) {
            parameterHTML += '<a class="prev close" title="Alternatives Ergebnis der Standortsuche nutzen" href="javascript:select_prev_locationsearch_result()">&#8592;</a>'
                + '<a class="next close" title="Nächstes Ergebnis der Standortsuche nutzen" href="javascript:select_next_locationsearch_result()">&#8594;</a> '
                + '<span class="alt-count">('+street_coordinates.length +' Standorte gefunden)</span>'
        }
        parameterHTML += '<select id="nearby-radius" onchange="handle_location_form()" title="Entfernungsangabe für die Umkreissuche">'
        for (var ridx in available_radiants) {
            var option_value = available_radiants[ridx]
            if (location_radius == option_value) {
                parameterHTML += '<option value="'+option_value+'" selected>' + option_value + 'km</option>'
            } else {
                parameterHTML += '<option value="'+option_value+'">' + option_value + 'km</option>'
            }
        }
        parameterHTML += '</select>'
        if ($locationParameter.length === 0) {
            $filter_area.append('<div class="parameter location" title="Standort-Suchfilter">' + parameterHTML + '</div>')
        } else {
            $locationParameter.html(parameterHTML)
        }
    } else {
        $('.filter-area .parameter.location').remove()
    }
}

function toggle_time_parameter_display($filter_area) {
    if (time_parameter) {
        var $timeParameter = $('.filter-area .parameter.time')
        var parameterHTML = '<a class="close" title="Datumsfilter entfernen" href="javascript:remove_time_parameter(true)">x</a>Heute'
        if ($timeParameter.length === 0) {
            $filter_area.append('<div class="parameter time" title="Zeitfilter der Anfrage">'+parameterHTML+'</div>')
        } else {
            $timeParameter.html(parameterHTML)
        }
    } else {
        $('.filter-area .parameter.time').remove()
    }
}

function render_text_parameter_display($filter_area) {
    // clean up gui
    $('.filter-area .parameter.text').remove()
    if (search_input) {
        // paint gui
        for (var i in search_input) { // contains unique elements only
            var text_param = search_input[i].trim()
            if (text_param.length > 0) {
                $filter_area.append("<div class=\"parameter text " + text_param + "\" title=\"Text Suchfilter\">"
                    + "<a class=\"close\" title=\"Textfilter entfernen\" onclick=\"javascript:remove_text_parameter('" + text_param + "', true)\" href=\"#\">x</a>"
                    + "Suche nach \"<span class=\"search-value\">" + text_param + "</span>\"</div>")
            }
        }
    }
}

function render_query_parameter() {
    var $filter_area = $('.query-parameter')
    //
    toggle_location_parameter_display($filter_area)
    //
    toggle_time_parameter_display($filter_area)
    //
    render_text_parameter_display($filter_area)
    //
    if (!search_input && !location_coords && !time_parameter) {
        $('.list-area .status').html("Bitte gib einen Suchbegriff ein oder w&auml;hle einen Standort")
    }
}

function show_search_loading_sign() {
    $('.list-area .loading-indicator .icon').removeClass('hidden')
    $('.list-area .status').text('Suche Angebote')
    $('.list-area .results').empty()
}

function hide_search_loading_sign() {
    $('.list-area .loading-indicator .icon').addClass('hidden')
    $('#query').attr("style", "")
}

function remove_location_parameter() {
    location_coords = undefined
    render_query_parameter()
    if (!search_input && !time_parameter) {
        angebotsinfos = undefined
        render_search_results()
    } else {
        fire_angebote_search()
    }
}

function remove_time_parameter(fireSearch) {
    time_parameter = undefined
    render_query_parameter()
    if (!search_input && !location_input) {
        angebotsinfos = undefined
        render_search_results()
    }
    if (fireSearch) fire_angebote_search()
}

function remove_text_parameter(name, fireSearch) {
    // build up new list of parameter
    var new_search_input = []
    for (var i in search_input) {
        var el = search_input[i].trim()
        if (el !== name) {
            new_search_input.push(el)
        }
    }
    // paint new text parameter gui
    if (new_search_input.length === 0) {
        remove_all_text_parameter()
    } else {
        search_input = new_search_input
        // paint new list of parameter
        $('#query').val(new_search_input.join(","))
        render_query_parameter()
        angebotsinfos = undefined
    }
    if (fireSearch) fire_angebote_search()
}

function remove_all_text_parameter(e) {
    search_input = []
    $('#query').val("")
    render_query_parameter()
    angebotsinfos = undefined
}

function handle_tag_button_select(e) {
    var tagname = e.text
    remove_all_text_parameter(false)
    remove_time_parameter(false)
    $("#query").val(tagname + ", ")
    fire_angebote_search()
}

function handle_location_form(e) {
    var radiusSelection = document.getElementById("nearby-radius");
    if (radiusSelection) {
        location_radius = radiusSelection.options[radiusSelection.selectedIndex].value;
        console.log("Updated Location Search Radius", location_radius)
        fire_angebote_search()
    }
}

