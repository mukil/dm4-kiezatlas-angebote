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
                        'src/main/resources/web/search-angebote.js',
                        'src/main/resources/web/tags-ui.js'
                    ]
                }
            },
            jquery19: {
                options: {
                    separator: ';',
                },
                files: {
                    'src/main/resources/web/dist/vendor/jquery-1.9.1-ui-1.9.2-autocomplete.min.js': [
                        'src/main/resources/web/vendor/jquery/jquery-1.9.1.min.js',
                        'src/main/resources/web/vendor/jquery/ui/wautocomplete/jquery-ui-1.9.2.custom.min.js'
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
