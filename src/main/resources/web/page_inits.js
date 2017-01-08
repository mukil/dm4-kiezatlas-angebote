
function angebot_assignments_page() {
    $("#name-search").on("keyup", handle_name_search_input)
    load_username(render_user_menu)
    has_angebote_membership(function(state) {
        if (state) {
            render_assignment_page()
        } else {
            $('.form-area .assignment').remove()
            $('.form-area .input').remove()
            $('.date-area').remove()
            $('.right-side').remove()
            $('.task-info p').remove()
            $('.task-info h3').html('Entschuldigung! '
                + 'Sie haben noch keine Berechtigung eigene Angebotsinfos im Kiezatlas zu verwalten.<br/>'
                + 'Bitte kontaktieren Sie uns unter <a href="mailto:support@kiezatlas.de">support@kiezatlas.de</a> und '
                + 'unter Angabe ihres Benutzernamens mit Bezug auf diese Fehlermeldung.<br/>')
        }
    })
}

function edit_angebot_page() {
    load_username(render_user_menu)
    has_angebote_membership(function(state) {
        if (state) {
            // parse topic id from path
            var id = parse_angebots_id()
            if (id !== 0) {
                // Update Angebotsinfos
                load_angebot_by_resource_path(parse_angebots_id(), function(res, angebotsinfo) {
                    render_angebot_form()
                    tagging.init('angebot-tags')
                    if (angebotsinfo && angebotsinfo.hasOwnProperty("tags")) {
                        tagging.setupTags(angebotsinfo["tags"])
                    }
                })
            }
            $('#angebot-name').focus()
        } else {
            $('.form-area.angebot').remove()
            $('.task-info h3').html('Entschuldigung! '
                + 'Sie haben noch keine Berechtigung eigene Angebotsinfos im Kiezatlas zu verwalten.<br/>'
                + 'Bitte kontaktieren Sie uns unter <a href="mailto:support@kiezatlas.de">support@kiezatlas.de</a> und '
                + 'unter Angabe ihres Benutzernamens mit Bezug auf diese Fehlermeldung.<br/>')
        }
    })
    // ckEditor
    CKEDITOR.inline('angebot-beschreibung')
}

function my_entries_page() {
    load_username(function(response) {
        render_user_menu(response, true)
        console.log("logged in", response)
        if (!response) {
            $('.task-info').html("<p class=\"message\">Auf der folgenden Seite kannst Du Dich <a href=\"/sign-up/login\">einloggen</a>.</p>")
            $('.angebot-area').remove()
            $('.einrichtungs-area').remove()
        } else {
            has_angebote_membership(function(state) {
                if (!state) {
                    console.log("No Angebote Membership...")
                    $('.angebot-area').remove()
                    $('.task-info').html("<p class=\"message\">Du hast aktuell nicht die Berechtigungen um eigene Angebote zu verwalten.<br/>"
                        + "Solle dies ein Fehler sein melde Dich bitte per Email unter Angabe deines Benutzernamens bei uns: "
                        + "<a href=\"mailto:support@kiezatlas.de\">info@kiezatlas.de</a></p><p>Falls Du f&uuml;r die Kiezatlas Website bereits einen Account hast, bitte logge dich ein.</p>")
                } else {
                    load_users_angebote()
                }
            })
        }
    })
    load_users_einrichtungen()
}