package de.kiezatlas.angebote.events;

import de.deepamehta.core.service.EventListener;
import org.thymeleaf.context.AbstractContext;

/**
 *
 * @author malte
 */
public interface AngeboteResourceRequestedListener extends EventListener {

    void angeboteResourceRequested(AbstractContext context, String templateName);

}
