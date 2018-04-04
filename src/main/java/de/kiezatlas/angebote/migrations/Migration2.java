package de.kiezatlas.angebote.migrations;

import de.deepamehta.core.Topic;
import de.deepamehta.core.service.Migration;
import de.deepamehta.core.service.accesscontrol.SharingMode;
import de.deepamehta.core.service.Inject;
import de.deepamehta.workspaces.WorkspacesService;
import de.deepamehta.accesscontrol.AccessControlService;
import java.util.logging.Logger;


/**
 * Creates a new "Public" Workspace called "Angebote".
 *
 */
public class Migration2 extends Migration {

    private Logger logger = Logger.getLogger(getClass().getName());

    @Inject private WorkspacesService workspaceService;
    @Inject private AccessControlService aclService;

    @Override
    public void run() {

        Topic angeboteWorkspace = workspaceService.createWorkspace("Angebote", "de.kiezatlas.angebote_ws",
                SharingMode.PUBLIC);
        aclService.setWorkspaceOwner(angeboteWorkspace, AccessControlService.ADMIN_USERNAME);

    }

}