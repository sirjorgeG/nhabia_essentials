// js/products.js

async function loadProducts() {

  const { data, error } =
    await supabaseClient
      .from('products')
      .select('*');

  if (error) {

    console.log(error);
    return;

  }

  const container =
    document.getElementById('products');

  container.innerHTML =
    data.map(product => `

      <div class="card">

        <img
          src="${product.image_url}"
          alt="${product.name}">

        <h3>${product.name}</h3>

        <p>${product.description}</p>

        <strong>
          £${product.price}
        </strong>

      </div>

    `).join('');

}

loadProducts();