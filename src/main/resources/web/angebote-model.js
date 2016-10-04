
// --- JavaScript Model for ASSIGNMENT, EDIT and DETAIL Page --- //

var selected_angebot,
    selected_geo_object,
    selected_assignment = undefined,
    geo_assignments,
    angebotsinfos,
    fromDate,
    toDate
    
// --- Custom RESTClient Methods --- //

function load_angebot_by_resource_path(callback) {
    var angebot_id = parse_angebots_id()
    console.log("Loaded Angebot ID By Resource Path", angebot_id)
    if (angebot_id != 0) {
        var angebotsinfoText = $.ajax('/angebote/' + angebot_id, { async: false, dataType: 'json' }).responseText
        try {
            selected_angebot = JSON.parse(angebotsinfoText)
            if (callback) callback("ok", selected_angebot)
        } catch (e) {
            console.warn("Could not load angebotsinfo details...", e, "using", angebotsinfoText)
            selected_angebot = angebotsinfoText
            if (callback) callback("error", selected_angebot)
        }
    } else {
        console.log("No angebot to edit - Creating new one...")
        if (callback) callback("ok", undefined)
    }
}

function load_angebote_places_and_dates(renderer, stillActive) {
    $.ajax({
        type: "GET", url: "/angebote/list/assignments/" + selected_angebot.id + "/" + stillActive,
        success: function(response) {
            if (response) {
                geo_assignments = response
                console.log("Loaded Angebot Geo Assignments ", geo_assignments)
                if (renderer) renderer(response)
            } else {
                $('#user').html('Bitte <a href="/sign-up/login">loggen</a> sie sich ein um Zuordnungen zu bearbeiten.')
                $('.task-info').addClass('disabled')
                $('div.angebot-area').addClass('disabled')
                geo_assignments = []
            }
        },
        error: function(x, s, e) {
            geo_assignments = []
            console.warn("ERROR", "x: ",x, " s: ", s," e: ", e)
        }
    })
}
