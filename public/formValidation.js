$(document).ready(function() {
    // Initialize datepicker
    $('.datepicker').datepicker({
        format: 'mm/dd/yyyy',
        autoclose: true,
        endDate: '0d' // Prevent future dates
    });

    // Limit date input to MM/DD/YYYY format
    $('#birthDate').on('input', function() {
        let value = $(this).val().replace(/\D/g, ''); // Remove all non-digit characters
        if (value.length >= 3 && value.length <= 4) {
            value = value.slice(0, 2) + '/' + value.slice(2);
        } else if (value.length >= 5) {
            value = value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4, 8);
        }
        $(this).val(value.slice(0, 10)); // Limit to MM/DD/YYYY format length
    });

    // Form submission validation
    $('#readingForm').on('submit', function(event) {
        event.preventDefault(); // Prevent form submission for validation

        const dateInput = $('#birthDate').val();
        const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/(19|20)\d{2}$/;

        if (!regex.test(dateInput)) {
            $('#dateError').text('Please enter a valid date in MM/DD/YYYY format.').show();
            return;
        }

        // Parse date for realistic range check
        const [month, day, year] = dateInput.split('/');
        const birthDate = new Date(year, month - 1, day);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();

        if (
            birthDate > today ||                     // Prevent future dates
            age < 1 || age > 120 ||                 // Check realistic age
            birthDate.getMonth() + 1 != month ||    // Ensure month-day matches
            birthDate.getDate() != day
        ) {
            $('#dateError').text('Please enter a realistic birth date.').show();
        } else {
            $('#dateError').hide();
            alert('Form submitted successfully!');
            // Proceed with form submission if necessary
        }
    });
});
