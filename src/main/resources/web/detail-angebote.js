
function render_angebotsinfo_page() {
    var angebotsId = $('#angebot').attr("data")
    $sidebarUi = $('.ui.sidebar').sidebar('setting', 'dimPage', false)
    load_angebot_by_resource_path(angebotsId, function(status, selected_angebot) {
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
            load_angebote_places_and_dates(render_angebot_assignment, true)
        } else if( status === "error") {
            alert("Error Rendering Selected Angebotsinfo", selected_angebot)
            // render_angebot_detail_area()
        }
    })
    // load_username()
}

function render_angebot_detail_area() {
    if (!selected_angebot) throw new Error("Angebotsinfo not found")
    var name = (selected_angebot.name) ? selected_angebot.name : "Name des Angebots"
    // render edit link
    var tags = ""
    for (var t in selected_angebot.tags) {
        // tags += '<a class="ui tiny button basic" href="/angebote?stichworte='+selected_angebot.tags[t].label+'" '
        tags += '<span class="tag">' + selected_angebot.tags[t].label + '</span>'
        // if (t < selected_angebot.tags.length - 1) tags += ", "
    }
    $('.angebot-name').text(name)
    var angebotHTML = ''
    if (selected_angebot.beschreibung) {
        angebotHTML = '<span class="label description">Angebotsbeschreibung</span><br/>'
        angebotHTML += selected_angebot.beschreibung + '<br/>'
    } else {
        angebotHTML = '<p><span class="label">Keine weitere Beschreibung f&uuml;r dieses Angebot vorhanden.</span></p>'
    }
    if (selected_angebot.kontakt) {
        angebotHTML += '<span class="label contact">AnsprechpartnerIn</span><br/>' + selected_angebot.kontakt + '<br/>'
    } else {
        angebotHTML += '<p><span class="label contact">Kein Kontakt angegeben</span></p>'
    }
    if (selected_angebot.webpage && selected_angebot.webpage.indexOf("http://") !== -1) {
        angebotHTML += '<br/><br/><span class="label webpage">Weitere Informationen unter</span><br/>'
            + '<a href="' + selected_angebot.webpage + '">' + selected_angebot.webpage + '</a><br/>'
    }
    if (tags !== "") {
        angebotHTML += '<br/><span class="label tags">Stichw&ouml;rter</span><div class="stichworte">' + tags + '</p>'
    }
    $('.angebot-infos p.body').html(angebotHTML)
    $('.task-info .loading').addClass("hidden")
}

function render_angebot_assignment() {
    // Display Assignments
    var $einrichtungen = $('.geo-objects-area')
        $einrichtungen.empty()
    if (geo_assignments.length === 0) {
        $('.help').html('F&uuml;r dieses Angebot sind uns aktuell keine Veranstaltungszeitr&auml;ume bekannt')
        $('h3.assignments').html("F&uuml;r dieses Angebot sind uns aktuell keine Veranstaltungszeitr&auml;ume bekannt")
    } else {
        // $('.help').html('Um einen Zeitraum zu aktualisieren w&auml;hlen Sie diesen bitte aus.')
    }
    // ### show address or districts, too
    for (var i in geo_assignments) {
        var obj = geo_assignments[i]
        var streetNr = obj.address
        if (streetNr) {
            streetNr = streetNr.replace(' Deutschland', '')
        }
        // var startDate = $.datepicker.formatDate('DD, dd.mm yy', new Date(obj.anfang_timestamp));
        var elementHTML = '<a class="read-more" href="' + URL_EINRICHTUNG + obj.location_id+'">'
            + '<div id="' + obj.id + '" class="concrete-assignment"><h3>'+ obj.name + '</h3><p>'
            elementHTML += '<span class="anschrift label">Anschrift: </span>' + streetNr + '<br/>'
        if (obj.hasOwnProperty("kontakt")) {
            elementHTML += '<span class="label">Kontakt vor Ort: </span> ' + obj.kontakt
            if (obj.hasOwnProperty("zusatzinfo")) elementHTML += ", "
        }
        if (obj.hasOwnProperty("zusatzinfo")) {
            elementHTML += '<span class="label">Zusatz: </span> ' + obj.zusatzinfo
        }
            elementHTML += '<br/><span class="label">Vom </span><i>' + obj.anfang + '</i><span class="label"> bis zum </span><i>' + obj.ende + '</i></p></div></a>'
        var $element = $(elementHTML)
        $einrichtungen.append($element)
    }
    // equip all buttons with a click handler each (at once)
    // $einrichtungen.on('click', select_assignment)
    $('.geo-objects-area a').on('click', click) // sse dm4-kiezatlas-website/ka-startseite.js
}
