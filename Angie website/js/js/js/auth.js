async function login() {

  const email =
    document.getElementById('email').value;

  const password =
    document.getElementById('password').value;

  console.log("Attempting login...");

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  console.log(data);
  console.log(error);

  if(error){
    alert(error.message);
    return;
  }

  alert("Login successful!");

}