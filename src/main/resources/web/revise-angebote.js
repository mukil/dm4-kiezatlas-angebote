
function do_confirm_revision() {
    $("#dialog-confirm").dialog({ resizable: false, height: "auto", width: 340, modal: true,
        title: "Angebotszeitraum aufheben", buttons: {
            "Ja, aufheben": function() {
                do_revise_assignment()
            },
            "Nein": function() {
                $( this ).dialog( "close" );
            }
        }
    })
}

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
        var result = restc.request('POST', '/angebote/assignment/' + selected_assignment_infos.id + '/delete', undefined, undefined)
        console.log("Delete Assignment Result", result)
        $('.label.hint').text("OK, die Zuweisung dieses Angebots wurde erfolgreich aufgehoben und der/die Anbieter_in benachrichtigt.")
        $('.revise .commands button').remove()
        restc.logout()
        $("#dialog-confirm").dialog("close");
        // go_to_frontpage()
    }

    function do_privileged_revise_call() {
        restc.login("Basic " + btoa("angebote-ui:my-secret-password"))
        username = restc.get_username()
        if (username) {
            do_revise_call()
        } else {
            $("#dialog-confirm").dialog("close");
            $('.label.hint').text("Entschuldigung, bei der Aufhebung der Zuweisung ist ein Fehler aufgetreten.")
        }
    }
}

function send_revise_message() {
    var message = $('#email-body').val()
    var assignmentId = $('.revise .info').attr("id")
    if (message.length <= 3) {
        $('.mail-status').text("Mail ist zu kurz, bitte geben Sie mindestens 3 Zeichen ein.")
        return
    } else {
        restc.request('POST', '/angebote/assignment/' + assignmentId + '/contact', message, function(response) {
            console.log("Send Mail:", response)
            $('.mail-status').text("OK! Ihre Nachricht wurde verschickt")
            $('#sendmail').remove()
            $('#contact textarea').remove()
        }, undefined, "text")
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
    // Set angebots assignment id
    $('.anbieter-name').text(selected_assignment_infos.assignment_creator)
    $('.revise .info').attr("id", selected_assignment_infos.id)
    console.log("Revise Assignemnt Info", selected_assignment_infos)
}
