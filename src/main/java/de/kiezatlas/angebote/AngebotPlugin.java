package de.kiezatlas.angebote;

import de.kiezatlas.angebote.model.AngebotsInfoAssigned;
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
import static de.kiezatlas.KiezatlasService.GEO_OBJECT;
import static de.kiezatlas.KiezatlasService.GEO_OBJECT_NAME;
import de.kiezatlas.angebote.model.AngebotsInfo;
import de.kiezatlas.website.model.GeoObjectView;
import java.io.InputStream;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.Consumes;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.logging.Logger;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PathParam;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.WebApplicationException;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;
import org.deepamehta.plugins.signup.service.SignupPluginService;



@Path("/kiezatlas/angebot")
@Consumes("application/json")
@Produces("application/json")
public class AngebotPlugin extends PluginActivator implements AngebotService,
                                                              PostCreateTopicListener {

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
    @Inject private SignupPluginService signupService;

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
    @Path("/listing")
    @Produces(MediaType.TEXT_HTML)
    public InputStream getAngebotListView() {
        return getStaticResource("web/list.html");
    }

    @GET
    @Path("/zuordnen/{topicId}")
    @Produces(MediaType.TEXT_HTML)
    public InputStream getAngebotAssignmentView(@PathParam("topicId") String id) {
        return getStaticResource("web/assignment.html");
    }

    @GET
    @Path("/edit/{topicId}")
    @Produces(MediaType.TEXT_HTML)
    public InputStream getAngebotEditView(@PathParam("topicId") String id) {
        return getStaticResource("web/edit.html");
    }

    @GET
    @Path("/{topicId}")
    @Produces(MediaType.TEXT_HTML)
    public InputStream getAngebotDetailView(@PathParam("topicId") String id) {
        return getStaticResource("web/detail.html");
    }

    @GET
    @Path("/membership")
    public String hasAngeboteWorkspaceMembership() {
        String username = aclService.getUsername();
        if (username != null && !username.equals("")) {
            Topic ws = workspaceService.getWorkspace(WORKSPACE_ANGEBOTE_URI);
            logger.info("Checking Membership for Username=" + username);
            return "" + aclService.isMember(username, ws.getId());
        }
        return "false";
    }

    @GET
    @Path("/list/{geoObjectId}")
    @Produces(MediaType.APPLICATION_JSON)
    @Override
    public ResultList<RelatedTopic> getAngeboteTopics(@PathParam("geoObjectId") long geoObjectId) {
        Topic geoObject = dms.getTopic(geoObjectId);
        return getAngeboteTopicsByGeoObject(geoObject);
    }

    /**
     * Fethes all Angebotsinfos for the given list (JSON Array) of geo object ids.
     *
     * @param payloadListing    String (Semicolon separated list of ids)
     * @return
     */
    @GET
    @Path("/list/many/{ids}")
    @Produces(MediaType.APPLICATION_JSON)
    @Override
    public List<RelatedTopic> getAssignmentsByGeoObjectIds(@PathParam("ids") String payloadListing) {
        List<RelatedTopic> results = new ArrayList<RelatedTopic>();
        String[] ids = payloadListing.split(";");
        for (String id : ids) {
            ResultList<RelatedTopic> assignedAngebote = getAngeboteTopics(Long.parseLong(id));
            results.addAll(assignedAngebote.getItems());
        }
        return results;
    }

    // -------------------------------------------------------------------------------- Username Related Angebotsinfos

    @GET
    @Path("/list")
    @Produces(MediaType.APPLICATION_JSON)
    public List<RelatedTopic> getUsersAngebotsinfoTopics() {
        ResultList<RelatedTopic> all = dms.getTopics(ANGEBOT, 0);
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
    public AngebotsInfo getUsersAngebotsinfoViewModel(@PathParam("topicId") long topicId) {
        List<RelatedTopic> angebote = getUsersAngebotsinfoTopics();
        Iterator<RelatedTopic> iterator = angebote.iterator();
        while (iterator.hasNext()) {
            RelatedTopic angebot = iterator.next();
            if (angebot.getId() == topicId) return assembleAngebotsinfo(angebot);
        }
        throw new WebApplicationException(404);
    }

    @GET
    @Path("/list/assignments/{angebotId}")
    @Produces(MediaType.APPLICATION_JSON)
    public List<AngebotsInfoAssigned> getUsersAngebotsinfoAssignments(@PathParam("angebotId") long topicId) {
        List<RelatedTopic> all = getUsersAngebotsinfoTopics();
        List<AngebotsInfoAssigned> results = new ArrayList<AngebotsInfoAssigned>();
        Iterator<RelatedTopic> iterator = all.iterator();
        while (iterator.hasNext()) {
            RelatedTopic angebot = iterator.next();
            if (angebot.getId() == topicId) {
                ResultList<RelatedTopic> geoObjects = getGeoObjectTopicsByAngebot(angebot);
                Iterator<RelatedTopic> geoIterator = geoObjects.iterator();
                while (geoIterator.hasNext()) {
                    RelatedTopic einrichtung = geoIterator.next();
                    Association assignment = getAssignmentAssociation(angebot, einrichtung);
                    results.add(assembleLocationAssignmentModel(einrichtung, assignment));
                }
            } else {
                logger.info("Angebot \"" + angebot.getSimpleValue() + "\" is not assigned to Geo Object ");
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
            result.setProperty(PROP_ANGEBOT_START_TIME, fromDate, true); // ### is this long value really UTC?
            result.setProperty(PROP_ANGEBOT_END_TIME, toDate, true);
            logger.info("Succesfully created Kiezatlas Angebots Assignment from " + new Date(fromDate).toGMTString()
                + " to " + new Date(toDate).toGMTString());
            notifyAboutAngebotsAssignment(result);
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
            result.setProperty(PROP_ANGEBOT_START_TIME, fromDate, true); // ### is this long value really UTC?
            result.setProperty(PROP_ANGEBOT_END_TIME, toDate, true);
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
    public List<AngebotsInfo> getsAngebotsinfoByTimestamp(@PathParam("now") long timestamp) {
        List<Topic> offers = getAngebotsinfoTopicsFilteredByTime(timestamp);
        List<AngebotsInfo> results = new ArrayList<AngebotsInfo>();
        for (Topic angebot : offers) {
            // 1) assemble basic angebots infos
            AngebotsInfo result = assembleAngebotsinfo(angebot);
            // 2) assemble locations and start and end time
            ResultList<RelatedTopic> geoObjects = getGeoObjectTopicsByAngebot(angebot);
            JSONArray locations = new JSONArray();
            for (RelatedTopic geoObject : geoObjects) {
                Association assignment = getAssignmentAssociation(angebot, geoObject);
                locations.put(assembleLocationAssignmentModel(geoObject, assignment).toJSON());
            }
            result.setLocations(locations);
            results.add(result);
            logger.info("> Fetched current Angebotsinfo \"" + result.getName());
        }
        return results;
    }

    /** TODO: Revise according to our new DTOs. **/
    @GET
    @Path("/locations")
    public List<GeoObjectView> getGeoObjectsByCurrentKiezatlasAngebote() {
        List<Topic> offers = getAngebotsinfoTopicsFilteredByTime(new Date().getTime());
        List<GeoObjectView> results = new ArrayList<GeoObjectView>();
        for (Topic angebot : offers) {
            ResultList<RelatedTopic> geoObjects = getGeoObjectTopicsByAngebot(angebot);
            for (RelatedTopic geoObject : geoObjects) {
                logger.info("> Fetched current Angebotsinfo \"" + angebot.getSimpleValue().toString() + "\", at "
                    + geoObject.getSimpleValue());
                results.add(new GeoObjectView(geoObject, geomapsService, this));
            }
        }
        return results;
    }

    @GET
    @Path("/search/geoobjects")
    public List<GeoObjectView> getGeoObjectsByAngebotsinfoTextSearch(@QueryParam("search") String query) {
        List<Topic> offers = searchAngebotsinfosByText(query);
        List<GeoObjectView> results = new ArrayList<GeoObjectView>();
        for (Topic angebot : offers) {
            ResultList<RelatedTopic> einrichtungen = getGeoObjectTopicsByAngebot(angebot);
            for (RelatedTopic einrichtung : einrichtungen) {
                results.add(new GeoObjectView(einrichtung, geomapsService, this));
            }
            logger.info(offers.size() +" Angebotsinfos assigned to " + results.size() + " Geo Objects");
        }
        return results;
    }

     /**
     * Builds up a list of search results (Geo Objects to be displayed in a map) by text query.
     * @param query
     */
    @GET
    @Path("/search")
    public List<Topic> searchAngebotsinfosByText(@QueryParam("search") String query) {
        // TODO: Maybe it is also desirable that we wrap the users query into quotation marks
        // (to allow users to search for a combination of words)
        try {
            ArrayList<Topic> results = new ArrayList<Topic>();
            if (query.isEmpty()) {
                logger.warning("No search term entered, returning empty resultset");
                return new ArrayList<Topic>();
            }
            List<Topic> angebotsinfos = searchInAngebotsinfoChildsByText(query);
            // iterate over merged results
            /** logger.info("Start building response for " + angebotsinfos.size() + " OVERALL");
            for (Topic topic : angebotsinfos) {
                // ### and filter out all not currently active
                ResultList<RelatedTopic> einrichtungen = topic.getRelatedTopics(ANGEBOT_ASSIGNMENT, null, null, GEO_OBJECT_TYPE, 0);
                for (Topic einrichtung : einrichtungen) {
                    AngebotViewModel avm = null;
                    if (einrichtung != null) {
                        avm = new AngebotViewModel(topic, einrichtung, geomapsService, this);
                        results.add(avm);
                        logger.info("Added AngebotViewModel to Response " + avm.toJSON().toString());
                    } else {
                        logger.info("Einrichtung for text found Angebot NULL: " + topic.toJSON().toString());
                    }
                }
                if (einrichtungen == null) logger.info("EinrichtungEN for text found Angebot NULL" + topic.toJSON().toString());
            } **/
            logger.info("Searched by Text for " + angebotsinfos.size() + " Angebotsinfo Topics ALL DISTRICTS");
            return angebotsinfos;
        } catch (Exception e) {
            throw new RuntimeException("Searching Angebotsinfos By Text across ALL DISTRICTS failed", e);
        }
    }

    public List<Topic> getAngebotsinfoTopicsFilteredByTime(@PathParam("now") long nowDate) {
        ResultList<RelatedAssociation> assocs = dms.getAssociations(ANGEBOT_ASSIGNMENT);
        List<Topic> result = new ArrayList<Topic>();
        Iterator<RelatedAssociation> iterator = assocs.iterator();
        while (iterator.hasNext()) {
            RelatedAssociation assoc = iterator.next();
            if (isAssignmentActiveInTime(assoc, nowDate)) {
                Topic angebotTopic = assoc.getTopic("dm4.core.parent");
                Topic geoObjectTopic = assoc.getTopic("dm4.core.child");
                if (angebotTopic != null && geoObjectTopic != null) {
                    result.add(angebotTopic);
                }
            }
        }
        logger.info("Filtered " + result.size() + " items out for " + new Date(nowDate).toGMTString());
        return result;
    }



    // --- Private Utility Methods

    private AngebotsInfo assembleAngebotsinfo(Topic angebot) {
        AngebotsInfo infoModel = new AngebotsInfo();
        try {
            infoModel.setName(angebot.getChildTopics().getString(ANGEBOT_NAME));
            infoModel.setDescription(angebot.getChildTopics().getString(ANGEBOT_BESCHREIBUNG));
            infoModel.setContact(angebot.getChildTopics().getString(ANGEBOT_KONTAKT));
            infoModel.setWebpage(angebot.getChildTopics().getString(ANGEBOT_WEBPAGE));
            infoModel.setTags(assembleTags(angebot));
            infoModel.setId(angebot.getId());
        } catch (Exception ex) {
            throw new RuntimeException("Could not assemble Angebotsinfos", ex);
        }
        return infoModel;
    }

    private AngebotsInfoAssigned assembleLocationAssignmentModel(Topic geoObject, Association assignment) {
        AngebotsInfoAssigned assignedAngebot = new AngebotsInfoAssigned();
        assignedAngebot.setLocationName(getGeoObjectName(geoObject));
        assignedAngebot.setAssignmentId(assignment.getId());
        assignedAngebot.setStartDate((Long) assignment.getProperty(AngebotPlugin.PROP_ANGEBOT_START_TIME));
        assignedAngebot.setEndDate((Long) assignment.getProperty(AngebotPlugin.PROP_ANGEBOT_END_TIME));
        // Overrides
        if (assignment.getChildTopics().has(ASSIGNMENT_KONTAKT)) {
            assignedAngebot.setContact(assignment.getChildTopics().getString(ASSIGNMENT_KONTAKT));
        }
        if (assignment.getChildTopics().has(ASSIGNMENT_BESCHREIBUNG)) {
            assignedAngebot.setContact(assignment.getChildTopics().getString(ASSIGNMENT_BESCHREIBUNG));
        }
        return assignedAngebot;
    }

    private List<JSONObject> assembleTags(Topic angebot) throws JSONException {
        List<JSONObject> tags = new ArrayList<JSONObject>();
        if (angebot.getChildTopics().has("dm4.tags.tag")) {
            List<RelatedTopic> all = angebot.getChildTopics().getTopics("dm4.tags.tag");
            Iterator<RelatedTopic> iterator = all.iterator();
            while (iterator.hasNext()) {
                Topic tag = iterator.next();
                JSONObject dto = new JSONObject().put("label", tag.getSimpleValue()).put("id", tag.getId());
                tags.add(dto);
            }
        }
        return tags;
    }

    private Topic getAssignedGeoObjectTopic(Association assignmentEdge) {
        Topic geoObject = null;
        if (assignmentEdge.getPlayer1().getTypeUri().equals(GEO_OBJECT)) {
            geoObject = dms.getTopic(assignmentEdge.getPlayer1().getId());
        } else if (assignmentEdge.getPlayer2().getTypeUri().equals(GEO_OBJECT)) {
            geoObject = dms.getTopic(assignmentEdge.getPlayer2().getId());
        }
        return geoObject;
    }

    private Topic getAssignedAngebotsinfoTopic(Association assignmentEdge) {
        Topic angebot = null;
        if (assignmentEdge.getPlayer1().getTypeUri().equals(ANGEBOT)) {
            angebot = dms.getTopic(assignmentEdge.getPlayer1().getId());
        } else if (assignmentEdge.getPlayer2().getTypeUri().equals(ANGEBOT)) {
            angebot = dms.getTopic(assignmentEdge.getPlayer2().getId());
        }
        return angebot;
    }

    private void notifyAboutAngebotsAssignment(Association result) {
        Topic geoObject = getAssignedGeoObjectTopic(result).loadChildTopics();
        Topic angebot = getAssignedAngebotsinfoTopic(result).loadChildTopics();
        signupService.sendSystemMailboxNotification("Angebotsinfos ihrer Einrichtung zugewiesen",
            "\nAngebotsinfo: " + angebot.getSimpleValue().toString() +
            // ### Von + Bis
            "\n\nEinrichtung: " + geoObject.getSimpleValue().toString() + "\n\n");
    }


    private boolean isAssignmentActiveInTime(Association assoc, long timestamp) {
        Long from = (Long) assoc.getProperty(PROP_ANGEBOT_START_TIME);
        Long to = (Long) assoc.getProperty(PROP_ANGEBOT_END_TIME);
        return ((from < timestamp && to > timestamp) || // == "An activity currently open"
                (from < 0 && to > timestamp) || // == "No start date given AND toDate is in the future
                (from < timestamp && to < 0)); // == "Has started and has no toDate set
    }

    private List<Topic> searchInAngebotsinfoChildsByText(String query) {
        HashMap<Long, Topic> uniqueResults = new HashMap<Long, Topic>();
        List<Topic> searchResults = dms.searchTopics(query, "ka2.angebot.beschreibung");
        List<Topic> descrResults = dms.searchTopics(query, "ka2.angebot.name"); // Todo: check index modes
        List<Topic> tagResults = dms.searchTopics(query, "dm4.tags.tag"); // Todo: check index modes
        List<Topic> kontaktResults = dms.searchTopics(query, "ka2.angebot.kontakt"); // Todo: check index modes
        // List<Topic> sonstigesResults = dms.searchTopics(query, "ka2.sonstiges");
        // List<Topic> traegerNameResults = dms.searchTopics(query, "ka2.traeger.name");
        logger.info("> " + searchResults.size() + ", " + descrResults.size() + ", " + tagResults.size()
            + ", " + kontaktResults.size() + " results in four types for query=\"" + query + "\" in ANGEBOTSINFOS");
        // merge all four types in search results
        searchResults.addAll(descrResults);
        searchResults.addAll(tagResults);
        searchResults.addAll(kontaktResults);
        // make search results only contain unique geo object topics
        Iterator<Topic> iterator = searchResults.iterator();
        while (iterator.hasNext()) {
            Topic next = iterator.next();
            Topic geoObject = getParentAngebotTopic(next); // now this is never null
            if (!uniqueResults.containsKey(geoObject.getId())) {
                uniqueResults.put(geoObject.getId(), geoObject);
            }
        }
        logger.info("searchResultLength=" + (searchResults.size()) + ", " + "uniqueResultLength=" + uniqueResults.size());
        return new ArrayList(uniqueResults.values());
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

    // --------------------------------------------------------------------------------------------------------- Hooks

    /**
     * Associates each Angebot to the currently logged in username who issued the creation (request).
     * Note: This seems to be wrapped in a transaction already, otherwise writing would not succeed.
     */
    public void postCreateTopic(Topic topic) {
        if (topic.getTypeUri().equals(ANGEBOT)) {
            Topic usernameTopic = aclService.getUsernameTopic(aclService.getUsername());
            dms.createAssociation(new AssociationModel("dm4.core.association",
                new TopicRoleModel(topic.getId(), "dm4.core.parent"),
                new TopicRoleModel(usernameTopic.getId(), "dm4.core.child")));
        }
    }

    // ----------------------------------------------------------------------------------------------------- Accessors

    @Override
    public ResultList<RelatedTopic> getAngeboteTopicsByGeoObject(Topic geoObject) {
        return geoObject.getRelatedTopics(ANGEBOT_ASSIGNMENT, null, null, ANGEBOT, 0);
    }

    @Override
    public ResultList<RelatedTopic> getGeoObjectTopicsByAngebot(Topic angebot) {
        return angebot.getRelatedTopics(ANGEBOT_ASSIGNMENT, "dm4.core.parent", "dm4.core.child", GEO_OBJECT, 0);
    }

    private Topic getParentAngebotTopic(Topic entry) {
        return entry.getRelatedTopic(null, "dm4.core.child", "dm4.core.parent", "ka2.angebot");
    }

    private String getGeoObjectName(Topic geoObject) {
        return geoObject.getChildTopics().getString(GEO_OBJECT_NAME);
    }

    private Association getAssignmentAssociation(Topic angebot, Topic geoObject) {
        return dms.getAssociation(ANGEBOT_ASSIGNMENT, angebot.getId(),
                geoObject.getId(), "dm4.core.parent", "dm4.core.child").loadChildTopics();
    }

}
