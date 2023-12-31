function openPopup() {
    document.getElementById('popup').classList.remove('hide');
  }
  // Function to close the modal
  function closePopup() {
    document.getElementById('popup').classList.add('hide');
  }
  // Event listener for the 'NO' button
  document.addEventListener('DOMContentLoaded', function() {
      document.querySelector('#popup button[onclick="closePopup()"]').addEventListener('click', function(event) {
          event.preventDefault(); // Prevent the default action
          closePopup();
      });

      // Optional: Close the modal if the user clicks outside of it
      window.onclick = function(event) {
          let modal = document.getElementById('popup');
          if (event.target === modal) {
              closePopup();
          }
      }
  });   