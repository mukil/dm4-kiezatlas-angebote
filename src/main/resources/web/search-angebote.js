


// --- Angebote Search UI Model -- Client State ---

var location_input = undefined
var location_coords = undefined
var location_radius = 1.5
var available_radiants = [ 0.5, 1.0, 1.5, 2.5, 5.0, 10.0, 15.0 ]
var search_input = undefined
var street_coordinates = []
var street_coords_idx = 0
var time_parameter = undefined


// ----------------------------------  The Major Search Operations --------- //

function fire_angebote_search() {
    var queryString = $('#query').val()
        console.log("Fire Angebote Search", queryString)
    if ( (queryString.length === 0 && !location_coords) || queryString.trim().length < 3) {
        $('#query').attr("placeholder", "Bitte Suchbegriff eingeben").focus()
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
    console.log("Text Search Parameter", search_input)
    var luceneQueryString = ""
    for (var el in search_input) {
        if (search_input.length > 0) {
            luceneQueryString += " " + search_input[el].trim()
        }
    }
    // display text parameter
    render_query_parameter()
    console.log("Search Query", luceneQueryString, "Location", locationValue, "Radius", location_radius, "DateTime", dateTime)
    $.getJSON('/angebote/search?query=' + luceneQueryString + '&location=' + locationValue + '&radius='
            + location_radius + '&datetime=' + dateTime, function(results) {
        hide_search_loading_sign()
        render_search_results(results)
    })
}

function fire_angebote_timesearch() {
    var result = JSON.parse($.ajax('/angebote/filter/' + new Date().getTime(),
        { async: false, dataType: 'json' }).responseText)
    angebotsinfos = result.overall // .timely query results assigned to .overall (server side)
}

// ----------------------------------  Two Utility Search Operations -------- //

function do_search_streetcoordinates() {
    var locationString = $('#nearby').val().trim()
    $.getJSON('/geoobject/search/coordinates?query=' + encodeURIComponent(locationString), function(results) {
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
        console.info("Standort OK", ok)
        location_coords = ok.coords
        $loc_status.empty()
        render_query_parameter()
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
            var tagHTML = '<a href="#stichwort/' + encodeURIComponent(name) +'" id="' + tag.id + '" class="' + tag["view_css_class"] +
                '" title="Finde Angebotsinfos unter dem Stichwort ' + name + '" onclick="handle_tag_button_select(this)">' + name + '</a>'
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
    search_input = undefined
    render_query_parameter()
    render_search_results()
}

function render_search_results(items) {
    var $listing = $('.list-area .results')
    // overall and assigned ### merged
    var items_to_render = { overall: [], assigned: [], timely: [] } //, spatial : [] }
    var result_length = 0
    if (items) {
        items_to_render = items
        result_length = items_to_render.overall.length + items_to_render.assigned.length
        $listing.empty()
    } else if (angebotsinfos) {
        items_to_render.timely = angebotsinfos
        result_length = items_to_render.timely.length
    }
    $listing.empty()
    if (items_to_render.length === 0) {
        $listing.append('<li class="read-more">Sie k&ouml;nnen '
            + 'uns helfen neue oder aktuelle Angebote in unsere <a class="create-link" href=\"/sign-up/login\">Datenbank aufzunehmen</a>.</li>')
        // ("+new Date().toLocaleDateString()+")
    }
    // status
    /** if (items_to_render.overall.length > 0) {
        $('#query').val("")
    }**/
    // assigned time search result items
    for (var el in items_to_render.timely) {
        var element = items_to_render.timely[el]
        render_timely_list_item(element, $listing)
    }
    // assigned location search list items
    for (var el in items_to_render.assigned) {
        var element = items_to_render.assigned[el]
        render_assigned_list_item(element, $listing)
    }
    // overall (text search listing)
    for (var el in items_to_render.overall) {
        var element = items_to_render.overall[el]
        render_overall_list_item(element, $listing)
    }
    var message = (result_length === 1) ? "1 Angebot" : result_length + " Angebote"
    if (result_length === 0) message = "F&uuml;r diese Suche haben wir leider keine Ergebnisse"
    $('.list-area .status').html(message)
}

function render_timely_list_item(element, $list) {
    var name = element.name
    var contact = element.kontakt
    var html_string = '<li class="read-more"><a href="/angebote/'+element.id+'">'
            + '<div id="' + element.id + '" class="concrete-assignment"><h3 class="angebot-name">'+name+'</h3>'
        if (!is_empty(contact)) html_string += '<span class="contact">Kontakt: ' + contact + '</span>'
        html_string += '<span class="read-more">Mehr..</span>'
        html_string += '</div></a></li>'
    $list.append(html_string)
}

function render_assigned_list_item(element, $list) {
    var locationName = element.name
    var name = element.angebotsName
    var angebotsId = element.angebotsId
    var contact = element.kontakt
    var html_string = '<li class="read-more"><a href="/angebote/'+angebotsId+'">'
            + '<div id="' + angebotsId + '" class="concrete-assignment"><h3 class="angebot-name">'+name+'</h3>'
            + '<p>Wird aktuell in/im <b>' + locationName + '</b> angeboten<br/>'
            + 'Vom <i>'+element.anfang+'</i> bis </i>'+element.ende+'</i>&nbsp;'
        if (!is_empty(contact)) html_string += '<span class="contact">Kontakt: ' + contact + '</span>'
        html_string += '<span class="read-more">Mehr..</span>'
        html_string += '</div></a></li>'
    $list.append(html_string)
}

function render_overall_list_item(element, $list) {
    var name = element.name
    var contact = element.kontakt
    // var webpage = element.webpage
    // var descr = element.beschreibung
    // var tags = element.tags
    var location_count = element.locations.length
    var first_assignment = element.locations[get_random_int_inclusive(1, location_count+1)]
    if (!first_assignment) first_assignment = element.locations[0]
    if (first_assignment) {
        var html_string = '<li class="read-more"><a href="/angebote/'+element.id+'">'
            + '<div id="' + element.id + '" class="concrete-assignment"><h3 class="angebot-name">'+name+'</h3>'
            // html_string += '<p>' + descr + '</p>'
            html_string += '<p>Wird aktuell an ' + location_count + ' Orten angeboten, z.B. <b>' + first_assignment.name + '</b><br/>'
                + 'Vom <i>'+first_assignment.anfang+'</i> bis </i>'+first_assignment.ende+'</i>&nbsp;'
            if (!is_empty(contact)) html_string += '<span class="contact">Kontakt: ' + contact + '</span>'
            // if (!is_empty(webpage)) html_string += '<a href="' + webpage + '">Webseite</a>'
            html_string += '<span class="read-more">Mehr..</span>'
            html_string += '</div></a></li>'
        $list.append(html_string)
    } else {
        console.warn("Could not load assignment for angebotsinfo...", element)
        var html_string = '<li class="read-more"><a href="/angebote/'+element.id+'">'
            + '<div id="' + element.id + '" class="concrete-assignment"><h3 class="angebot-name">'+name+'</h3>'
            // html_string += '<p>' + descr + '</p>'
            html_string += '<p>F&uuml;r dieses Angebot haben wir aktuell keine Termine.<br/>'
            if (!is_empty(contact)) html_string += '<span class="contact">Kontakt: ' + contact + '</span>'
            // if (!is_empty(webpage)) html_string += '<a href="' + webpage + '">Webseite</a>'
            html_string += '<span class="read-more">Mehr..</span>'
            html_string += '</div></a></li>'
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
        var $locationParameter = $('.filter-area .parameter.location')
        var parameterHTML = '<a class="close" title="Standortfilter entfernen" href="javascript:remove_location_parameter()">x</a>'
                + '<select id="nearby-radius" onchange="handle_location_form()" title="Entfernungsangabe für die Umkreissuche">'
        for (var ridx in available_radiants) {
            var option_value = available_radiants[ridx]
            if (location_radius == option_value) {
                parameterHTML += '<option value="'+option_value+'" selected>' + option_value + 'km</option>'
            } else {
                parameterHTML += '<option value="'+option_value+'">' + option_value + 'km</option>'
            }
        }
        parameterHTML += '</select>N&auml;he \"'+ location_coords.name + '\" <span class="coord-values">(' + location_coords.longitude.toFixed(3)
                + ', ' + location_coords.latitude.toFixed(3) + ')</span>'
        if (street_coordinates.length > 1) {
            parameterHTML += '<a class="prev close" title="Alternatives Ergebnis der Standortsuche nutzen" href="javascript:select_prev_locationsearch_result()">&#8592;</a>'
                + '<a class="next close" title="Nächstes Ergebnis der Standortsuche nutzen" href="javascript:select_next_locationsearch_result()">&#8594;</a> '
                + '<span class="alt-count">('+street_coordinates.length +' Standorte gefunden)</span>'
        }
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
        var parameterHTML = '<a class="close" title="Datumsfilter entfernen" href="javascript:remove_time_parameter()">x</a>Heute'
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
                    + "<a class=\"close\" title=\"Textfilter entfernen\" onclick=\"javascript:remove_text_parameter('" + text_param + "')\" href=\"#\">x</a>"
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
    $('.list-area .loading-indicator').removeClass('hidden')
}

function hide_search_loading_sign() {
    $('.list-area .loading-indicator').addClass('hidden')
}

function remove_location_parameter() {
    location_coords = undefined
    render_query_parameter()
    if (!search_input && !time_parameter) {
        angebotsinfos = []
        render_search_results()
    } else {
        fire_angebote_search()
    }
}

function remove_time_parameter() {
    time_parameter = undefined
    render_query_parameter()
    if (!search_input && !location_input) {
        angebotsinfos = []
        render_search_results()
    } else {
        fire_angebote_search()
    }
}

function remove_text_parameter(name) {
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
        angebotsinfos = []
        fire_angebote_search()
    }
}

function remove_all_text_parameter(e) {
    search_input = undefined
    $('#query').val("")
    render_query_parameter()
    angebotsinfos = []
    fire_angebote_search()
}

function handle_tag_button_select(e) {
    var tagname = e.text
    remove_all_text_parameter()
    remove_time_parameter()
    $('#query').val(tagname)
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

