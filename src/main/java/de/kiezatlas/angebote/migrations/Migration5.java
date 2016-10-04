package de.kiezatlas.angebote.migrations;

import de.deepamehta.core.service.Migration;
import de.deepamehta.core.service.Inject;
import de.deepamehta.workspaces.WorkspacesService;
import de.deepamehta.core.Association;
import de.deepamehta.core.Topic;
import de.kiezatlas.angebote.AngebotPlugin;
import java.util.List;
import java.util.logging.Logger;


/**
 * Migrate all edges between user and angebot to ka2.angebot.creator and move it to the users private workspace.
 *
 */
public class Migration5 extends Migration {

    private Logger logger = Logger.getLogger(getClass().getName());

    @Inject private WorkspacesService workspaceService;

    @Override
    public void run() {

        List<Topic> angebotsinfos = dm4.getTopicsByType(AngebotPlugin.ANGEBOT);
        for (Topic angebot : angebotsinfos) {
            // 1) Retype association
            Topic username = angebot.getRelatedTopic("dm4.core.association", null,
                null, "dm4.accesscontrol.username");
            Association assoc = dm4.getAssociation("dm4.core.association", angebot.getId(),
                username.getId(), "dm4.core.parent", "dm4.core.child");
            assoc.setTypeUri(AngebotPlugin.ANGEBOT_CREATOR_EDGE);
            // 2) Assign to users private worksapce
            Topic privateWs = dm4.getAccessControl().getPrivateWorkspace(username.getSimpleValue().toString());
            workspaceService.assignToWorkspace(assoc, privateWs.getId());
        }

    }

}