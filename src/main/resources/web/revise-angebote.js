
function do_revise_assignment() {
    var username = restc.get_username()
    if (username) {
        var hasAngeboteMembership = $.ajax('/angebote/membership/', { async: false, dataType: 'json' }).responseText
        if (hasAngeboteMembership) {
            do_revise_call()
        } else {
            alert("Entschuldigung, bei der Aufhebung der Zuweisung ist ein Fehler aufgetreten. Wir konnten Sie nicht autorisieren.")
        }
    } else {
        do_privileged_revise_call()
    }

    function do_revise_call() {
        var result = restc.request('POST', '/angebote/assignment/' + selected_assignment_infos.id + "/delete")
        $('.label.hint').text("OK, die Zuweisung dieses Angebots wurde erfolgreich aufgehoben.")
        $('.revise .commands button').remove()
    }

    function do_privileged_revise_call() {
        restc.login("Basic " + btoa("angebote-ui:my-secret-password"))
        username = restc.get_username()
        if (username) {
            do_revise_call()
            restc.logout()
            go_to_frontpage()
        } else {
            $('.label.hint').text("Entschuldigung, bei der Aufhebung der Zuweisung ist ein Fehler aufgetreten.")
        }
    }
}

function render_angebotsrevise_page() {
    var assocId = parse_angebots_id()
    selected_assignment_infos = JSON.parse($.ajax('/angebote/assignment/' + assocId, { async: false, dataType: 'json' }).responseText)
    $('.einrichtungs-name').text(selected_assignment_infos.name)
    $('.angebots-name').text(selected_assignment_infos.angebots_name)
    $('.von').text(selected_assignment_infos.anfang)
    $('.bis').text(selected_assignment_infos.ende)
    $('.angebots-beschreibung').html(selected_assignment_infos.beschreibung)
    $('.kontakt').html(selected_assignment_infos.kontakt)
    $('.webpage').attr("href", selected_assignment_infos.webpage).text(selected_assignment_infos.webpage)
}
