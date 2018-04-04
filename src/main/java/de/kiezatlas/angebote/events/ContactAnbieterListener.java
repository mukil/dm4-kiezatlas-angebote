package de.kiezatlas.angebote.events;

import de.deepamehta.core.Association;
import de.deepamehta.core.Topic;
import de.deepamehta.core.service.EventListener;

/**
 *
 * @author malted
 */
public interface ContactAnbieterListener extends EventListener {
    
    void contactAngebotsAnbieter(Topic angebotsinfo, Topic geoObject, Association assignmentEdge,
            String message, String usernameFrom, String usernameTo);
    
}
