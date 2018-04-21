module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        concat: {
            js: {
                options: {
                    separator: ';',
                },
                files: {
                    'src/main/resources/web/dist/angebote-ui-complete.js': [
                        'src/main/resources/web/angebote-model.js',
                        'src/main/resources/web/angebote-util.js',
                        'src/main/resources/web/detail-angebote.js',
                        'src/main/resources/web/edit-angebote.js',
                        'src/main/resources/web/my-angebote.js',
                        'src/main/resources/web/revise-angebote.js',
                        'src/main/resources/web/tags-ui.js'
                    ]
                }
            },
            jquery19112: {
                options: {
                    separator: ';',
                },
                files: {
                    'src/main/resources/web/dist/vendor/jquery-1.9.1-and-1.12.1-ui-custom.min.js': [
                        'src/main/resources/web/vendor/jquery/jquery-1.9.1.min.js',
                        'src/main/resources/web/vendor/jquery/ui/jquery.ui.datepicker-de.js',
                        'src/main/resources/web/vendor/jquery/ui/1.12.1.custom/jquery-ui.min.js'
                    ]
                }
            },
			jqueryKiezatlasUI: {
                options: {
                    separator: ';',
                },
                files: {
                    'src/main/resources/web/dist/vendor/jquery-ui-1.12.1-kiezatlas.min.css': [
                        'src/main/resources/web/vendor/jquery/ui/1.12.1.custom/jquery-ui.min.css',
                        'src/main/resources/web/vendor/jquery/ui/1.12.1.custom/jquery-ui.theme.min.css',
                        'src/main/resources/web/css/ui-kiezatlas-overrides.css'
                    ]
                }
            }
        },
        uglify: {
            all: {
                files: {
                    'src/main/resources/web/dist/angebote-ui-complete.min.js': ['src/main/resources/web/dist/angebote-ui-complete.js']
                }
            }
        }
    })

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.registerTask('default', ['concat', 'uglify']);

};
