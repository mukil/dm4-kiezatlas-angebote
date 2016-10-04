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

        logger.info("### Starting Migration5: Reassigning angebotsinfo - username relations to \"System\" workspace");
        List<Topic> angebotsinfos = dm4.getTopicsByType(AngebotPlugin.ANGEBOT);
        for (Topic angebot : angebotsinfos) {
            // 1) Assign standard assoc to \"System\"
            Topic username = angebot.getRelatedTopic("dm4.core.association", null,
                null, "dm4.accesscontrol.username");
            Association systemAssoc = dm4.getAssociation("dm4.core.association", angebot.getId(),
                username.getId(), "dm4.core.parent", "dm4.core.child");
            workspaceService.assignToWorkspace(systemAssoc, dm4.getAccessControl().getSystemWorkspaceId());
            logger.info("=> Assigned angebotsinfo - username relation to \"System\" workspace");
            // 2) Create new association into users \"Private Workspace\"
            Topic privateWs = dm4.getAccessControl().getPrivateWorkspace(username.getSimpleValue().toString());
            Association privateCreatorAssoc = dm4.createAssociation(mf.newAssociationModel(AngebotPlugin.ANGEBOT_CREATOR_EDGE,
                mf.newTopicRoleModel(angebot.getId(), "dm4.core.parent"),
                mf.newTopicRoleModel(username.getId(),"dm4.core.child")));
            workspaceService.assignToWorkspace(privateCreatorAssoc, privateWs.getId());
            logger.info("=> Created new \"Angebotsinfo Creator\" between usern and angebotsinfo in \"Private Workspace\"");
        }
        logger.info("### Completed Migration5: Reassigning angebotsinfo - username relations");

    }

}