package de.kiezatlas.angebote.migrations;

import de.deepamehta.core.TopicType;
import de.deepamehta.core.ViewConfiguration;
import de.deepamehta.core.service.Migration;
import java.util.logging.Logger;


/**
 * This migration extends the dm4-kiezatlas "ka2.geo_object" type about a custom webclient multi renderer.
 *
 */
public class Migration2 extends Migration {

    private Logger logger = Logger.getLogger(getClass().getName());

    @Override
    public void run() {

        TopicType tagType = dms.getTopicType("ka2.geo_object");
        ViewConfiguration viewConfig = tagType.getViewConfig();
        //
        viewConfig.addSetting("dm4.webclient.view_config",
                "dm4.webclient.multi_renderer_uri", "de.kiezatlas.angebote.geo_object_multi");

    }

}