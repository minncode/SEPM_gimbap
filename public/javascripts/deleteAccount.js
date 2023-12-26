// JavaScript Code:

// Function to open the modal
function openPopup() {
  document.getElementById('popup').classList.remove('hide');
}

// Function to close the modal
function closePopup() {
  document.getElementById('popup').classList.add('hide');
}

// Event listener for the 'NO' button
document.querySelector('#popup button[onclick="popClose()"]').addEventListener('click', function(event) {
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

// Optional: Trigger to open the modal for demonstration, replace with your own trigger
document.getElementById('yourTriggerElementId').addEventListener('click', openPopup);
