package de.kiezatlas.angebote;

import de.deepamehta.core.Association;

import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.model.AssociationModel;
import de.deepamehta.core.osgi.PluginActivator;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.Transactional;
import de.deepamehta.core.service.event.PostCreateTopicListener;
import de.deepamehta.accesscontrol.AccessControlService;
import de.deepamehta.core.DeepaMehtaObject;
import de.deepamehta.core.service.DeepaMehtaEvent;
import de.deepamehta.core.service.EventListener;
import de.deepamehta.geomaps.GeomapsService;
import de.deepamehta.geomaps.model.GeoCoordinate;
import de.deepamehta.plugins.geospatial.GeospatialService;
import de.deepamehta.workspaces.WorkspacesService;
import de.kiezatlas.KiezatlasService;
import static de.kiezatlas.KiezatlasService.GEO_OBJECT;
import static de.kiezatlas.KiezatlasService.GEO_OBJECT_NAME;
import static de.kiezatlas.angebote.AngebotService.ANGEBOT_CREATOR_EDGE;
import de.kiezatlas.angebote.model.AngeboteSearchResults;
import de.kiezatlas.angebote.model.Angebotsinfos;
import de.kiezatlas.angebote.model.AngebotsinfosAssigned;
import java.io.InputStream;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.Consumes;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.logging.Logger;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.PathParam;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Response;
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
    private static final String TAG = "dm4.tags.tag";

    // --- DeepaMehta Core & Time Plugin URIs

    private static final String SIMPLE_ASSOCIATION = "dm4.core.association";
    private static final String ROLE_TYPE_CHILD = "dm4.core.child";
    private static final String ROLE_TYPE_PARENT = "dm4.core.parent";

    private final static String PROP_URI_CREATED  = "dm4.time.created";
    private final static String PROP_URI_MODIFIED = "dm4.time.modified";

    // -------------------------------------------------------------------------------------------- Instance Variables

    @Inject private GeomapsService geomapsService;
    @Inject private WorkspacesService workspaceService;
    @Inject private KiezatlasService kiezService;
    @Inject private AccessControlService aclService;
    @Inject private GeospatialService spatialService;

    private Logger log = Logger.getLogger(getClass().getName());

    // ------------------------------------------------------------------------------------------------ Public Methods

    @GET
    @Produces(MediaType.TEXT_HTML)
    public InputStream getAngebotListView() {
        return getStaticResource("web/search.html");
    }

    @GET
    @Path("/stichwort/{tagName}")
    @Produces(MediaType.TEXT_HTML)
    public InputStream getAngebotListView(@PathParam("tagName") String tag) {
        return getStaticResource("web/search.html");
    }

    @GET
    @Path("/zuordnen/{topicId}")
    @Produces(MediaType.TEXT_HTML)
    public InputStream getAngebotAssignmentView(@PathParam("topicId") String id) {
        return getStaticResource("web/assignment.html");
    }

    @GET
    @Path("/revise/{secret}/{offerId}")
    @Produces(MediaType.TEXT_HTML)
    public InputStream getAngebotRevisionView(@PathParam("offerId") long assignmentId, @PathParam("secret") String key) {
        Association assoc = dm4.getAssociation(assignmentId);
        if (assoc.getTypeUri().equals(ASSIGNMENT_EDGE)) {
            log.info("Loaded Assignment Edge, checking Revision Key");
            String revisionKey = (String) assoc.getProperty("revision_key");
            if (!revisionKey.equals(key)) {
                throw new WebApplicationException(new RuntimeException("Sorry, you are not authorized to revise this offer"), Response.Status.UNAUTHORIZED);
            }
        }
        return getStaticResource("web/revise.html");
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

    /**
     * Custom authorization utility method checking membership of requesting user to "Angebote" workspace.
     */
    @GET
    @Path("/membership")
    public String hasAngeboteWorkspaceMembership() {
        String username = aclService.getUsername();
        return isAngeboteWorkspaceMember(username) ? "true" : "false";
    }

    /**
     * Custom authorization utility method to check if the requesting user is creator of "Angebotsinfo".
     */
    @GET
    @Path("/{id}/creator")
    public String hasAngeboteWorkspaceMembership(@PathParam("id") long id) {
        String username = aclService.getUsername();
        if (id > 0) {
            Topic angebot = dm4.getTopic(id);
            if (angebot.getTypeUri().equals(ANGEBOT)) {
                return isAngebotsinfoCreator(username, angebot) ? "true" : "false";
            }
        }
        return "false";
    }

    /**
     * Fetches all assigned angebotsinfo topics by geo object id.
     * @param long  geoObjectId
     * @return A list of ALL angebotsinfo topics assigned to geo object.
     */
    @GET
    @Path("/list/{geoObjectId}")
    @Produces(MediaType.APPLICATION_JSON)
    @Override
    public List<RelatedTopic> getAngeboteTopics(@PathParam("geoObjectId") long geoObjectId) {
        Topic geoObject = dm4.getTopic(geoObjectId);
        return getAngeboteTopicsByGeoObject(geoObject);
    }

    /**
     * Fetches all assigned angebotsinfo topics by topic uri (through passing the kiezatlas 1 topic id).
     * @param String    topicId
     * @return A list of ALL angebotsinfo topics assigned to geo object.
     */
    @GET
    @Path("/list/uri/{topicId}")
    @Produces(MediaType.APPLICATION_JSON)
    @Override
    public List<RelatedTopic> getAngeboteTopicsByUri(@PathParam("topicId") String topicId) {
        String topicUri = KA2_GEO_OBJECT_URI_PREFIX + topicId;
        Topic geoObject = dm4.getTopicByUri(topicUri);
        if (geoObject != null) return getAngeboteTopicsByGeoObject(geoObject);
        log.warning("Could not find ANY angebote topics related to topicUri=" + topicUri);
        return new ArrayList<RelatedTopic>();
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
            ((AngebotAssignedListener) listener).angebotsInfoAssigned((Topic) params[0], (Topic) params[1], (Association) params[2]);
        }
    };

    // -------------------------------------------------------------------------------- Username Related Angebotsinfos

    @Override
    public RelatedTopic getAngebotsinfoCreator(Topic angebot) {
        return angebot.getRelatedTopic(ANGEBOT_CREATOR_EDGE, null,
            null, "dm4.accesscontrol.username");
    }

    @GET
    @Path("/my")
    @Produces(MediaType.TEXT_HTML)
    public InputStream getAngeboteView() {
        return getStaticResource("web/my.html");
    }

    @GET
    @Path("/my")
    @Produces(MediaType.APPLICATION_JSON)
    @Override
    public List<Topic> getUsersAngebotsinfoTopics() {
        List<Topic> all = dm4.getTopicsByType(ANGEBOT);
        ArrayList<Topic> my = new ArrayList<Topic>();
        Iterator<Topic> iterator = all.iterator();
        String usernameAlias = aclService.getUsername();
        while (iterator.hasNext()) {
            Topic angebot = iterator.next();
            RelatedTopic usernameTopic = getAngebotsinfoCreator(angebot);
            if (usernameTopic != null && (usernameTopic.getSimpleValue().toString().equals(usernameAlias))) {
                my.add(angebot);
            } else if (usernameTopic == null) {
                log.warning("Angebotsinfo \"" + angebot.getSimpleValue() + "\" hat keinen Username assoziiert!");
            }
        }
        return sortTopicsDescByModificationDate(my);
    }

    @GET
    @Path("/{topicId}")
    @Override
    public Angebotsinfos getAngebotsinfo(@PathParam("topicId") long topicId) {
        Topic angebotsInfo = dm4.getTopic(topicId);
        return prepareAngebotsinfos(angebotsInfo);
    }

    @GET
    @Path("/user/{topicId}")
    @Override
    public Angebotsinfos getUsersAngebotsinfos(@PathParam("topicId") long topicId) {
        List<Topic> angebote = getUsersAngebotsinfoTopics();
        Iterator<Topic> iterator = angebote.iterator();
        while (iterator.hasNext()) {
            Topic angebot = iterator.next();
            if (angebot.getId() == topicId) return prepareAngebotsinfos(angebot);
        }
        throw new WebApplicationException(404);
    }

    /**
     * Fetch all assigned angebotsinfos for a given angebot.
     * @param angebotId     ID (long) of the angebotsinfo.
     * @param justActive    A boolean flag, if set to "false", all assigned angebots are listed if set to "true" just
     * angebotsinfos assigned with a "To Date" in the future will be returned.
     */
    @GET
    @Path("/list/assignments/{angebotId}/{justActive}")
    @Produces(MediaType.APPLICATION_JSON)
    public List<AngebotsinfosAssigned> getAngebotsinfoAssignments(@PathParam("angebotId") long topicId,
            @PathParam("justActive") boolean justActive) {
        List<AngebotsinfosAssigned> results = new ArrayList<AngebotsinfosAssigned>();
        Topic angebot = dm4.getTopic(topicId);
        if (angebot.getTypeUri().equals(ANGEBOT)) {
            List<RelatedTopic> geoObjects = getAssignedGeoObjectTopics(angebot);
            Iterator<RelatedTopic> geoIterator = geoObjects.iterator();
            while (geoIterator.hasNext()) {
                RelatedTopic einrichtung = geoIterator.next();
                Association assignment = getAssignmentAssociation(angebot, einrichtung);
                if (!justActive) {
                    results.add(prepareAngebotsInfosAssigned(einrichtung, angebot, assignment));
                } else if (justActive && assignmentEndsInTheFuture(assignment)) { // skip offers which toDate is in the past
                    results.add(prepareAngebotsInfosAssigned(einrichtung, angebot, assignment));
                }
            }
        }
        return results;
    }

    /**
     * Why respective where do we need this method?
     * Switched rendering of assignments in angebote-ui to getAngebotsinfoAssignments()
     * @param topicId
     * @return A list of assigned angebotinsofs for the logged in user.
     */
    @GET
    @Path("/list/assignments/user/{angebotId}")
    @Produces(MediaType.APPLICATION_JSON)
    public List<AngebotsinfosAssigned> getUsersAngebotsinfoAssignments(@PathParam("angebotId") long topicId) {
        List<Topic> all = getUsersAngebotsinfoTopics();
        List<AngebotsinfosAssigned> results = new ArrayList<AngebotsinfosAssigned>();
        Iterator<Topic> iterator = all.iterator();
        while (iterator.hasNext()) {
            Topic angebot = iterator.next();
            if (angebot.getId() == topicId) {
                List<RelatedTopic> geoObjects = getAssignedGeoObjectTopics(angebot);
                Iterator<RelatedTopic> geoIterator = geoObjects.iterator();
                while (geoIterator.hasNext()) {
                    RelatedTopic einrichtung = geoIterator.next();
                    Association assignment = getAssignmentAssociation(angebot, einrichtung);
                    results.add(prepareAngebotsInfosAssigned(einrichtung, angebot, assignment));
                }
            } else {
                log.info("Angebot \"" + angebot.getSimpleValue() + "\" is not yet assigned to Geo Object ");
            }
        }
        return results;
    }

    /** Fetches the assignment with the given association id and returns the complete Angebotsinfo.
     * @param assocId */
    @GET
    @Path("/assignment/{id}")
    @Transactional
    public AngebotsinfosAssigned getAngebotsAssignment(@PathParam("id") long assocId) {
        Association result = dm4.getAssociation(assocId);
        AngebotsinfosAssigned model = null;
        try {
            if (result.getTypeUri().equals(ASSIGNMENT_EDGE)) {
                log.info("Succesfully Fetched Angebots Assignment Date, Association: " + assocId);
                Topic player1 = dm4.getTopic(result.getPlayer1().getId());
                Topic player2 = dm4.getTopic(result.getPlayer2().getId());
                if (player1.getTypeUri().equals(ANGEBOT) && player2.getTypeUri().equals(GEO_OBJECT)) {
                    model = prepareAngebotsInfosAssigned(player2, player1, result);
                } else if (player2.getTypeUri().equals(ANGEBOT) && player1.getTypeUri().equals(GEO_OBJECT)) {
                    model = prepareAngebotsInfosAssigned(player1, player2, result);
                }
                return model;
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return model;
    }

    // ------------------------------------------------------------------------------------- CRUD Angebots-Assignments

    /** Creates an association of type "ka2.angebot.assignment" with two properties (timestamp "from" and "to").
     * @param assocModel */
    @POST
    @Path("/assignment/{from}/{to}")
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    public Association createAngebotsAssignment(AssociationModel assocModel,
                                                @PathParam("from") long fromDate, @PathParam("to") long toDate) {
        Association result = null;
        if (assocModel == null) {
            throw new RuntimeException("Incomplete request, an AssocationModel is missing.");
        }
        isAuthorized(); // throws "401" if not
        long player1Id = assocModel.getRoleModel1().getPlayerId();
        long player2Id = assocModel.getRoleModel2().getPlayerId();
        if (!hasAssignmentAssociation(player1Id, player2Id)) {
            try {
                result = dm4.createAssociation(assocModel);
                setAssignmentFromTime(result, fromDate);
                setAssignmentToTime(result, toDate);
                log.info("Succesfully created Kiezatlas Angebots Assignment from " + new Date(fromDate).toGMTString()
                    + " to " + new Date(toDate).toGMTString());
                notifyAboutAngebotsAssignment(result);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        } else {
            log.warning("Skipping creating a Kiezatlas Angebots Assignment between from="
                + player1Id + " to=" + player2Id + " Angebotsinfos ALREADY ASSIGNED");
        }
        return result;
    }

    /** Updates an association of type "ka2.angebot.assignment" with its two properties (timestamp "from" and "to"). */
    @PUT
    @Path("/assignment/{id}/{from}/{to}")
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    public Association updateAngebotsAssignmentDate(AssociationModel assocModel, @PathParam("id") long assocId,
                                                    @PathParam("from") long fromDate, @PathParam("to") long toDate) {
        isAuthorized(); // throws "401" if not
        Association result = dm4.getAssociation(assocId);
        try {
            if (result.getTypeUri().equals(ASSIGNMENT_EDGE)) {
                setAssignmentFromTime(result, fromDate);
                setAssignmentToTime(result, toDate);
                log.info("Succesfully updated Angebots Assignment Dates from " + new Date(fromDate).toGMTString()
                        + " to " + new Date(toDate).toGMTString());
                result.update(assocModel);
            }
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
        isAuthorized(); // throws "401" if not
        Association result = dm4.getAssociation(assocId);
        if (result.getTypeUri().equals(ASSIGNMENT_EDGE)) {
            String einrichtungsName = getAssignedGeoObjectName(result);
            String angebotsName = getAssignedAngebotsName(result);
            try {
                if (result.getTypeUri().equals(ASSIGNMENT_EDGE)) {
                    long startTime = getAssignmentFromTime(result);
                    long endTime = getAssignmentToTime(result);
                    log.info("DELETE " + angebotsName + " assignment from institution " + einrichtungsName
                        + " (Start: " + new Date(startTime) + " End: " + new Date(endTime) + ")");
                    result.delete();
                    log.info("Succesfully DELETED assignment");
                }
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        } else {
            log.warning("Did NOT delete association as it is not an \"Assignment Edge\"");
        }
    }

    /** Deletes a topic of of type "ka2.angebot" */
    @DELETE
    @Path("/{id}")
    @Transactional
    public void deleteAngebotsinfo(@PathParam("id") long assocId) {
        isAuthorized(); // throws "401" if not
        Topic result = dm4.getTopic(assocId);
        if (result.getTypeUri().equals(ANGEBOT)) {
            Topic username = getAngebotsinfoCreator(result);
            if (username.equals(aclService.getUsernameTopic())) {
                try {
                    log.info("DELETE " + result.getSimpleValue() + " Angebotsinfo");
                    result.delete();
                    log.info("Succesfully DELETED angebot");
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            } else {
                log.warning("Mismatch between logged in user and creator of the angebot - SKIPPING DELETION.");
            }
        } else {
            log.warning("Did NOT delete association as it is not an \"Assignment Edge\"");
        }
    }

    // ----------------------------------------------------------------------------------- Angebots Search & Filter API

    @GET
    @Path("/filter/{now}")
    public AngeboteSearchResults getAngebotsinfosByTimestamp(@PathParam("now") long timestamp) {
        AngeboteSearchResults results = new AngeboteSearchResults();
        List<Topic> offers = getAssignedAngeboteByTime(timestamp);
        results.setTimelyResults(prepareAngebotsinfoResultList(offers));
        return results;
    }

    /**
     * Builds up a list of search results (Geo Objects to be displayed in a map) by text query also if these
     * are not currently active in time.
     * @param query
     * @param location
     */
    @GET
    @Path("/search")
    @Override
    public AngeboteSearchResults searchAngebotsinfos(@QueryParam("query") String query,
            @QueryParam("location") String location, @QueryParam("radius") String radius,
            @QueryParam("datetime") long timestamp) {
        try {
            String queryString = prepareLuceneQueryString(query, false, true, false);
            log.info("Angebote Search \"" + queryString + "\", Coordinates \"" + location + "\", Radius \"" + radius + "\"");
            List<AngebotsinfosAssigned> einrichtungsAngebote = new ArrayList<AngebotsinfosAssigned>();
            // 1) Spatial Query, searching Einrichtungen by location and assemble related angebotsinfos
            if (!location.isEmpty() && location.contains(",")) {
                double r = (radius.isEmpty() || radius.equals("0")) ? 1.0 : Double.parseDouble(radius);
                GeoCoordinate searchPoint = new GeoCoordinate(location.trim());
                List<Topic> geoCoordinateTopics = spatialService.getTopicsWithinDistance(searchPoint, r);
                log.info("> Spatial Resultset Size " + geoCoordinateTopics.size() + " Geo Coordinate Topics");
                for (Topic geoCoordinate : geoCoordinateTopics) {
                    GeoCoordinate instGeoCoord = new GeoCoordinate(geoCoordinate.getSimpleValue().toString().replace(" ", ","));
                    Topic inst = kiezService.getGeoObjectByGeoCoordinate(geoCoordinate);
                    if (inst != null) {
                        List<RelatedTopic> offers = getAngeboteTopicsByGeoObject(inst);
                        // if no assignment exists, angebotsinfo (resp. einrichtung with all its..) is not a result
                        if (offers != null && offers.size() > 0) {
                            for (Topic offer : offers) {
                                AngebotsinfosAssigned relatedOffer = prepareAngebotsinfosAssigned(offer, inst);
                                double distanceOfLocation = geomapsService.getDistance(searchPoint, instGeoCoord);
                                relatedOffer.setLocationSearchDistance(distanceOfLocation);
                                einrichtungsAngebote.add(relatedOffer);
                            }
                        }
                    }
                }
            }
            log.info("> Collected " + einrichtungsAngebote.size() + " angebote via spatial search.");
            // 2) Search fulltext in angebotsinfos directly
            List<Angebotsinfos> fulltextAngebote = new ArrayList<Angebotsinfos>();
            if (queryString != null) {
                List<Topic> angebotsinfos = searchInAngebotsinfoChildsByText(queryString);
                log.info("> Fulltext Resultset Size " + angebotsinfos.size() + " Angebotsinfos");
                fulltextAngebote.addAll(prepareAngebotsinfoResultList(angebotsinfos)); // adds just new ones to resultset
            }
            // 3) Build up search result object
            AngeboteSearchResults results = new AngeboteSearchResults();
            results.setSpatialResults(einrichtungsAngebote);
            results.setFulltextResults(fulltextAngebote);
            return results;
        } catch (Exception e) {
            throw new RuntimeException("Searching Angebotsinfos across ALL DISTRICTS failed", e);
        }
    }

    @Override
    public List<Topic> getAssignedAngeboteByTime(@PathParam("now") long nowDate) {
        List<Association> assocs = dm4.getAssociationsByType(ANGEBOT_ASSIGNMENT);
        List<Topic> result = new ArrayList<Topic>();
        Iterator<Association> iterator = assocs.iterator();
        while (iterator.hasNext()) {
            Association assoc = iterator.next();
            if (isAssignmentActiveNow(assoc)) {
                Topic angebotTopic = assoc.getTopic(ROLE_TYPE_PARENT);
                Topic geoObjectTopic = assoc.getTopic(ROLE_TYPE_CHILD);
                if (angebotTopic != null && geoObjectTopic != null) {
                    result.add(angebotTopic);
                }
            }
        }
        log.info("Filtered " + result.size() + " items out for " + new Date(nowDate).toGMTString());
        return result;
    }

    @Override
    public long getAssignmentStartTime(Association assignmentEdge) {
        return (Long) assignmentEdge.getProperty(AngebotPlugin.PROP_ANGEBOT_START_TIME);
    }

    @Override
    public long getAssignmentEndTime(Association assignmentEdge) {
        return (Long) assignmentEdge.getProperty(AngebotPlugin.PROP_ANGEBOT_END_TIME);
    }

    @Override
    public List<RelatedTopic> getAngeboteTopicsByGeoObject(Topic geoObject) {
        return geoObject.getRelatedTopics(ANGEBOT_ASSIGNMENT, null, null, ANGEBOT);
    }

    @Override
    public List<AngebotsinfosAssigned> getAngebotsinfosAssigned(Topic geoObject) {
        List<RelatedTopic> angeboteTopics = getAngeboteTopics(geoObject.getId());
        List<AngebotsinfosAssigned> angebotsinfos = new ArrayList<AngebotsinfosAssigned>();
        for (Topic angebotTopic : angeboteTopics) {
            Association assignment = getAssignmentAssociation(angebotTopic, geoObject);
            angebotsinfos.add(prepareAngebotsInfosAssigned(geoObject, angebotTopic, assignment));
        }
        return angebotsinfos;
    }

    @Override
    public List<RelatedTopic> getAssignedGeoObjectTopics(Topic angebot) {
        return angebot.getRelatedTopics(ANGEBOT_ASSIGNMENT, ROLE_TYPE_PARENT, ROLE_TYPE_CHILD, GEO_OBJECT);
    }

    /**
     * All angebotsinfos assigned to the given geo object which are either currently active in time or,
     * additionally, those who end in the future.
     * @param geoObject
     * @param includeFutureOnes
     * @return
     */
    @Override
    public List<AngebotsinfosAssigned> getActiveAngebotsinfosAssigned(Topic geoObject, boolean includeFutureOnes) {
        List<RelatedTopic> angeboteTopics = getAngeboteTopics(geoObject.getId());
        List<AngebotsinfosAssigned> angebotsinfos = new ArrayList<AngebotsinfosAssigned>();
        for (Topic angebotTopic : angeboteTopics) {
            Association assignment = getAssignmentAssociation(angebotTopic, geoObject);
            if (includeFutureOnes && assignmentEndsInTheFuture(assignment)) { // all angebotsinfos assigned and ending in the future
                addToRelatedAngebotsinfoResults(angebotsinfos, assignment, geoObject, angebotTopic);
            } else if (!includeFutureOnes && isAssignmentActiveNow(assignment)) {
                // just the angebotsinfos assigned to geoObject which are currntly active
                addToRelatedAngebotsinfoResults(angebotsinfos, assignment, geoObject, angebotTopic);
            }
        }
        // sort descending by to date
        return sortAngebotsinfosAssignedDescByToDate(angebotsinfos);
    }


    // ------------------------------------------------------------------------ Private Utility Methods

    private void isAuthorized() {
        String username = aclService.getUsername();
        if (!isAuthenticated() || !isAngeboteWorkspaceMember(username)) {
            throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        }
    }

    private boolean isAngebotsinfoCreator(String username, Topic angebot) {
        if (username != null && !username.equals("")) {
            Topic usernameTopic = getAngebotsinfoCreator(angebot);
            log.info("Checking if user=" + username + " is \"creator\" of Angebotsinfo " + angebot.getSimpleValue());
            return username.equals(usernameTopic.getSimpleValue().toString());
        }
        return false;
    }

    private boolean isAngeboteWorkspaceMember(String username) {
        if (username != null && !username.equals("")) {
            Topic ws = workspaceService.getWorkspace(WORKSPACE_ANGEBOTE_URI);
            log.info("Checking \"Angebote\" membership for Username=" + username);
            return aclService.isMember(username, ws.getId());
        }
        return false;
    }

    private boolean isAuthenticated() {
        String username = aclService.getUsername();
        return (username != null && !username.equals(""));
    }

    private boolean isAssignmentActiveNow(Association assoc) {
        long timestamp = new Date().getTime();
        Long from = getAssignmentFromTime(assoc);
        Long to = getAssignmentToTime(assoc);
        return ((from < timestamp && to > timestamp) || // == "An activity currently open"
                (from < 0 && to > timestamp) || // == "No start date given AND toDate is in the future
                (from < timestamp && to < 0)); // == "Has started and has no toDate set
    }

    private boolean assignmentEndsInTheFuture(Association assoc) {
        long timestamp = new Date().getTime();
        Long from = getAssignmentFromTime(assoc);
        Long to = getAssignmentToTime(assoc);
        return (to > timestamp || (from < timestamp && to < 0)); // Still happens OR to date is -1
    }

    /** Currently unused **/
    private List<AngebotsinfosAssigned> filterOutDuplicates(List<AngebotsinfosAssigned> angebotsinfos) {
        List<AngebotsinfosAssigned> results = new ArrayList<AngebotsinfosAssigned>();
        for (AngebotsinfosAssigned angebot : angebotsinfos) {
            if (!results.contains(angebot)) {
                results.add(angebot);
            }
        }
        return results;
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
    private void notifyAboutAngebotsAssignment(Association assignmentEdge) {
        Topic geoObject = getAssignedGeoObjectTopic(assignmentEdge).loadChildTopics();
        Topic angebot = getAssignedAngebotsinfoTopic(assignmentEdge).loadChildTopics();
        dm4.fireEvent(ANGEBOT_ASSIGNED_LISTENER, angebot, geoObject, assignmentEdge);
    }

    private void setAssignmentFromTime(Association result, long fromDate) {
        long fromValue = -1;
        if (fromDate > 0) fromValue = fromDate;
        result.setProperty(PROP_ANGEBOT_START_TIME, fromValue, true);
    }

    private void setAssignmentToTime(Association result, long toDate) {
        long toValue = -1;
        if (toDate > 0) toValue = toDate;
        result.setProperty(PROP_ANGEBOT_END_TIME, toValue, true);
    }

    private Long getAssignmentFromTime(Association assoc) {
        return (Long) assoc.getProperty(PROP_ANGEBOT_START_TIME);
    }

    private Long getAssignmentToTime(Association assoc) {
        return (Long) assoc.getProperty(PROP_ANGEBOT_END_TIME);
    }

    private String getAssignedGeoObjectName(Association assignment) {
        DeepaMehtaObject player1 = assignment.getPlayer1();
        DeepaMehtaObject player2 = assignment.getPlayer2();
        return (player1.getTypeUri().equals(GEO_OBJECT))
            ? player1.getSimpleValue().toString() : player2.getSimpleValue().toString();
    }

    private String getAssignedAngebotsName(Association assignment) {
        DeepaMehtaObject player1 = assignment.getPlayer1();
        DeepaMehtaObject player2 = assignment.getPlayer2();
        return (player1.getTypeUri().equals(ANGEBOT))
            ? player1.getSimpleValue().toString() : player2.getSimpleValue().toString();
    }

    private List<Topic> searchInAngebotsinfoChildsByText(String query) {
        HashMap<Long, Topic> uniqueResults = new HashMap<Long, Topic>();
        List<Topic> namen = dm4.searchTopics(query, "ka2.angebot.name"); // Todo: check index modes
        List<Topic> beschreibungen = dm4.searchTopics(query, "ka2.angebot.beschreibung");
        List<Topic> stichwoerter = dm4.searchTopics(query, "dm4.tags.label");
        List<Topic> kontakt = dm4.searchTopics(query, "ka2.angebot.kontakt");
        // List<Topic> sonstigesResults = dm4.searchTopics(query, "ka2.sonstiges");
        // List<Topic> traegerNameResults = dm4.searchTopics(query, "ka2.traeger.name");
        log.info("> " + namen.size() + ", " + beschreibungen.size() + ", " + stichwoerter.size()
            + ", " + kontakt.size() + " results in four types for query=\"" + query + "\" in ANGEBOTSINFOS");
        // merge all four types in search results
        beschreibungen.addAll(namen);
        beschreibungen.addAll(getParentTags(stichwoerter));
        beschreibungen.addAll(kontakt);
        // make search results only contain unique geo object topics
        Iterator<Topic> iterator = beschreibungen.iterator();
        while (iterator.hasNext()) {
            Topic next = iterator.next();
            List<RelatedTopic> relatedParents = getParentAngebotTopics(next);
            for (Topic geoObject : relatedParents) {
                if (!uniqueResults.containsKey(geoObject.getId())) {
                    uniqueResults.put(geoObject.getId(), geoObject);
                }
            }
        }
        return new ArrayList(uniqueResults.values());
    }

    private String prepareLuceneQueryString(String userQuery, boolean doAndSplit, boolean doWildcard, boolean doFuzzy) {
        if (userQuery.isEmpty()) return null;
        String result = new String();
        result = userQuery.trim();
        if (doWildcard) result += "*";
        return result;
    }

    private Angebotsinfos prepareAngebotsinfos(Topic angebot) {
        Angebotsinfos infoModel = new Angebotsinfos();
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
            infoModel.setTags(prepareAngeboteTags(angebot));
            infoModel.setId(angebot.getId());
        } catch (Exception ex) {
            throw new RuntimeException("Could not assemble Angebotsinfos", ex);
        }
        return infoModel;
    }

    /**
     *
     * @param angebotsinfos
     * @return A list of Angebotsinfos of which each has at least one location and thereiwth (angebotszeitraum) assigned.
     */
    private List<Angebotsinfos> prepareAngebotsinfoResultList(List<Topic> angebotsinfos) {
        ArrayList<Angebotsinfos> results = new ArrayList<Angebotsinfos>();
        for (Topic angebot : angebotsinfos) {
            // 1) assemble basic angebots infos
            Angebotsinfos result = prepareAngebotsinfos(angebot);
            // 2) check if angebots info isnt already in our resultset
            if (!results.contains(result)) {
                // 3) assemble for all locations and start and end time
                List<RelatedTopic> geoObjects = getAssignedGeoObjectTopics(angebot);
                JSONArray locations = new JSONArray();
                for (RelatedTopic geoObject : geoObjects) {
                    Association assignment = getAssignmentAssociation(angebot, geoObject);
                    locations.put(prepareAngebotsInfosAssigned(geoObject, angebot, assignment).toJSON());
                }
                if (locations.length() > 0) {
                    result.setLocations(locations);
                    results.add(result);
                } else {
                    log.info("SKIPPED fetching Angebotsinfo \"" + result.getName()+ "\" - No Location Assignment");
                }
            }
        }
        return results;
    }

    private AngebotsinfosAssigned prepareAngebotsinfosAssigned(Topic angebotsinfos, Topic einrichtung) {
        Association assignment = getAssignmentAssociation(angebotsinfos, einrichtung);
        return prepareAngebotsInfosAssigned(einrichtung, angebotsinfos, assignment);
    }

    private AngebotsinfosAssigned prepareAngebotsInfosAssigned(Topic geoObject, Topic angebotTopic, Association assignment) {
        AngebotsinfosAssigned assignedAngebot = new AngebotsinfosAssigned();
        // Everything here must not be Null
        assignedAngebot.setLocationName(getGeoObjectName(geoObject));
        assignedAngebot.setLocationId(geoObject.getId());
        GeoCoordinate coordinates = kiezService.getGeoCoordinateByGeoObject(geoObject);
        assignedAngebot.setLocationCoordinates(coordinates.lat, coordinates.lon);
        assignedAngebot.setLocationAddress(geoObject.getChildTopics().getTopic("dm4.contacts.address").getSimpleValue().toString());
        assignedAngebot.setAngebotsName(angebotTopic.getChildTopics().getString(ANGEBOT_NAME));
        assignedAngebot.setAngebotsId(angebotTopic.getId());
        assignedAngebot.setAssignmentId(assignment.getId());
        // assignedAngebot.setAngebotsinfoCreator(getAngebotsinfoCreator(angebotTopic).getSimpleValue().toString());
        assignedAngebot.setStartDate(getAssignmentStartTime(assignment));
        assignedAngebot.setEndDate(getAssignmentEndTime(assignment));
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

    private List<JSONObject> prepareAngeboteTags(Topic angebot) throws JSONException {
        List<JSONObject> tags = new ArrayList<JSONObject>();
        List<RelatedTopic> tagTopics = angebot.getChildTopics().getTopicsOrNull(TAG);
        if (tagTopics != null) {
            List<RelatedTopic> all = angebot.getChildTopics().getTopics(TAG);
            Iterator<RelatedTopic> iterator = all.iterator();
            while (iterator.hasNext()) {
                Topic tag = iterator.next();
                JSONObject dto = new JSONObject().put("label", tag.getSimpleValue()).put("id", tag.getId());
                tags.add(dto);
            }
        }
        return tags;
    }

    // --------------------------------------------------------------------------------------------------------- Hooks

    /**
     * Associates each Angebot to the currently logged in username who issued the creation (request).
     * Note: This seems to be wrapped in a transaction already, otherwise writing would not succeed.
     */
    @Override
    public void postCreateTopic(final Topic topic) {
        if (topic.getTypeUri().equals(ANGEBOT) && isAuthenticated()) {
            final Topic usernameTopic = aclService.getUsernameTopic(aclService.getUsername());
            try {
                dm4.getAccessControl().runWithoutWorkspaceAssignment(new Callable<DeepaMehtaObject>() {
                    @Override
                    public DeepaMehtaObject call() {
                        // 1) Creator Assignment into Private Workspace
                        Association creatorAssignment = dm4.createAssociation(mf.newAssociationModel(ANGEBOT_CREATOR_EDGE,
                            mf.newTopicRoleModel(topic.getId(), ROLE_TYPE_PARENT),
                            mf.newTopicRoleModel(usernameTopic.getId(), ROLE_TYPE_CHILD)));
                        Topic privateWs = dm4.getAccessControl().getPrivateWorkspace(usernameTopic.getSimpleValue().toString());
                        workspaceService.assignToWorkspace(creatorAssignment, privateWs.getId());
                        // 2) System Assignment
                        Association systemAssignment = dm4.createAssociation(mf.newAssociationModel(SIMPLE_ASSOCIATION,
                            mf.newTopicRoleModel(topic.getId(), ROLE_TYPE_PARENT),
                            mf.newTopicRoleModel(usernameTopic.getId(), ROLE_TYPE_CHILD)));
                        workspaceService.assignToWorkspace(systemAssignment, dm4.getAccessControl().getSystemWorkspaceId());
                        log.info("Created custom Username <--> Angebotsinfo assignments in the respective workspaces");
                        return null;
                    }
                });
            } catch (Exception ex) {
                throw new RuntimeException("Creating Username <--> Angebotsinfo assignments FAILED!", ex);
            }
        }
    }

    private List<AngebotsinfosAssigned> sortAngebotsinfosAssignedDescByToDate(List<AngebotsinfosAssigned> angebotsinfos) {
        Collections.sort(angebotsinfos, new Comparator<AngebotsinfosAssigned>() {
            @Override
            public int compare(AngebotsinfosAssigned t1, AngebotsinfosAssigned t2) {
                long one = (Long) t1.getEndTimestamp();
                long two = (Long) t2.getStartTimestamp();
                if (one > two) return -1;
                if (two > one) return 1;
                return 0;
            }
        });
        return angebotsinfos;
    }

    private List<Topic> sortTopicsDescByModificationDate(List<Topic> topics) {
        Collections.sort(topics, new Comparator<Topic>() {
            @Override
            public int compare(Topic t1, Topic t2) {
                try {
                    long one = (Long) t1.getProperty(PROP_URI_MODIFIED);
                    long two = (Long) t2.getProperty(PROP_URI_MODIFIED);
                    if (one > two) return -1;
                    if (two > one) return 1;
                } catch (Exception nfe) {
                    log.warning("Error while accessing timestamp of Topic 1: " + t1.getId() + " Topic2: "
                            + t2.getId() + " nfe: " + nfe.getMessage());
                    return 0;
                }
                return 0;
            }
        });
        return topics;
    }


    private void addToRelatedAngebotsinfoResults(List<AngebotsinfosAssigned> angebotsinfos,
        Association assignment, Topic geoObject, Topic angebotTopic) {
        Topic geoObjectTopic = assignment.getTopic(ROLE_TYPE_CHILD);
        if (angebotTopic != null && geoObjectTopic != null) {
            angebotsinfos.add(prepareAngebotsInfosAssigned(geoObject, angebotTopic, assignment));
        }
    }

    private List<Topic> getParentTags(List<Topic> labels) {
        List<Topic> results = new ArrayList<Topic>();
        for (Topic tagLabel : labels) {
            results.add(tagLabel.getRelatedTopic("dm4.core.composition", ROLE_TYPE_CHILD, ROLE_TYPE_PARENT, TAG));
        }
        return results;
    }

    private List<RelatedTopic> getParentAngebotTopics(Topic entry) {
        List<RelatedTopic> angebote = new ArrayList<RelatedTopic>();
        if (entry.getTypeUri().equals(TAG)) return getParentAngebotTopicsAggregating(entry);
        angebote.add(entry.getRelatedTopic(null, ROLE_TYPE_CHILD, ROLE_TYPE_PARENT, ANGEBOT));
        return angebote;
    }

    private List<RelatedTopic> getParentAngebotTopicsAggregating(Topic entry) {
        return entry.getRelatedTopics("dm4.core.aggregation", ROLE_TYPE_CHILD, ROLE_TYPE_PARENT, ANGEBOT);
    }

    private String getGeoObjectName(Topic geoObject) {
        return geoObject.getChildTopics().getString(GEO_OBJECT_NAME);
    }

    private Association getAssignmentAssociation(Topic angebot, Topic geoObject) throws RuntimeException {
        try {
            return dm4.getAssociation(ANGEBOT_ASSIGNMENT, angebot.getId(),
                geoObject.getId(), ROLE_TYPE_PARENT, ROLE_TYPE_CHILD).loadChildTopics();
        } catch (Exception e) {
            log.severe("ERROR fetching Association between Angebot: " + angebot.getId()
                + ", " + angebot.getSimpleValue() + " and Geo Object: " + geoObject.getSimpleValue()
                + ": " + e.getMessage());
        }
        return null;
    }

    private boolean hasAssignmentAssociation(long angebotId, long geoObjectId) {
        Association existFrom = dm4.getAssociation(ANGEBOT_ASSIGNMENT, angebotId, geoObjectId, ROLE_TYPE_PARENT, ROLE_TYPE_CHILD);
        Association existTo = dm4.getAssociation(ANGEBOT_ASSIGNMENT, angebotId, geoObjectId, ROLE_TYPE_CHILD, ROLE_TYPE_PARENT);
        return (existFrom != null || existTo != null);
    }

}
