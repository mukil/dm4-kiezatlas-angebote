package de.kiezatlas.angebote;

import de.deepamehta.core.Association;
import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.kiezatlas.angebote.model.AngeboteSearchResults;
import de.kiezatlas.angebote.model.Angebotsinfos;
import de.kiezatlas.angebote.model.AngebotsinfosAssigned;
import java.util.List;
import javax.ws.rs.core.Response;



public interface AngebotService {

    // --------------------------------------------------------------------------------------------------------- Types

    public static final String ANGEBOT                      = "ka2.angebot";
    public static final String ANGEBOT_NAME                 = "ka2.angebot.name";
    public static final String ANGEBOT_BESCHREIBUNG         = "ka2.angebot.beschreibung";
    public static final String ANGEBOT_KONTAKT              = "ka2.angebot.kontakt";
    public static final String ANGEBOT_ASSIGNMENT           = "ka2.angebot.assignment";
    public static final String ANGEBOT_WEBPAGE              = "ka2.angebot.webpage";
    
    public static final String ASSIGNMENT_EDGE              = "ka2.angebot.assignment";
    public static final String ASSIGNMENT_KONTAKT           = "ka2.angebot.assignment_kontakt";
    public static final String ASSIGNMENT_ZUSATZINFO        = "ka2.angebot.assignment_zusatz";

    public static final String ANGEBOT_CREATOR_EDGE         = "ka2.angebot.creator";

    public static final String PROP_ANGEBOT_START_TIME      = "ka2.angebot.start_time";
    public static final String PROP_ANGEBOT_END_TIME        = "ka2.angebot.end_time";

    List<Topic> searchInAngebotsinfoChildsByText(String query);

    boolean isAngeboteWorkspaceMember(String username);

    /**
     * @return      Details for a specific "Angebotsinfo" topic Id.
     */
    Angebotsinfos getAngebotsinfo(long angebotsInfoId);

    /**
     * @return      Details for a specific "Angebotsinfo" topic ID relating to the requesting user.
     */
    Angebotsinfos getUsersAngebotsinfos(long angebotsInfoId);

    /**
     * @return      The username of the creator of the angebotsinfo topic.
     */
    RelatedTopic getAngebotsinfoCreator(Topic angebot);

    /**
     * 
     * @return      List of all "Angebotsinfos" for the requesting user.
     */
    List<Topic> getUsersAngebotsinfoResponse();

    /**
     * @return      List of all "Angebot" topics related to the given Geo Object (typeUri="ka2.geo_object").
     */
    List<RelatedTopic> getAngeboteTopics(long geoObjectId);

    /**
     * @return      List of all "Angebot" topics related to the given Geo Object (typeUri="ka2.geo_object").
     */
    List<RelatedTopic> getAngeboteTopicsByUri(String topicId);

    /**
     * @return      List of all "Angebot" topics related to the given Geo Object (typeUri="ka2.geo_object").
     */
    List<RelatedTopic> getAngeboteTopicsByGeoObject(Topic geoObject);

    /**
     * @return      List of all "Angebot" topics related to the given Geo Object (typeUri="ka2.geo_object").
     */
    List<AngebotsinfosAssigned> getAngebotsinfosAssigned(Topic geoObject);

    /**
     * @return      List of "Angebot" topics related to the given Geo Object (typeUri="ka2.geo_object")
     * AND wich are CURERNT (Start < NOW && End > NOW).
     */
    List<AngebotsinfosAssigned> getActiveAngebotsinfosAssigned(Topic geoObject, boolean current);

    /**
     * @return      List of all "Geo Object" topics related to the given Angebot (typeUri="ka2.angebot").
     */
    List<RelatedTopic> getAssignedGeoObjectTopics(Topic angebot);

    /**
     * @return      List of all "Angebotsinfos" related to all the given Geo Objects
     * (given a JSON Array with Topic IDs).
     */
    List<RelatedTopic> getAssignmentsByGeoObjectIds(String payloadListing);

    String getAssignmentZusatzinfo(Association assignmentEdge);

    String getAssignmentKontakt(Association assignmentEdge);

    long getAssignmentStartTime(Association assignmentEdge);

    long getAssignmentEndTime(Association assignmentEdge);

    /**
     * Fetches all Angebotsinfos with a _current_ (now gt from && now st to) Geo Object Assignment.
     * @param now
     * @return
     */
    List<Topic> getAssignedAngeboteByTime(long now);

    /**
     * Fetches all Angebotsinfos by searching four child types: Name, Beschreibung, Kontakt und Tags.
     * @param query
     * @return
     */
    AngeboteSearchResults searchAngebotsinfos(String query, String location, String radius, long datetime);

}
