package de.kiezatlas.angebote;

import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.kiezatlas.angebote.model.Angebotsinfos;
import de.kiezatlas.angebote.model.AngebotsinfosAssigned;
import java.util.List;



public interface AngebotService {

    // --------------------------------------------------------------------------------------------------------- Types

    public static final String ANGEBOT                     = "ka2.angebot";
    public static final String ANGEBOT_NAME                = "ka2.angebot.name";
    public static final String ANGEBOT_BESCHREIBUNG        = "ka2.angebot.beschreibung";
    public static final String ANGEBOT_KONTAKT             = "ka2.angebot.kontakt";
    public static final String ANGEBOT_ASSIGNMENT          = "ka2.angebot.assignment";
    public static final String ANGEBOT_WEBPAGE             = "ka2.angebot.webpage";
    
    public static final String ASSIGNMENT_EDGE             = "ka2.angebot.assignment";
    public static final String ASSIGNMENT_KONTAKT          = "ka2.angebot.assignment_kontakt";
    public static final String ASSIGNMENT_BESCHREIBUNG     = "ka2.angebot.assignment_zusatz";

    public static final String PROP_ANGEBOT_START_TIME     = "ka2.angebot.start_time";
    public static final String PROP_ANGEBOT_END_TIME       = "ka2.angebot.end_time";

    /**
     * @return      Details for a specific "Angebotsinfo" topic Id.
     */
    Angebotsinfos getAngebotsinfo(long angebotsInfoId);

    /**
     * @return      Details for a specific "Angebotsinfo" topic ID relating to the requesting user.
     */
    Angebotsinfos getUsersAngebotsinfos(long angebotsInfoId);

    /**
     * 
     * @return      List of all "Angebotsinfos" for the requesting user.
     */
    List<Topic> getUsersAngebotsinfoTopics();

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
    List<AngebotsinfosAssigned> getCurrentAngebotsinfosAssigned(Topic geoObject);

    /**
     * @return      List of all "Geo Object" topics related to the given Angebot (typeUri="ka2.angebot").
     */
    List<RelatedTopic> getGeoObjectTopicsByAngebot(Topic angebot);

    /**
     * @return      List of all "Angebotsinfos" related to all the given Geo Objects
     * (given a JSON Array with Topic IDs).
     */
    List<RelatedTopic> getAssignmentsByGeoObjectIds(String payloadListing);

    /**
     * Fetches all Angebotsinfos with a _current_ (now gt from && now st to) Geo Object Assignment.
     * @param now
     * @return
     */
    List<Topic> getAllAngebotsinfoTopicsFilteredByTime(long now);

    /**
     * Fetches all Angebotsinfos by searching four child types: Name, Beschreibung, Kontakt und Tags.
     * @param query
     * @return
     */
    List<Angebotsinfos> searchAngebotsinfosByText(String query, String location, String radius, long datetime);

}
