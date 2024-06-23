$(document).ready(function() {
    $('#text-to-speech-form').submit(function(event) { 
        event.preventDefault()
        let formData = $(this).serialize()
        $.ajax({
            url: '/text-to-speech/',
            type: 'POST',
            data: formData,
            success: function(response) {
                $('#audio-container').html(response.audio)
            }
        })
    })
})