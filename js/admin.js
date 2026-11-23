
 // js/admin.js

let currentProductId = null;

const escapeHTML = (value) =>
    String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));

const safeImageURL = (value) => {
    try {
        const url = new URL(value);
        return ['https:', 'http:'].includes(url.protocol)
            ? escapeHTML(url.href)
            : '';
    } catch {
        return '';
    }
};

/* =========================
   IMAGE VALIDATION AND UPLOAD
========================= */

async function uploadProductImage(file) {

    if (!file) {
        throw new Error('Please select an image.');
    }

    const allowedTypes = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp'
    };

    const extension = allowedTypes[file.type];

    if (!extension) {
        throw new Error(
            'Please use a JPG, PNG or WebP image.'
        );
    }

    if (file.size > 5 * 1024 * 1024) {
        throw new Error(
            'Image must be no larger than 5 MB.'
        );
    }

    if (file.size === 0) {
        throw new Error('The selected image is empty.');
    }

    const fileName =
        crypto.randomUUID() + '.' + extension;

    const { error } =
        await supabaseClient
            .storage
            .from('products')
            .upload(fileName, file, {
                contentType: file.type,
                upsert: false
            });

    if (error) {
        throw new Error(
            'Image upload failed: ' + error.message
        );
    }

    const { data } =
        supabaseClient
            .storage
            .from('products')
            .getPublicUrl(fileName);

    if (!data?.publicUrl) {
        throw new Error(
            'Unable to generate the image URL.'
        );
    }

    return {
        imageUrl: data.publicUrl,
        fileName
    };
}

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

    if (!container) return;

    container.innerHTML =
        (data || []).map(product => {

            const imageURL =
                safeImageURL(product.image_url);

            const imageHTML = imageURL
                ? `<img
                    src="${imageURL}"
                    alt="${escapeHTML(product.name)}"
                    width="120">`
                : `<p>Image not uploaded</p>`;

            const priceHTML =
                product.price === null ||
                product.price === undefined ||
                product.price === ''
                    ? 'Price not set'
                    : '£' + escapeHTML(product.price);

            return `
                <div class="admin-card">

                    ${imageHTML}

                    <h4>${escapeHTML(product.name)}</h4>

                    <p>${escapeHTML(
                        product.description
                    )}</p>

                    <strong>${priceHTML}</strong>

                    <br><br>

                    <button
                        onclick="editProduct(${Number(product.id)})">
                        Edit
                    </button>

                    <button
                        onclick="deleteProduct(${Number(product.id)})">
                        Delete
                    </button>

                </div>
            `;
        }).join('');
}

/* =========================
   SAVE NEW PRODUCT
========================= */

async function saveProduct() {

    const categoryValue =
        document.getElementById('category').value;

    if (
        !categoryValue ||
        !Number.isSafeInteger(Number(categoryValue)) ||
        Number(categoryValue) <= 0
    ) {
        alert('Please select a product category.');
        document.getElementById('category').focus();
        return;
    }

    const file =
        document.getElementById('image').files[0];

    if (!file) {
        alert('Please select an image.');
        return;
    }

    const priceValue =
        document.getElementById('price').value;

    let uploadedImage;

    try {
        uploadedImage =
            await uploadProductImage(file);
    } catch (error) {
        alert(error.message);
        return;
    }

    const { error } =
        await supabaseClient
            .from('products')
            .insert({

                category_id: Number(categoryValue),

                name:
                    document.getElementById('name').value,

                description:
                    document.getElementById('description').value,

                price: priceValue === ''
                    ? null
                    : Number(priceValue),

                image_url: uploadedImage.imageUrl

            });

    if (error) {
        alert(
            'Unable to save product: ' +
            error.message
        );
        return;
    }

    alert('Product Saved Successfully');

    clearForm();

    await loadAdminProducts();
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

    const categorySelect =
        document.getElementById('category');

    if (categorySelect) {
        categorySelect.value =
            data.category_id == null
                ? ''
                : String(data.category_id);
    }

    document.getElementById('name').value =
        data.name ?? '';

    document.getElementById('description').value =
        data.description ?? '';

    document.getElementById('price').value =
        data.price ?? '';

    // Never carry over an image selected
    // while editing a different product.
    document.getElementById('image').value = '';

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

    const categoryValue =
        document.getElementById('category').value;

    if (
        !categoryValue ||
        !Number.isSafeInteger(Number(categoryValue)) ||
        Number(categoryValue) <= 0
    ) {
        alert('Please select a product category.');
        document.getElementById('category').focus();
        return;
    }

    if (!currentProductId) {
        alert('Please select a product to edit.');
        return;
    }

    const file =
        document.getElementById('image').files[0];

    const priceValue =
        document.getElementById('price').value;

    const updates = {

        category_id: Number(categoryValue),

        name:
            document.getElementById('name').value,

        description:
            document.getElementById('description').value,

        price: priceValue === ''
            ? null
            : Number(priceValue)

    };

    // Only replace the photograph when
    // the administrator selects a new image.
    if (file) {

        try {

            const uploadedImage =
                await uploadProductImage(file);

            updates.image_url =
                uploadedImage.imageUrl;

        } catch (error) {

            alert(error.message);
            return;
        }
    }

    const { error } =
        await supabaseClient
            .from('products')
            .update(updates)
            .eq('id', currentProductId);

    if (error) {
        alert(
            'Product update failed: ' +
            error.message
        );
        return;
    }

    alert('Product Updated Successfully');

    clearForm();

    document.getElementById('saveBtn').style.display =
        'inline-block';

    document.getElementById('updateBtn').style.display =
        'none';

    await loadAdminProducts();
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

    if (currentProductId === id) {
        clearForm();

        document.getElementById('saveBtn').style.display =
            'inline-block';

        document.getElementById('updateBtn').style.display =
            'none';
    }

    alert('Product Deleted');

    await loadAdminProducts();
}

/* =========================
   CLEAR FORM
========================= */

function clearForm() {

    document.getElementById('name').value = '';

    document.getElementById('description').value = '';

    document.getElementById('price').value = '';

    document.getElementById('image').value = '';

    const categorySelect =
        document.getElementById('category');

    if (categorySelect) {
        categorySelect.value = '';
    }

    currentProductId = null;
}

/* =========================
   ADMIN AUTHENTICATION
========================= */

// The sign-in gate controls the admin UI.
// Supabase RLS and Storage policies must
// independently enforce authorised writes.

async function initialiseAdmin() {

    const { data: { user }, error } =
        await supabaseClient.auth.getUser();

    if (error || !user) {
        window.location.replace('login.html');
        return;
    }

    const {
        data: owner,
        error: ownerError
    } =
        await supabaseClient
            .from('site_admins')
            .select('user_id')
            .eq('user_id', user.id)
            .maybeSingle();

    if (ownerError || !owner) {

        document.getElementById(
            'adminGate'
        ).textContent =
            'Access denied: owner account required.';

        await supabaseClient.auth.signOut();
        return;
    }

    document.getElementById(
        'adminGate'
    ).hidden = true;

    document.getElementById(
        'adminContent'
    ).hidden = false;

    await loadAdminProducts();

    if (window.loadPendingReviews) {
        await window.loadPendingReviews();
    }
}

/* =========================
   ADMIN LOGOUT
========================= */

const logoutBtn =
    document.getElementById('logoutBtn');

if (logoutBtn) {

    logoutBtn.addEventListener(
        'click',
        async () => {

            logoutBtn.disabled = true;

            logoutBtn.textContent =
                'Logging out...';

            try {

                const { error } =
                    await supabaseClient.auth.signOut();

                if (error) {
                    throw error;
                }

                window.location.replace(
                    'login.html'
                );

            } catch (error) {

                console.error(
                    'Logout failed:',
                    error
                );

                alert(
                    'Unable to log out. Please try again.'
                );

                logoutBtn.disabled = false;

                logoutBtn.textContent =
                    'Logout';
            }
        }
    );
}

/* =========================
   LOAD PRODUCT CATEGORIES
========================= */

async function loadProductCategories() {

    const categorySelect =
        document.getElementById('category');

    if (!categorySelect) return;

    const { data, error } =
        await supabaseClient
            .from('product_categories')
            .select('id, name')
            .order('id', { ascending: true });

    if (error) {
        console.error(
            'Unable to load product categories:',
            error
        );
        return;
    }

    categorySelect.innerHTML = '';

    const placeholder =
        new Option(
            'Select Product Category',
            ''
        );

    categorySelect.add(placeholder);

    (data || []).forEach(category => {

        categorySelect.add(
            new Option(
                category.name,
                String(category.id)
            )
        );
    });
}

/* =========================
   INITIALISE ADMIN
========================= */

initialiseAdmin();
loadProductCategories();
