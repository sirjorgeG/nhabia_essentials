async function login() {

  const email =
    document.getElementById('email').value;

  const password =
    document.getElementById('password').value;

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  if(error){
    alert(error.message);
    return;
  }

  alert("Login successful!");

  window.location.href =
    "admin.html";

}
async function resetPassword() {

  const email = document.getElementById('email').value.trim();

  if (!email) {
    alert('Please enter your email address first.');
    return;
  }

  const { error } =
    await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo:
        'https://nhabiaessentials.netlify.app/reset-password.html'
    });

  if (error) {
    alert(error.message);
    return;
  }

  alert(
    'If this email is registered, a password recovery link will be sent.'
  );
}