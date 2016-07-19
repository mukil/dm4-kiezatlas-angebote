package de.kiezatlas.angebote.migrations;

import de.deepamehta.core.Topic;
import de.deepamehta.core.service.Migration;
import de.deepamehta.core.service.Inject;
import de.deepamehta.workspaces.WorkspacesService;
import de.deepamehta.accesscontrol.AccessControlService;
import de.deepamehta.core.service.accesscontrol.Credentials;
import java.util.logging.Logger;


/**
 * Creates a new "angebote-ui" user and make it member of the "Angebote" workspace.
 *
 */
public class Migration4 extends Migration {

    private Logger logger = Logger.getLogger(getClass().getName());

    @Inject private WorkspacesService workspaceService;
    @Inject private AccessControlService aclService;

    @Override
    public void run() {

        Topic angeboteWorkspace = workspaceService.getWorkspace("de.kiezatlas.angebote_ws");
        aclService.createUserAccount(new Credentials("angebote-ui", "my-secret-password"));
        aclService.createMembership("angebote-ui", angeboteWorkspace.getId());
        logger.info("Created the new \"Angebote-UI\" user account");

    }

}