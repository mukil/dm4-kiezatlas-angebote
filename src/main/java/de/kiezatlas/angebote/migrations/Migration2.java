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

        /** TopicType tagType = dm4.getTopicType("ka2.geo_object");
        ViewConfiguration viewConfig = tagType.getViewConfig();
        //
        viewConfig.addSetting("dm4.webclient.view_config",
                "dm4.webclient.multi_renderer_uri", "de.kiezatlas.angebote.geo_object_multi"); **/
        //
        Topic angeboteWorkspace = workspaceService.createWorkspace("Angebote", "de.kiezatlas.angebote_ws",
                SharingMode.PUBLIC);
        aclService.setWorkspaceOwner(angeboteWorkspace, AccessControlService.ADMIN_USERNAME);

    }

}