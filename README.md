
DeepaMehta 4 Kiezatlas - Angebote
=================================

A DeepaMehta 4 plugin and extension for Kiezatlas 2 (see @mukil/dm4-kiezatlas).

We created this plugin so that new users who offer social-cultural activities will be able to

* easily create and manage their public infos about _Angebote_ (Offers)
* and "time-reference" those to all existing Kiezatlas _Geo Objects_

As a result of this work, next to _Geo Objects_, the [Kiezatlas 2 API](http://kreise.kiezatlas.de/pages/api-documentation) will be able to answer geo-spatial, thematic and time-range requests for _Activities_, too.


### Usage & Development

If you want to adapt this software make sure to have your development environment set up like described in the DeepaMehta [Plugin Development Guide](https://trac.deepamehta.de/wiki/PluginDevelopmentGuide).

To install and setup hot-deployment for this plugin when having just downloaded and unzipped deepamehta, you could, for example configure your deepamehta bundle directory in the `pom.xml` of this plugin. Therefore add a `dm4.deploy.dir` path as a property to the `pom.xml` in this directory. For example:

```
    <properties>
        <dm4.deploy.dir>/home/oscar/deepamehta-4.8.3/bundle-deploy</dm4.deploy.dir>
    </properties>
```

To build dm4-kiezatlas-angebote successfully you'll need to build or install its dependencies into your local maven repository. This is due to the fact that we did not have the time to publish these bundles on maven central.

To do so, check out the following plugins source code from github and run `mvn clean install` in all of them: [dm4-kiezatlas](http://github.com/mukil/dm4-kiezatlas), [dm4-geospatial](http://github.com/mukil/dm4-geospatial), [dm4-thymeleaf](http://github.com/jri/dm4-thymeleaf), [dm4-tags](http://github.com/mukil/dm4.tags).

Now you can build and hot-deploy the sources of the dm4-kiezatlas-angebote plugin using the following two commands:
```
grunt
mvn clean package
```



Version History
---------------

**0.7.2** -- UPCOMING

* Completely revised search dialog fragment in coordination with dm4-kiezatlas-website
* Spatial and fulltext search only returns currently active offers as results (#17)
* Adapted all user dialogs to new dm4-kiezatlas-website web design (#15, #16 among many other untracked issues)
* Improvements for "Meine Einträge" (#11) and "Angebotszeiträume verwalten" (#14, #13)dialogs
* Compatibility with IE 11 (#7, #9)
* Added basic https://schema.org/Event markup to detail pages
* Improved lucene search query phrase
* Adapted main menu navigation entries
* Bugfixes: alphabetically ascending sorting of tags (#12), fixes duplicate tags (#8)

Source code compatible with DeepaMehta 4.9.x

**0.4.x** -- 

See commits for details of the 0.4.x releases.

**0.3** -- Winter, 2016

* Many small improvements for the user interface
* Combined fulltext and spatial search for angebote
* Integrate dm4-thymeleaf for server side HTML generation
* Uses grunt to build and minify the javascript and css sources
* ...

**0.1** -- Winter, 2015

* Create "Kiezatlas Angebote"
* Compatible with DeepaMehta 4.4.x

------------
Malte Reißig
02 Nov 2015
