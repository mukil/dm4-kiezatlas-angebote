
var $sidebarUi = undefined

function angebot_assignments_page() {
    $("#name-search").on("keyup", handle_name_search_input)
    // load_username()
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
    // load_username()
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
        // render_user_menu(response, true)
        // console.log("logged in", response)
        if (!response) {
            $('.task-info').html("<p class=\"message\">Auf der folgenden Seite kannst Du Dich <a href=\"/sign-up/login\">einloggen</a>.</p>")
            $('.angebot-area').remove()
            $('.einrichtungs-area').remove()
        } else {
            //
            restc.load_view_permissions(function(info) {
                console.log("Permissions Info", info)
                var $shortcuts = $('<div class="shortcuts"><h3>Redaktionelle Links</h3>')
                if (info.confirmation) {
                    $shortcuts.append('<a href="/website/list/freischalten">Neue Orte freischalten</a>')
                    if (info.bezirke.length > 0) {
                        $shortcuts.append('<a href="/website/list/bezirksregionen">StadtteilkoordinatorInnen</a>')
                    }
                    if ((info.bezirksregionen.length > 0) || (info.bezirke.length > 0)) {
                        $shortcuts.append('<a href="/website/list/ansprechpartner">AnsprechpartnerInnen verwalten</a>')
                    }
                }
                if (info.bezirke.length > 0 || info.bezirksregionen.length > 0) {
                    $shortcuts.append('<a href="/website/list/filter">Gro&szlig;e Listenansicht</a>')
                }
                if (info.confirmation || (info.bezirke.length > 0 || info.bezirksregionen.length > 0)) {
                    $('.task-info').append('<p>&nbsp;</p>').append($shortcuts)
                }
            })
            //
            has_angebote_membership(function(state) {
                if (!state) {
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
    $sidebarUi = $('.ui.sidebar').sidebar('setting', 'dimPage', false)
    load_users_einrichtungen()
}