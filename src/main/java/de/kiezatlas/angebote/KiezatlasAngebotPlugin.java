package de.kiezatlas.angebote;

import de.deepamehta.plugins.geomaps.service.GeomapsService;
import de.deepamehta.plugins.geomaps.model.GeoCoordinate;

import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.model.AssociationModel;
import de.deepamehta.core.model.TopicRoleModel;
import de.deepamehta.core.osgi.PluginActivator;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.ResultList;
import de.deepamehta.core.service.event.PostCreateTopicListener;
import de.deepamehta.plugins.accesscontrol.service.AccessControlService;
import java.io.InputStream;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.Consumes;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.logging.Logger;
import javax.ws.rs.GET;
import javax.ws.rs.PathParam;
import javax.ws.rs.core.MediaType;



@Path("/kiezatlas/angebot")
@Consumes("application/json")
@Produces("application/json")
public class KiezatlasAngebotPlugin extends PluginActivator implements PostCreateTopicListener {
    
    // ------------------------------------------------------------------------------------------------------ Properties
    
    private static final String ANGEBOT_START_TIME          = "ka2.angebot.start_time";
    private static final String ANGEBOT_END_TIME            = "ka2.angebot.end_time";

    // ------------------------------------------------------------------------------------------------------- Constants

    // The URIs of KA2 Bezirk topics have this prefix.
    // The remaining part of the URI is the original KA1 overall map alias.
    private static final String KA2_BEZIRK_URI_PREFIX       = "ka2.bezirk.";

    // The URIs of KA2 Geo Object topics have this prefix.
    // The remaining part of the URI is the original KA1 topic id.
    private static final String KA2_GEO_OBJECT_URI_PREFIX   = "de.kiezatlas.topic.";

    // ---------------------------------------------------------------------------------------------- Instance Variables

    @Inject private GeomapsService geomapsService;
    @Inject private AccessControlService aclService;

    private Logger logger = Logger.getLogger(getClass().getName());

    // -------------------------------------------------------------------------------------------------- Public Methods

	@GET
	@Path("/")
	@Produces(MediaType.TEXT_HTML)
	public InputStream getAngeboteView() {
		return getStaticResource("web/index.html");
	}

	@GET
	@Path("/zuordnen/{topicID}")
	@Produces(MediaType.TEXT_HTML)
	public InputStream getAngebotAssignmentView(@PathParam("topicID") String id) {
		// Disposing topicID
		return getStaticResource("web/assignment.html");
	}

	@GET
	@Path("/edit/{topicID}")
	@Produces(MediaType.TEXT_HTML)
	public InputStream getAngebotEditView(@PathParam("topicID") String id) {
		// Disposing topicID
		return getStaticResource("web/edit.html");
	}

	@GET
	@Path("/list")
	@Produces(MediaType.APPLICATION_JSON)
	public List<RelatedTopic> getUsersAngebote() {
		ResultList<RelatedTopic> all = dms.getTopics("ka2.angebot", 0);
		ArrayList<RelatedTopic> my = new ArrayList<RelatedTopic>();
		Iterator<RelatedTopic> iterator = all.iterator();
		while (iterator.hasNext()) {
			RelatedTopic element = iterator.next();
			RelatedTopic username = element.getRelatedTopic("dm4.core.association",
				null, null, "dm4.accesscontrol.username");
			String alias = aclService.getUsername();
			if (username != null && (username.getSimpleValue().toString().equals(alias))) {
				my.add(element);	
			} else {
				logger.warning("Angebot " + element.getSimpleValue() + " hat keinen Username assoziiert!");
				// logger.warning("Angebot Relations " + element.getRelatedTopics("dm4.core.association", 0).toJSON().toString());
			}
		}
		return my;
	}

    /**
     * Filters the given list by proximity filter if such is no null and thus excludes topics related
     * through a higher distance value (or all elements with invalid geo-coordinates).
    private List<AngebotViewModel> applyProximityFilter(List<RelatedTopic> angebote, ProximityFilter proximityFilter) {
        logger.info("Applying proximityfilter to a list of " + angebote.size() + " geo-objects");
        List<AngebotViewModel> results = new ArrayList();
        for (Topic topic : angebote) {
            try {
                GeoCoordinate geoCoord = geoCoordinate(topic);
                if (proximityFilter != null) {
                    double distance = geomapsService.getDistance(geoCoord, proximityFilter.geoCoordinate);
                    if (distance > proximityFilter.radius) {
                        continue;
                    }
                }
                results.add(createAngebotViewModel(topic, geoCoord));
            } catch (Exception e) {
                logger.warning("### Excluding geo object " + topic.getId() + " (\"" +
                    topic.getSimpleValue() + "\") from result (" + e + ")");
            }
        }
        return results;
    } **/

    private GeoCoordinate geoCoordinate(Topic geoObjectTopic) {
        Topic address = geoObjectTopic.getChildTopics().getTopic("dm4.contacts.address");
        GeoCoordinate geoCoord = geomapsService.getGeoCoordinate(address);
        if (geoCoord == null) {
            throw new RuntimeException("Geo coordinate is unknown");
        }
        return geoCoord;
    }

    private AngebotViewModel createAngebotViewModel(Topic topic, GeoCoordinate geoCoord) {
        AngebotViewModel angebot = new AngebotViewModel();
        angebot.setName(topic.getSimpleValue().toString());
        // ### which place to locate and render this angebot?
        // ### many geo-objects assigned
        // geoObject.setBezirk(bezirk.getSimpleValue().toString());
        // angebot.setGeoCoordinate(geoCoord);
        // geoObject.setLink(link(topic, bezirk));
        //
        return angebot;
    }

	public void postCreateTopic(Topic topic) {
		if (topic.getTypeUri().equals("ka2.angebot")) {
			Topic usernameTopic = aclService.getUsername(aclService.getUsername());
			dms.createAssociation(new AssociationModel("dm4.core.association",
				new TopicRoleModel(topic.getId(), "dm4.core.parent"),
				new TopicRoleModel(usernameTopic.getId(), "dm4.core.child")));
			logger.info("We did custom assignment stuff here!");
		}
	}

}
