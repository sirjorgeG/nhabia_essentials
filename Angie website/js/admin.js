// js/admin.js
let currentProductId = null;

/* =========================
   LOAD PRODUCTS
========================= */

async function loadAdminProducts() {

    const { data, error } =
        await supabaseClient
            .from('products')
            .select('*')
            .order('id', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    const container =
        document.getElementById('productList');

    container.innerHTML =
        data.map(product => `

        <div class="admin-card">

            <img
                src="${product.image_url}"
                alt="${product.name}"
                width="120">

            <h4>${product.name}</h4>

            <p>${product.description}</p>

            <strong>£${product.price}</strong>

            <br><br>

            <button onclick="editProduct(${product.id})">
                Edit
            </button>

            <button onclick="deleteProduct(${product.id})">
                Delete
            </button>

        </div>

    `).join('');
}

/* =========================
   SAVE NEW PRODUCT
========================= */

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
            .upload(fileName, file);

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

    clearForm();

    loadAdminProducts();
}

/* =========================
   EDIT PRODUCT
========================= */

async function editProduct(id) {

    const { data, error } =
        await supabaseClient
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

    if (error) {

        alert(error.message);
        return;

    }

    currentProductId = id;

    document.getElementById('name').value =
        data.name;

    document.getElementById('description').value =
        data.description;

    document.getElementById('price').value =
        data.price;

    document.getElementById('saveBtn').style.display =
        'none';

    document.getElementById('updateBtn').style.display =
        'inline-block';

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

/* =========================
   UPDATE PRODUCT
========================= */

async function updateProduct() {

    const { error } =
        await supabaseClient
            .from('products')
            .update({

                name:
                    document.getElementById('name').value,

                description:
                    document.getElementById('description').value,

                price:
                    document.getElementById('price').value

            })
            .eq('id', currentProductId);

    if (error) {

        alert(error.message);
        return;

    }

    alert('Product Updated Successfully');

    clearForm();

    loadAdminProducts();

    document.getElementById('saveBtn').style.display =
        'inline-block';

    document.getElementById('updateBtn').style.display =
        'none';
}

/* =========================
   DELETE PRODUCT
========================= */

async function deleteProduct(id) {

    const confirmed =
        confirm('Delete this product?');

    if (!confirmed) return;

    const { error } =
        await supabaseClient
            .from('products')
            .delete()
            .eq('id', id);

    if (error) {

        alert(error.message);
        return;

    }

    alert('Product Deleted');

    loadAdminProducts();
}

/* =========================
   CLEAR FORM
========================= */

function clearForm() {

    document.getElementById('name').value = '';
    document.getElementById('description').value = '';
    document.getElementById('price').value = '';
    document.getElementById('image').value = '';

    currentProductId = null;
}

/* =========================
   INITIAL LOAD
========================= */

loadAdminProducts();