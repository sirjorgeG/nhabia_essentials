// js/admin.js

async function saveProduct() {

  const file =
    document.getElementById('image').files[0];

  if (!file) {

    alert('Please select an image');
    return;

  }

  const fileName =
    Date.now() + '-' + file.name;

  const upload =
    await supabaseClient
      .storage
      .from('products')
      .upload(
        fileName,
        file
      );

  if (upload.error) {

    alert(upload.error.message);
    return;

  }

  const imageUrl =
    supabaseClient
      .storage
      .from('products')
      .getPublicUrl(fileName)
      .data.publicUrl;

  const { error } =
    await supabaseClient
      .from('products')
      .insert({

        name:
          document.getElementById('name').value,

        description:
          document.getElementById('description').value,

        price:
          document.getElementById('price').value,

        image_url:
          imageUrl

      });

  if (error) {

    alert(error.message);
    return;

  }

  alert('Product Saved Successfully');

}