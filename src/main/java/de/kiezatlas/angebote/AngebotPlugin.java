package de.kiezatlas.angebote;

import de.kiezatlas.angebote.model.AngebotViewModel;
import de.kiezatlas.angebote.model.AssignmentViewModel;
import de.deepamehta.core.Association;
import de.deepamehta.core.RelatedAssociation;
import de.deepamehta.plugins.geomaps.GeomapsService;

import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.model.AssociationModel;
import de.deepamehta.core.model.TopicRoleModel;
import de.deepamehta.core.osgi.PluginActivator;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.ResultList;
import de.deepamehta.core.service.Transactional;
import de.deepamehta.core.service.event.PostCreateTopicListener;
import de.deepamehta.plugins.accesscontrol.AccessControlService;
import de.deepamehta.plugins.workspaces.WorkspacesService;
import java.io.InputStream;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.Consumes;

import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.logging.Logger;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PathParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.WebApplicationException;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;



@Path("/kiezatlas/angebot")
@Consumes("application/json")
@Produces("application/json")
public class AngebotPlugin extends PluginActivator implements AngebotService,
                                                              PostCreateTopicListener {

    // --------------------------------------------------------------------------------------------------------- Types
    public static final String ANGEBOT_TYPE                = "ka2.angebot";
    public static final String ANGEBOT_ASSIGNMENT          = "ka2.angebot.assignment";
    public static final String GEO_OBJECT_TYPE             = "ka2.geo_object";

    // ---------------------------------------------------------------------------------------------------- Properties

    public static final String ANGEBOT_START_TIME          = "ka2.angebot.start_time";
    public static final String ANGEBOT_END_TIME            = "ka2.angebot.end_time";

    // ----------------------------------------------------------------------------------------------------- Constants

    // The URIs of KA2 Bezirk topics have this prefix.
    // The remaining part of the URI is the original KA1 overall map alias.
    private static final String KA2_BEZIRK_URI_PREFIX       = "ka2.bezirk.";

    // The URIs of KA2 Geo Object topics have this prefix.
    // The remaining part of the URI is the original KA1 topic id.
    private static final String KA2_GEO_OBJECT_URI_PREFIX   = "de.kiezatlas.topic.";
    private static final String WORKSPACE_ANGEBOTE_URI      = "de.kiezatlas.angebote_ws";

    // -------------------------------------------------------------------------------------------- Instance Variables

    @Inject private GeomapsService geomapsService;
    @Inject private WorkspacesService workspaceService;
    @Inject private AccessControlService aclService;

    private Logger logger = Logger.getLogger(getClass().getName());

    // ------------------------------------------------------------------------------------------------ Public Methods

    /**
     * Responds with the main HTML (AJAX Single) page for managing Angebote.
     *
     * @return
     */
    @GET
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

    // ---------------------------------------------------------------------------------------- Angebotsinfo Resources

    @GET
    @Path("/list/{geoObjectId}")
    @Produces(MediaType.APPLICATION_JSON)
    @Override
    public ResultList<RelatedTopic> getGeoObjectAngeboteTopics(@PathParam("geoObjectId") long geoObjectId) {
        Topic geoObject = dms.getTopic(geoObjectId);
        return geoObject.getRelatedTopics(ANGEBOT_ASSIGNMENT, null, null, ANGEBOT_TYPE, 0);
    }

    /**
     * Fethes all Angebotsinfos for the given list (JSON Array) of geo object ids.
     *
     * @param payloadListing
     * @return
     */
    @POST
    @Path("/list/")
    @Produces(MediaType.APPLICATION_JSON)
    @Consumes(MediaType.TEXT_PLAIN)
    @Override
    public List<RelatedTopic> getGeoObjectAngeboteTopics(String payloadListing) {
        List<RelatedTopic> results = new ArrayList<RelatedTopic>();
        logger.info("Geo Object IDs \"" + payloadListing + "\"");
        try {
            JSONArray geoObjectIdList = new JSONArray(payloadListing);
            logger.info("Collecting Angebot for " + geoObjectIdList.length() + " Geo Object IDs");
            for (int i = 0; i < geoObjectIdList.length(); i++) {
                ResultList<RelatedTopic> assignedAngebote = getGeoObjectAngeboteTopics(geoObjectIdList.getLong(i));
                results.addAll(assignedAngebote.getItems());
            }
        } catch(JSONException jex) {
            throw new WebApplicationException(jex);
        }
        return results;
    }

    // -------------------------------------------------------------------------------- Username Related Angebotsinfos

    @GET
    @Path("/list")
    @Produces(MediaType.APPLICATION_JSON)
    public List<RelatedTopic> getUsersAngeboteTopics() {
        ResultList<RelatedTopic> all = dms.getTopics(ANGEBOT_TYPE, 0);
        ArrayList<RelatedTopic> my = new ArrayList<RelatedTopic>();
        Iterator<RelatedTopic> iterator = all.iterator();
        String usernameAlias = aclService.getUsername();
        while (iterator.hasNext()) {
            RelatedTopic angebot = iterator.next();
            RelatedTopic usernameTopic = angebot.getRelatedTopic("dm4.core.association", null, null,
                    "dm4.accesscontrol.username");
            if (usernameTopic != null && (usernameTopic.getSimpleValue().toString().equals(usernameAlias))) {
                my.add(angebot);
            } else { // ### To be removed after next clean install / DB reset
                logger.warning("Angebot \"" + angebot.getSimpleValue() + "\" hat keinen Username assoziiert!");
            }
        }
        return my;
    }

    @GET
    @Path("/{topicId}")
    @Override
    public AngebotViewModel getUsersAngebotsinfo(@PathParam("topicId") long topicId) {
        List<RelatedTopic> angebote = getUsersAngeboteTopics();
        Iterator<RelatedTopic> iterator = angebote.iterator();
        while (iterator.hasNext()) {
            RelatedTopic angebot = iterator.next();
            if (angebot.getId() == topicId) return new AngebotViewModel(angebot);
        }
        throw new WebApplicationException(404);
    }

    @GET
    @Path("/list/assignments/{angebotId}")
    @Produces(MediaType.APPLICATION_JSON)
    public List<AssignmentViewModel> getUsersAngebotsAssignments(@PathParam("angebotId") long topicId) {
        List<RelatedTopic> all = getUsersAngeboteTopics();
        List<AssignmentViewModel> results = new ArrayList<AssignmentViewModel>();
        Iterator<RelatedTopic> iterator = all.iterator();
        while (iterator.hasNext()) {
            RelatedTopic angebot = iterator.next();
            if (angebot.getId() == topicId) {
                ResultList<RelatedTopic> geoObjects = angebot.getRelatedTopics(ANGEBOT_ASSIGNMENT, null, null,
                        GEO_OBJECT_TYPE, 0);
                Iterator<RelatedTopic> geoIterator = geoObjects.iterator();
                while (geoIterator.hasNext()) {
                    RelatedTopic einrichtung = geoIterator.next();
                    /** Association assignment = dms.getAssociation(ANGEBOT_ASSIGNMENT, angebot.getId(),
                            einrichtung.getId(), "dm4.core.default", "dm4.core.default"); **/
                    results.add(new AssignmentViewModel(einrichtung.getRelatingAssociation(), einrichtung,
                        geomapsService));
                    /** Association getAssociation(String assocTypeUri, long topic1Id, long topic2Id,
                    String roleTypeUri1, String roleTypeUri2); **/
                }
            } else {
                /** logger.info("Angebot \"" + angebot.getSimpleValue() + "\" is not assigned to Geo Object " +
                    geoobject.getSimpleValue()); **/
            }
        }
        return results;
    }



    // ------------------------------------------------------------------------------------- CRUD Angebots-Assignments

    /** Creates an association of type "ka2.angebot.assignment" with two properties (timestamp "from" and "to"). */
    @POST
    @Path("/assignment/{from}/{to}")
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    public Association createAngebotsAssignment(AssociationModel assocModel,
                                                @PathParam("from") long fromDate, @PathParam("to") long toDate) {
        Association result = null;
        if (assocModel == null) throw new RuntimeException("Incomplete request, an AssocationModel is missing.");
        try {
            result = dms.createAssociation(assocModel);
            result.setProperty(ANGEBOT_START_TIME, fromDate, true); // ### is this long value really UTC?
            result.setProperty(ANGEBOT_END_TIME, toDate, true);
            logger.info("Succesfully created Kiezatlas Angebots Assignment from " + new Date(fromDate).toGMTString()
                + " to " + new Date(toDate).toGMTString());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return result;
    }

    /** Updates an association of type "ka2.angebot.assignment" with its two properties (timestamp "from" and "to"). */
    @POST
    @Path("/assignment/{id}/{from}/{to}")
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    public Association updateAngebotsAssignmentDate(@PathParam("id") long assocId, @PathParam("from") long fromDate,
                                                    @PathParam("to") long toDate) {
        Association result = dms.getAssociation(assocId);
        try {
            result.setProperty(ANGEBOT_START_TIME, fromDate, true); // ### is this long value really UTC?
            result.setProperty(ANGEBOT_END_TIME, toDate, true);
            logger.info("Succesfully updated Angebots Assignment Dates from " + new Date(fromDate).toGMTString()
                    + " to " + new Date(toDate).toGMTString());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return result;
    }

    /** Deletes an association of type "ka2.angebot.assignment" with two properties (timestamp "from" and "to"). */
    @POST
    @Path("/assignment/{id}/delete")
    @Transactional
    public void deleteAngebotsAssignment(@PathParam("id") long assocId) {
        Association result = dms.getAssociation(assocId);
        AssignmentViewModel dummy = new AssignmentViewModel(result);
        try {
            result.delete();
            logger.info("Succesfully DELETED Angebots Assignment Date, Association: " + assocId);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }



    // ------------------------------------------------------------------------------------------- Angebots Filter API

    @GET
    @Path("/filter/{now}")
    @Produces(MediaType.APPLICATION_JSON)
    public List<AngebotViewModel> getAllAngebotsinfosByNow(@PathParam("now") long nowDate) {
        ResultList<RelatedAssociation> assocs = dms.getAssociations(ANGEBOT_ASSIGNMENT);
        ArrayList<AngebotViewModel> result = new ArrayList<AngebotViewModel>();
        Iterator<RelatedAssociation> iterator = assocs.iterator();
        while (iterator.hasNext()) {
            RelatedAssociation assoc = iterator.next();
            if (isAssignmentActiveInTime(assoc, nowDate)) {
                Topic angebotTopic = assoc.getTopic("dm4.core.parent");
                Topic geoObjectTopic = assoc.getTopic("dm4.core.child");
                result.add(new AngebotViewModel(angebotTopic, geoObjectTopic, geomapsService));
            }
        }
        logger.info("Filtered " + result.size() + " items out for " + new Date(nowDate).toGMTString());
        return result;
    }

    private boolean isAssignmentActiveInTime(Association assoc, long timestamp) {
        Long from = (Long) assoc.getProperty(ANGEBOT_START_TIME);
        Long to = (Long) assoc.getProperty(ANGEBOT_END_TIME);
        return ((from < timestamp && to > timestamp) || // == "An activity currently open"
                (from < 0 && to > timestamp) || // == "No start date given AND toDate is in the future
                (from < timestamp && to < 0)); // == "Has started and has no toDate set
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
    }

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
        // ### if many geo-objects assigned
        // geoObject.setBezirk(bezirk.getSimpleValue().toString());
        // angebot.setGeoCoordinate(geoCoord);
        // geoObject.setLink(link(topic, bezirk));
        return angebot;
    } **/

    // --------------------------------------------------------------------------------------------- Utility Resources

    @GET
    @Path("/membership")
    public String hasAngeboteWorkspaceMembership() {
        Topic ws = workspaceService.getWorkspace(WORKSPACE_ANGEBOTE_URI);
        if (!aclService.getUsername().equals("")) {
            logger.info("Checking Membership for Username=" + aclService.getUsername());
            return "" + aclService.isMember(aclService.getUsername(), ws.getId());
        }
        return "false";
    }

    // --------------------------------------------------------------------------------------------------------- Hooks

    /**
     * Associates each Angebot to the currently logged in username who issued the creation (request).
     * Note: This seems to be wrapped in a transaction already, otherwise writing would not succeed.
     */
    public void postCreateTopic(Topic topic) {
        if (topic.getTypeUri().equals(ANGEBOT_TYPE)) {
            Topic usernameTopic = aclService.getUsernameTopic(aclService.getUsername());
            dms.createAssociation(new AssociationModel("dm4.core.association",
                new TopicRoleModel(topic.getId(), "dm4.core.parent"),
                new TopicRoleModel(usernameTopic.getId(), "dm4.core.child")));
        }
    }

}