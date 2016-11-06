


// --- Angebote Search UI Model -- Client State ---

var location_input = undefined
var location_coords = undefined
var location_radius = 1.5
var available_radiants = [ 0.5, 1.0, 1.5, 2.5, 5.0 ] //  10.0, 15.0
var search_input = []
var leading_wildcard = false
var street_coordinates = []
var street_coords_idx = 0
var time_parameter = undefined

var show_intersecting = true // flag if, by default the client should only
    // ... show search result items contained in all queries (spatial, time and fulltext)
// var show_inactive_offers = false// flag if, offers without an active assignment should be included


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
    leading_wildcard = $('.ui.checkbox.toggle').checkbox('is checked')
    if (search_input.length === 0 && (queryString.length === 0 && !location_coords)) {
        // ### graphically highlight
        $('#query').attr("placeholder", "Bitte Suchbegriff eingeben").focus().attr("style", "border: 1px solid red")
        console.log("Aborted angebote search cause of missing user input")
        return
    }
    if (queryString === "*") {
        console.warn("Please specifiy a word to search for")
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
    text_input = queryString.split(",") // split by tag delimiter // ### clean up value
    var luceneQueryString = ""
    for (var el in text_input) {
        var searchValue = ""
        if (text_input.length === 1) {
            if (leading_wildcard) searchValue += "*"
            searchValue += text_input[el].trim()
            luceneQueryString = searchValue
            search_input.push(searchValue)
        // if more elements entered seperated by comma, ignore empty values " "
        } else if (text_input.length > 1 && text_input[el].trim().length > 0) {
            if (leading_wildcard) searchValue += "*"
            searchValue += text_input[el].trim()
            luceneQueryString += " " + searchValue
            search_input.push(searchValue)
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

function focus_location_query() {
    $('#nearby').focus()
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

function render_search_results(distinct_results) {
    var $listing = $('.list-area .results')
    var result_length = 0
    if (angebotsinfos) {
        result_length = angebotsinfos.fulltext.length + angebotsinfos.spatial.length + angebotsinfos.timely.length
        $listing.empty()
    }
    // ### maybe at some time, allow display of inactive offers, too
    // console.log("Split Search Results By Time", split_angebote_results_by_time(angebotsinfos))
    $listing.empty()
    if (!check_for_distinct_results_rendering() && !distinct_results) {  // Rendering of text and spatial search results combined
        // fetch intersecting search result items
        var intersection = preprocess_angebotsinfos()
        if (intersection.length > 0) {
            // apply spatial sorting
            intersection.sort(angebote_compare_by_distance_nearest_first)
            render_result_header(intersection, $listing, 'in der N&auml;he des Standorts')
            for (var el in intersection) {
                var element = intersection[el]
                render_spatial_list_item(element, $listing)
            }
        } else {
            var $header = $('<li class="header read-more">')
            if (angebotsinfos.spatial.length > 0 || angebotsinfos.fulltext > 0) {
                var count = (angebotsinfos.spatial.length + angebotsinfos.fulltext.length)
                $header.html('<h4>Keine &Uuml;bereinstimmungen gefunden</h4><br/>'
                    + '<h4>'+count+' Ergebnisse entsprechen zumindest <em>einem</em> der beiden Suchparameter</h4><br/><br/>')
                var $button = $('<button class="ui basic small button">Suchergebnisse differenzieren</button>')
                $button.click(function(e) {
                    // show_intersecting = false
                    render_search_results(true) // render distinct results
                })
                $header.append($button)
            } else {
                $header.html('<h4 class="status">Leider konnten wir f&uuml;r beide Suchparameter '
                    + '(<em>Standort</em> und <em>Stichwort</em>) keine aktuellen Angebote finden.</h4>')
            }
            $listing.append($header)
        }
    } else { // Rendering of distinct search results per parameter
        if (angebotsinfos.spatial) {
            // special sorting by distance
            angebotsinfos.spatial.sort(angebote_compare_by_distance_nearest_first)
            render_result_header(angebotsinfos.spatial, $listing, 'in der N&auml;he des Standorts')
            for (var el in angebotsinfos.spatial) {
                var element = angebotsinfos.spatial[el]
                render_spatial_list_item(element, $listing)
            }
        }
        if (angebotsinfos.timely) {
            angebotsinfos.timely.sort(angebote_compare_by_end_earliest_last)
            render_result_header(angebotsinfos.timely, $listing, 'der zeitbasierten Suche')
            for (var el in angebotsinfos.timely) {
                var element = angebotsinfos.timely[el]
                render_fulltext_list_item(element, $listing)
            }
        }
        // overall (text search listing) not necessarily with locations assigned
        if (angebotsinfos.fulltext) {
            angebotsinfos.fulltext.sort(angebote_compare_by_end_earliest_last)
            render_result_header(angebotsinfos.fulltext, $listing, 'in der Stichwortsuche')
            for (var el in angebotsinfos.fulltext) {
                var element = angebotsinfos.fulltext[el]
                render_fulltext_list_item(element, $listing)
            }
        }
    }
    // update status gui
    // var message = (result_length === 1) ? "1 Angebot" : result_length + " Angebote"
    if (result_length === 0) {
        var message = "F&uuml;r diese Suche haben wir leider keine Ergebnisse.<br/>"
            + '<br/>Sie k&ouml;nnen uns aber gerne helfen neue oder aktuelle '
            + 'Angebote in unsere <a class="create-link" href=\"/sign-up/login\">Datenbank aufzunehmen</a>.</br>'
        $('.list-area .status').html(message)
        $('.list-area .status').show()
    } else {
        $('.list-area .status').hide()
    }
}

function check_for_distinct_results_rendering() {
    // Check if there are results of two query parameters to intersect
    if (angebotsinfos.spatial.length > 0 && angebotsinfos.fulltext.length > 0) {
        // Check if intersection is switched on and we do not have results for a timely search (frontpage only)
        if (show_intersecting && angebotsinfos.timely.length === 0) return false
    }
    return true
}

// during distinct result rendering each list becomes its own header
function render_result_header(items, $listing, context) {
    var $header = $('<li class="header read-more">')
    if (items.length > 0) {
        var label = (items.length > 1) ? 'Ergebnisse' : 'Ergebnis'
        $header.html('<h4>'+items.length + ' ' + label + ' ' +context+ '</h4>')
    } /**  else if (context.indexOf("standort") === -1 && !location_coords) {
        $header.html('<h4>Sie k&ouml;nnen auch im <a href="javascript:focus_location_query()">Umkreis eines Standorts</a> nach Angebote suchen</h4>')
    } else if (context.indexOf("zeit") === -1 && angebotsinfos.timely.length === 0) {
        $header.html('<h4>Keine Ergebnisse ' +context+ '</h4>')
    } **/
    $listing.append($header)
}

function preprocess_angebotsinfos() {
    var results = []
    for (var r in angebotsinfos.spatial) {
        var element = angebotsinfos.spatial[r]
        if (is_contained(element.angebots_id, angebotsinfos.fulltext)) {
            results.push(element)
        }
    }
    return results
}

function is_contained(elementId, list) {
    for (var li in list) {
        if (list[li].id === elementId) return true
    }
    return false
}

// ### @see show_inactive_offers
function split_angebote_results_by_time(items_to_render) {
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
    var locationName = element.name
    var name = element.angebots_name
    var angebots_id = element.angebots_id
    var distanceValue = "&nbsp;"
    if (element.search_distance) {
        distanceValue = 'Entfernung ca. ' + (element.search_distance * 1000).toFixed(0) + 'm'
    }
    var html_string = '<li class="read-more"><a href="/angebote/'+angebots_id+'">'
            + '<div id="' + angebots_id + '" class="concrete-assignment"><h3 class="angebot-name">"'
            + name + '" @ ' + locationName + '</h3>Vom <i>'+element.anfang+'</i> bis </i>'+element.ende+'</i>&nbsp;'
        if (!is_empty(element.kontakt)) html_string += '<br/><span class="contact">Kontakt: ' + element.kontakt + '</span>'
        html_string += '<span class="klick">weitere Details...</span>'
        if (element.creator) html_string += '<span class="username">Info von <em>'+element.creator+'</em></span>'
        html_string += '</div><div class="air-distance">'+distanceValue+'</div></li>'
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
        if (!is_empty(element.kontakt)) html_string += '<br/><span class="contact">Kontakt: ' + element.kontakt + '</span>'
        html_string += '<span class="klick">weitere Details...</span>'
        if (element.creator) html_string += '<span class="username">Info von <em>'+element.creator+'</em></span>'
        html_string += '</div><div class="air-distance">&nbsp;</div></li>'
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
        var parameterHTML = 'N&auml;he '
        if (location_coords.name) { // cleanup location name
            if (location_coords.name.indexOf(', Germany') !== -1) {
                location_coords.name = location_coords.name.replace(', Germany', '')
            }
            parameterHTML += ' \"' + location_coords.name + '\" '
        }
        // parameterHTML += '<span class="coord-values">(' + location_coords.longitude.toFixed(3)
           //     + ', ' + location_coords.latitude.toFixed(3) + ')</span>'
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
        parameterHTML += '<a class="close" title="Standortfilter entfernen" href="javascript:remove_location_parameter()">x</a>'
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
        var parameterHTML = 'Heute<a class="close" title="Datumsfilter entfernen" href="javascript:remove_time_parameter(true)">x</a>'
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
                    + "\"<span class=\"search-value\">" + text_param + "</span>\""
                    + "<a class=\"close\" title=\"Stichwortfilter entfernen\" onclick=\"javascript:remove_text_parameter('" + text_param + "', true)\" href=\"#\">x</a></div>")
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

