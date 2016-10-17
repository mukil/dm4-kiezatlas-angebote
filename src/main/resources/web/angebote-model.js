
// --- JavaScript Model for ASSIGNMENT, EDIT and DETAIL Page --- //

var selected_angebot,
    selected_geo_object,
    selected_assignment_infos = undefined,
    selected_assignment_edge = undefined,
    geo_assignments,
    angebotsinfos,
    fromDate,
    toDate
    
// --- Custom RESTClient Methods --- //

function load_angebot_by_resource_path(callback) {
    var angebot_id = parse_angebots_id()
    // console.log("Loaded Angebot ID By Resource Path", angebot_id)
    if (angebot_id != 0) {
        $.ajax({
            type: "GET", dataType: "json", url: '/angebote/' + angebot_id,
            success: function(response) {
                try {
                    selected_angebot = response
                    if (callback) callback("ok", selected_angebot)
                } catch (e) {
                    console.warn("Could not parse angebotsinfo details using", response)
                    selected_angebot = response
                    if (callback) callback("ok", selected_angebot)
                }
            },
            error: function(x, s, e) {
                if (callback) callback("error", e)
            }
        })
    } else {
        console.log("No angebot to edit - Creating new one...")
        if (callback) callback("ok", undefined)
    }
}

function load_angebote_places_and_dates(renderer, justActive) {
    $.ajax({
        type: "GET", url: "/angebote/list/assignments/" + selected_angebot.id + "/" + justActive,
        success: function(response) {
            if (response) {
                geo_assignments = response
                // console.log("Loaded Angebot Geo Assignments ", geo_assignments)
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
