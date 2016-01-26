
dm4c.add_simple_renderer('de.kiezatlas.angebote.website_single', {

    render_info: function (page_models, $parent) {

        console.log("info: website page_models", page_models)
        $parent.append('<div class="field-label warning">To get <em>hyperlinks</em> rendered properly we must code more.</div>')

    },

    render_form: function (page_models, $parent) {

        // console.log("website page_model", page_models.object)

        $parent.append('<div class="field-label warning">To be able to enter and re-use <em>hyperlinks</em> here working we must code more.</div>')

        return function () {
            return page_models.value
        }
    }
})
