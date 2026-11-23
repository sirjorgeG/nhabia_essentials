// js/admin.js
let currentProductId = null;
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeImageURL = (value) => { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? escapeHTML(url.href) : ''; } catch { return ''; } };


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
                src="${safeImageURL(product.image_url)}"
                alt="${escapeHTML(product.name)}"
                width="120">

            <h4>${escapeHTML(product.name)}</h4>

            <p>${escapeHTML(product.description)}</p>

            <strong>£${escapeHTML(product.price)}</strong>

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
    const categoryValue = document.getElementById('category').value;

if (!categoryValue || !Number.isSafeInteger(Number(categoryValue)) ||
    Number(categoryValue) <= 0) {
    alert('Please select a product category.');
    document.getElementById('category').focus();
    return;
}

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

            category_id: Number(
                document.getElementById('category').value
            ),

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

    const categorySelect = document.getElementById('category');

if (categorySelect) {
    categorySelect.value = data.category_id == null
        ? ''
        : String(data.category_id);
}

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
    const categoryValue = document.getElementById('category').value;

if (
    !categoryValue ||
    !Number.isSafeInteger(Number(categoryValue)) ||
    Number(categoryValue) <= 0
) {
    alert('Please select a product category.');
    document.getElementById('category').focus();
    return;
}

    const { error } =
        await supabaseClient
            .from('products')
            .update({
                category_id: Number(
    document.getElementById('category').value
),

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

/* Sign-in gate. Database RLS must independently enforce admin-only writes. */
async function initialiseAdmin() {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (error || !user) { window.location.replace('login.html'); return; }
    const {data: owner, error: ownerError}=await supabaseClient.from('site_admins').select('user_id').eq('user_id',user.id).maybeSingle();
    if(ownerError || !owner){document.getElementById('adminGate').textContent='Access denied: owner account required.';await supabaseClient.auth.signOut();return;}
    document.getElementById('adminGate').hidden = true;
    document.getElementById('adminContent').hidden = false;
    await loadAdminProducts();
    if(window.loadPendingReviews) await window.loadPendingReviews();
}
initialiseAdmin();
/* =========================
   ADMIN LOGOUT
========================= */

const logoutBtn = document.getElementById('logoutBtn');

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {

        logoutBtn.disabled = true;
        logoutBtn.textContent = 'Logging out...';

        try {
            const { error } = await supabaseClient.auth.signOut();

            if (error) {
                throw error;
            }

            window.location.replace('login.html');

        } catch (error) {
            console.error('Logout failed:', error);
            alert('Unable to log out. Please try again.');

            logoutBtn.disabled = false;
            logoutBtn.textContent = 'Logout';
        }
    });
}


/* =========================================
   LOAD PRODUCT CATEGORIES
========================================= */

async function loadProductCategories() {
    const categorySelect = document.getElementById('category');

    if (!categorySelect) return;

    const { data, error } = await supabaseClient
        .from('product_categories')
        .select('id, name')
        .order('id', { ascending: true });

    if (error) {
        console.error('Unable to load product categories:', error);
        return;
    }

    categorySelect.innerHTML = '';

    const placeholder = new Option('Select Product Category', '');
    categorySelect.add(placeholder);

    (data || []).forEach(category => {
        categorySelect.add(
            new Option(category.name, String(category.id))
        );
    });
}

loadProductCategories();
