
function render_angebotsinfo_page() {
    load_angebot_by_resource_path(function(status, selected_angebot) {
        if (status === "ok") {
            render_angebot_detail_area()
            is_angebote_creator(selected_angebot.id, function(response) {
                if (response) {
                    var $edit_link = $('<div class="ui input focus edit-link">'
                        + '<button title="Angebotsinfos bearbeiten" class="ui mini button" '
                            + 'onclick="go_edit_angebot('+selected_angebot.id+')"><i class="edit icon" />Bearbeiten</button>'
                        + '</div>')
                    $('.detail-area').append($edit_link)
                }
            })
        } else if( status === "error") {
            alert("Error Rendering Selected Angebotsinfo", selected_angebot)
            // render_angebot_detail_area()
        }
    })
    load_angebote_places_and_dates(render_angebot_assignment, true)
    load_username(function(res) {
        render_user_menu(res)
    })
}

function render_angebot_detail_area() {
    if (!selected_angebot) throw new Error("Angebotsinfo not found")
    var name = (selected_angebot.name) ? selected_angebot.name : "Name des Angebots"
    // render edit link
    var tags = ""
    for (var t in selected_angebot.tags) {
        tags += selected_angebot.tags[t].label
        if (t < selected_angebot.tags.length - 1) tags += ", "
    }
    $('.angebot-name').text(name)
    var angebotHTML = ''
    if (selected_angebot.beschreibung) {
        angebotHTML = '<span class="label">Angebotsinfos</span><br/>' + selected_angebot.beschreibung + '<br/>'
    }
    if (selected_angebot.kontakt) {
        angebotHTML += '<span class="label">Kontakt</span><br/>' + selected_angebot.kontakt + '<br/>'
    }
    if (selected_angebot.webpage && selected_angebot.webpage.indexOf("http://") !== -1) {
        angebotHTML += '<br/><br/><span class="label">Webseite</span><br/>'
            + '<a href="' + selected_angebot.webpage + '">' + selected_angebot.webpage + '</a><br/>'
    }
    if (tags !== "") {
        angebotHTML += '<br/><span class="label">Stichworte</span><br/><i>' + tags + '</i>'
    }
    $('.angebot-infos p.body').html(angebotHTML)
}

function render_angebot_assignment() {
    // Display Assignments
    var $einrichtungen = $('.geo-objects-area .einrichtungen')
        $einrichtungen.empty()
    if (geo_assignments.length === 0) {
        $('.help').html('Diesen Angebotsinfos sind aktuell noch keine Angebotszeitr&auml;ume in Einrichtungen zugewiesen.')
        $('h3.assignments').html("F&uuml;r dieses Angebot haben wir aktuell keine Termine")
    } else {
        // $('.help').html('Um einen Zeitraum zu aktualisieren w&auml;hlen Sie diesen bitte aus.')
    }
    // ### show address or districts, too
    for (var i in geo_assignments) {
        var obj = geo_assignments[i]
        // var startDate = $.datepicker.formatDate('DD, dd.mm yy', new Date(obj.anfang_timestamp));
        var $element = $('<a class="read-more" href="/geoobject/'+obj.locationId // ### adjust url for deployment
                +'"><div id="' + obj.id + '" class="concrete-assignment"><h3>'
                + obj.name + '</h3><p>'+obj.address+'<br/><i>' + obj.anfang + '</i> &ndash; <i>' + obj.ende + '</i></p></div></a>')
        $einrichtungen.append($element)
    }
    // equip all buttons with a click handler each (at once)
    // $einrichtungen.on('click', select_assignment)
}