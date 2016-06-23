package de.kiezatlas.angebote;

import de.kiezatlas.angebote.model.AngebotsInfoAssigned;
import de.deepamehta.core.Association;

import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.model.AssociationModel;
import de.deepamehta.core.osgi.PluginActivator;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.Transactional;
import de.deepamehta.core.service.event.PostCreateTopicListener;
import de.deepamehta.accesscontrol.AccessControlService;
import de.deepamehta.core.service.DeepaMehtaEvent;
import de.deepamehta.core.service.EventListener;
import de.deepamehta.geomaps.model.GeoCoordinate;
import de.deepamehta.workspaces.WorkspacesService;
import de.kiezatlas.KiezatlasService;
import static de.kiezatlas.KiezatlasService.GEO_OBJECT;
import static de.kiezatlas.KiezatlasService.GEO_OBJECT_NAME;
import de.kiezatlas.angebote.model.AngebotsInfo;
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



@Path("/angebote")
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

    // @Inject private GeomapsService geomapsService;
    @Inject private WorkspacesService workspaceService;
    @Inject private KiezatlasService kiezService;
    @Inject private AccessControlService aclService;

    private Logger logger = Logger.getLogger(getClass().getName());

    // ------------------------------------------------------------------------------------------------ Public Methods

    @GET
    @Path("/")
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
    public List<RelatedTopic> getAngeboteTopics(@PathParam("geoObjectId") long geoObjectId) {
        Topic geoObject = dm4.getTopic(geoObjectId);
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
            List<RelatedTopic> assignedAngebote = getAngeboteTopics(Long.parseLong(id));
            results.addAll(assignedAngebote);
        }
        return results;
    }

    // --------------------------------------------------------------------------------- Custom Angebote Events

    /**
     * Custom event fired by dm4-kiezatlas-angebote module when a user assigns their angebot to an Einrichtung.
     */
    static DeepaMehtaEvent ANGEBOT_ASSIGNED_LISTENER = new DeepaMehtaEvent(AngebotAssignedListener.class) {
        @Override
        public void dispatch(EventListener listener, Object... params) {
            ((AngebotAssignedListener) listener).angebotsInfoAssigned((Topic) params[0], (Topic) params[1]);
        }
    };

    // -------------------------------------------------------------------------------- Username Related Angebotsinfos

    @GET
    @Path("/my")
    @Produces(MediaType.TEXT_HTML)
    public InputStream getAngeboteView() {
        return getStaticResource("web/my.html");
    }

    @GET
    @Path("/my")
    @Produces(MediaType.APPLICATION_JSON)
    public List<Topic> getUsersAngebotsinfoTopics() {
        List<Topic> all = dm4.getTopicsByType(ANGEBOT);
        ArrayList<Topic> my = new ArrayList<Topic>();
        Iterator<Topic> iterator = all.iterator();
        String usernameAlias = aclService.getUsername();
        while (iterator.hasNext()) {
            Topic angebot = iterator.next();
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
    public AngebotsInfo getAngebotsinfoViewModel(@PathParam("topicId") long topicId) {
        Topic angebotsInfo = dm4.getTopic(topicId);
        return assembleAngebotsinfo(angebotsInfo);
    }

    @GET
    @Path("/user/{topicId}")
    @Override
    public AngebotsInfo getUsersAngebotsinfoViewModel(@PathParam("topicId") long topicId) {
        List<Topic> angebote = getUsersAngebotsinfoTopics();
        Iterator<Topic> iterator = angebote.iterator();
        while (iterator.hasNext()) {
            Topic angebot = iterator.next();
            if (angebot.getId() == topicId) return assembleAngebotsinfo(angebot);
        }
        throw new WebApplicationException(404);
    }

    @GET
    @Path("/list/assignments/{angebotId}")
    @Produces(MediaType.APPLICATION_JSON)
    public List<AngebotsInfoAssigned> getAngebotsinfoAssignments(@PathParam("angebotId") long topicId) {
        List<AngebotsInfoAssigned> results = new ArrayList<AngebotsInfoAssigned>();
        Topic angebot = dm4.getTopic(topicId);
        List<RelatedTopic> geoObjects = getGeoObjectTopicsByAngebot(angebot);
        Iterator<RelatedTopic> geoIterator = geoObjects.iterator();
        while (geoIterator.hasNext()) {
            RelatedTopic einrichtung = geoIterator.next();
            Association assignment = getAssignmentAssociation(angebot, einrichtung);
            results.add(assembleLocationAssignmentModel(einrichtung, angebot, assignment));
        }
        return results;
    }

    @GET
    @Path("/list/assignments/user/{angebotId}")
    @Produces(MediaType.APPLICATION_JSON)
    public List<AngebotsInfoAssigned> getUsersAngebotsinfoAssignments(@PathParam("angebotId") long topicId) {
        List<Topic> all = getUsersAngebotsinfoTopics();
        List<AngebotsInfoAssigned> results = new ArrayList<AngebotsInfoAssigned>();
        Iterator<Topic> iterator = all.iterator();
        while (iterator.hasNext()) {
            Topic angebot = iterator.next();
            if (angebot.getId() == topicId) {
                List<RelatedTopic> geoObjects = getGeoObjectTopicsByAngebot(angebot);
                Iterator<RelatedTopic> geoIterator = geoObjects.iterator();
                while (geoIterator.hasNext()) {
                    RelatedTopic einrichtung = geoIterator.next();
                    Association assignment = getAssignmentAssociation(angebot, einrichtung);
                    results.add(assembleLocationAssignmentModel(einrichtung, angebot, assignment));
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
        long player1Id = assocModel.getRoleModel1().getPlayerId();
        long player2Id = assocModel.getRoleModel2().getPlayerId();
        if (!hasAssignmentAssociation(player1Id, player2Id)) {
            try {
                result = dm4.createAssociation(assocModel);
                result.setProperty(PROP_ANGEBOT_START_TIME, fromDate, true); // ### is this long value really UTC?
                result.setProperty(PROP_ANGEBOT_END_TIME, toDate, true);
                logger.info("Succesfully created Kiezatlas Angebots Assignment from " + new Date(fromDate).toGMTString()
                    + " to " + new Date(toDate).toGMTString());
                notifyAboutAngebotsAssignment(result);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        } else {
            logger.warning("Skipping creating a Kiezatlas Angebots Assignment between from="
                + player1Id + " to=" + player2Id);
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
        Association result = dm4.getAssociation(assocId);
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
        Association result = dm4.getAssociation(assocId);
        try {
            result.delete();
            logger.info("Succesfully DELETED Angebots Assignment Date, Association: " + assocId);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }



    // ----------------------------------------------------------------------------------- Angebots Search & Filter API

    @GET
    @Path("/filter/{now}")
    public List<AngebotsInfo> getAngebotsinfosByTimestamp(@PathParam("now") long timestamp) {
        List<Topic> offers = getAngebotsinfoTopicsFilteredByTime(timestamp);
        return prepareAngebotsInfoResults(offers);
    }

    /** TODO: Revise according to our new DTOs.
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
    }**/

     /**
     * Builds up a list of search results (Geo Objects to be displayed in a map) by text query.
     * @param query
     * @param location
     */
    @GET
    @Path("/search")
    @Override
    public List<AngebotsInfo> searchAngebotsinfosByText(@QueryParam("query") String query,
            @QueryParam("location") String location, @QueryParam("datetime") long timestamp) {
        try {
            List<AngebotsInfo> results = new ArrayList<AngebotsInfo>();
            if (query.isEmpty()) {
                logger.warning("No search term entered, returning empty resultset");
                return new ArrayList<AngebotsInfo>();
            }
            // Prep lucene query
            query = query + "*";
            logger.info("Angebote Search Query String: " + query + ", Nearby: \"" + location + "\" At: " + timestamp);
            List<Topic> angebotsinfos = searchInAngebotsinfoChildsByText(query);
            logger.info("Start building response for " + angebotsinfos.size() + " OVERALL");
            results = prepareAngebotsInfoResults(angebotsinfos);
            logger.info("Processed " + results.size() + " Angebotsinfos across ALL DISTRICTS");
            return results;
        } catch (Exception e) {
            throw new RuntimeException("Searching Angebotsinfos across ALL DISTRICTS failed", e);
        }
    }

    @Override
    public List<Topic> getAngebotsinfoTopicsFilteredByTime(@PathParam("now") long nowDate) {
        List<Association> assocs = dm4.getAssociationsByType(ANGEBOT_ASSIGNMENT);
        List<Topic> result = new ArrayList<Topic>();
        Iterator<Association> iterator = assocs.iterator();
        while (iterator.hasNext()) {
            Association assoc = iterator.next();
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

    /** TODO: Add parameter allowing us to filer out all angbote currently not active. */
    private List<AngebotsInfo> prepareAngebotsInfoResults(List<Topic> angebotsinfos) {
        ArrayList<AngebotsInfo> results = new ArrayList<AngebotsInfo>();
        for (Topic angebot : angebotsinfos) {
            // 1) assemble basic angebots infos
            AngebotsInfo result = assembleAngebotsinfo(angebot);
            // 2) check if angebots info isnt already in our resultset
            if (!results.contains(result)) {
                // 3) assemble locations and start and end time
                List<RelatedTopic> geoObjects = getGeoObjectTopicsByAngebot(angebot);
                JSONArray locations = new JSONArray();
                for (RelatedTopic geoObject : geoObjects) {
                    Association assignment = getAssignmentAssociation(angebot, geoObject);
                    locations.put(assembleLocationAssignmentModel(geoObject, angebot, assignment).toJSON());
                }
                result.setLocations(locations);
                logger.fine("> Fetched current Angebotsinfo \"" + result.getName()+ "\"");
                results.add(result);
            }
        }
        return results;
    }

    private AngebotsInfo assembleAngebotsinfo(Topic angebot) {
        AngebotsInfo infoModel = new AngebotsInfo();
        try {
            angebot.loadChildTopics();
            infoModel.setName(angebot.getChildTopics().getString(ANGEBOT_NAME));
            infoModel.setDescription(angebot.getChildTopics().getString(ANGEBOT_BESCHREIBUNG));
            String angebotKontaktValue  = angebot.getChildTopics().getStringOrNull(ANGEBOT_KONTAKT);
            if (angebotKontaktValue != null) {
                infoModel.setContact(angebotKontaktValue);
            }
            String angebotWebsiteValue = angebot.getChildTopics().getStringOrNull(ANGEBOT_WEBPAGE);
            if (angebotWebsiteValue != null) {
                infoModel.setWebpage(angebotWebsiteValue);
            }
            infoModel.setTags(assembleTags(angebot));
            infoModel.setId(angebot.getId());
        } catch (Exception ex) {
            throw new RuntimeException("Could not assemble Angebotsinfos", ex);
        }
        return infoModel;
    }

    private AngebotsInfoAssigned assembleLocationAssignmentModel(Topic geoObject, Topic angebotTopic, Association assignment) {
        AngebotsInfoAssigned assignedAngebot = new AngebotsInfoAssigned();
        // Everything here must not be Null
        assignedAngebot.setLocationName(getGeoObjectName(geoObject));
        assignedAngebot.setLocationId(geoObject.getId());
        GeoCoordinate coordinates = kiezService.getGeoCoordinateByGeoObject(geoObject);
        assignedAngebot.setLocationCoordinates(coordinates.lat, coordinates.lon);
        assignedAngebot.setLocationAddress(geoObject.getChildTopics().getTopic("dm4.contacts.address").getSimpleValue().toString());
        assignedAngebot.setAngebotsName(angebotTopic.getChildTopics().getString(ANGEBOT_NAME));
        assignedAngebot.setAngebotsId(angebotTopic.getId());
        assignedAngebot.setAssignmentId(assignment.getId());
        assignedAngebot.setStartDate((Long) assignment.getProperty(AngebotPlugin.PROP_ANGEBOT_START_TIME));
        assignedAngebot.setEndDate((Long) assignment.getProperty(AngebotPlugin.PROP_ANGEBOT_END_TIME));
        // Stuff that could be Null
        // ### Angebotsinfos Standard Contacts and Tags Missing
        String standardKontakt = angebotTopic.getChildTopics().getStringOrNull(ANGEBOT_KONTAKT);
        if (standardKontakt != null) assignedAngebot.setKontakt(standardKontakt);
        String standardBeschreibung = angebotTopic.getChildTopics().getStringOrNull(ANGEBOT_BESCHREIBUNG);
        if (standardBeschreibung != null) assignedAngebot.setDescription(standardBeschreibung);
        String webpage = angebotTopic.getChildTopics().getStringOrNull(ANGEBOT_WEBPAGE);
        if (webpage != null) assignedAngebot.setWebpage(webpage);
        // Additonal Kontakt (### Should Override Standad Kontakt)
        String angebotKontaktValue = assignment.getChildTopics().getStringOrNull(ASSIGNMENT_KONTAKT);
        if (angebotKontaktValue != null) {
            assignedAngebot.setAdditionalContact(angebotKontaktValue);
        }
        // Overrides Description (### Should Override Standad Kontakt)
        String assignmentDescription = assignment.getChildTopics().getStringOrNull(ASSIGNMENT_BESCHREIBUNG);
        if (assignmentDescription != null) {
            assignedAngebot.setAdditionalInfo(assignmentDescription);
        }
        return assignedAngebot;
    }

    private List<JSONObject> assembleTags(Topic angebot) throws JSONException {
        List<JSONObject> tags = new ArrayList<JSONObject>();
        List<RelatedTopic> tagTopics = angebot.getChildTopics().getTopicsOrNull("dm4.tags.tag");
        if (tagTopics != null) {
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
            geoObject = dm4.getTopic(assignmentEdge.getPlayer1().getId());
        } else if (assignmentEdge.getPlayer2().getTypeUri().equals(GEO_OBJECT)) {
            geoObject = dm4.getTopic(assignmentEdge.getPlayer2().getId());
        }
        return geoObject;
    }

    private Topic getAssignedAngebotsinfoTopic(Association assignmentEdge) {
        Topic angebot = null;
        if (assignmentEdge.getPlayer1().getTypeUri().equals(ANGEBOT)) {
            angebot = dm4.getTopic(assignmentEdge.getPlayer1().getId());
        } else if (assignmentEdge.getPlayer2().getTypeUri().equals(ANGEBOT)) {
            angebot = dm4.getTopic(assignmentEdge.getPlayer2().getId());
        }
        return angebot;
    }

    /** Move this to website service */
    private void notifyAboutAngebotsAssignment(Association result) {
        Topic geoObject = getAssignedGeoObjectTopic(result).loadChildTopics();
        Topic angebot = getAssignedAngebotsinfoTopic(result).loadChildTopics();
        dm4.fireEvent(ANGEBOT_ASSIGNED_LISTENER, angebot, geoObject);
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
        List<Topic> namen = dm4.searchTopics(query, "ka2.angebot.name"); // Todo: check index modes
        List<Topic> beschreibungen = dm4.searchTopics(query, "ka2.angebot.beschreibung");
        List<Topic> stichwoerter = dm4.searchTopics(query, "dm4.tags.tag"); // Todo: check index modes
        List<Topic> ansprechpartner = dm4.searchTopics(query, "ka2.angebot.kontakt"); // Todo: check index modes
        // List<Topic> sonstigesResults = dm4.searchTopics(query, "ka2.sonstiges");
        // List<Topic> traegerNameResults = dm4.searchTopics(query, "ka2.traeger.name");
        logger.info("> " + namen.size() + ", " + beschreibungen.size() + ", " + stichwoerter.size()
            + ", " + ansprechpartner.size() + " results in four types for query=\"" + query + "\" in ANGEBOTSINFOS");
        // merge all four types in search results
        beschreibungen.addAll(namen);
        beschreibungen.addAll(stichwoerter);
        beschreibungen.addAll(ansprechpartner);
        // make search results only contain unique geo object topics
        Iterator<Topic> iterator = beschreibungen.iterator();
        while (iterator.hasNext()) {
            Topic next = iterator.next();
            Topic geoObject = getParentAngebotTopic(next); // now this is never null
            if (!uniqueResults.containsKey(geoObject.getId())) {
                uniqueResults.put(geoObject.getId(), geoObject);
            }
        }
        logger.info("searchResultLength=" + (beschreibungen.size()) + ", " + "uniqueResultLength=" + uniqueResults.size());
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
            dm4.createAssociation(mf.newAssociationModel("dm4.core.association",
                mf.newTopicRoleModel(topic.getId(), "dm4.core.parent"),
                mf.newTopicRoleModel(usernameTopic.getId(), "dm4.core.child")));
        }
    }

    // ----------------------------------------------------------------------------------------------------- Accessors

    @Override
    public List<RelatedTopic> getAngeboteTopicsByGeoObject(Topic geoObject) {
        return geoObject.getRelatedTopics(ANGEBOT_ASSIGNMENT, null, null, ANGEBOT);
    }

    @Override
    public List<AngebotsInfoAssigned> getAngebotsInfosAssigned(Topic geoObject) {
        List<RelatedTopic> angeboteTopics = getAngeboteTopics(geoObject.getId());
        List<AngebotsInfoAssigned> angebotsinfos = new ArrayList<AngebotsInfoAssigned>();
        for (Topic angebotTopic : angeboteTopics) {
            Association assignment = getAssignmentAssociation(angebotTopic, geoObject);
            angebotsinfos.add(assembleLocationAssignmentModel(geoObject, angebotTopic, assignment));
        }
        return angebotsinfos;
    }

    @Override
    public List<RelatedTopic> getGeoObjectTopicsByAngebot(Topic angebot) {
        return angebot.getRelatedTopics(ANGEBOT_ASSIGNMENT, "dm4.core.parent", "dm4.core.child", GEO_OBJECT);
    }

    private Topic getParentAngebotTopic(Topic entry) {
        return entry.getRelatedTopic(null, "dm4.core.child", "dm4.core.parent", "ka2.angebot");
    }

    private String getGeoObjectName(Topic geoObject) {
        return geoObject.getChildTopics().getString(GEO_OBJECT_NAME);
    }

    private Association getAssignmentAssociation(Topic angebot, Topic geoObject) throws RuntimeException {
        try {
            return dm4.getAssociation(ANGEBOT_ASSIGNMENT, angebot.getId(),
                geoObject.getId(), "dm4.core.parent", "dm4.core.child").loadChildTopics();
        } catch (Exception e) {
            logger.severe("ERROR fetching Association between Angebot: " + angebot.getId()
                + ", " + angebot.getSimpleValue() + " and Geo Object: " + geoObject.getSimpleValue()
                + ": " + e.getMessage());
        }
        return null;
    }

    private boolean hasAssignmentAssociation(long angebotId, long geoObjectId) {
        Association existFrom = dm4.getAssociation(ANGEBOT_ASSIGNMENT, angebotId, geoObjectId,
            "dm4.core.parent", "dm4.core.child");
        Association existTo = dm4.getAssociation(ANGEBOT_ASSIGNMENT, angebotId, geoObjectId,
            "dm4.core.child", "dm4.core.parent");
        return (existFrom != null || existTo != null);
    }

}
