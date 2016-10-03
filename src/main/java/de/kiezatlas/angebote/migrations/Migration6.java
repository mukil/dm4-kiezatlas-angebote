package de.kiezatlas.angebote.migrations;

import de.deepamehta.core.service.Migration;
import de.deepamehta.core.service.Inject;
import de.deepamehta.workspaces.WorkspacesService;
import de.deepamehta.accesscontrol.AccessControlService;
import java.util.logging.Logger;


/**
 * Migrate all edges between user and angebot to angebot.creator
 *
 */
public class Migration6 extends Migration {

    private Logger logger = Logger.getLogger(getClass().getName());

    @Inject private WorkspacesService workspaceService;
    @Inject private AccessControlService aclService;

    @Override
    public void run() {

        /** TODO: Migrate all edges between user and angebot to angebot.creator */

    }

}