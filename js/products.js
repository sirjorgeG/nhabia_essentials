const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeImageURL = (value) => { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? escapeHTML(url.href) : ''; } catch { return ''; } };
// js/products.js
async function loadProducts() {

    const { data, error } =
        await supabaseClient
            .from('products')
            .select('*')
            .order('id', { ascending: false });

    if (error) {

        console.error(error);
        document.getElementById('products').textContent = 'Products are temporarily unavailable. Please try again later.';
        return;

    }

    const container =
        document.getElementById('products');

    container.innerHTML =
        data.map(product => `

        <div class="card">

            <img
                class="${/velvet\s*cashmere/i.test(String(product.name ?? '')) ? 'product-image--contain' : ''}"
                src="${safeImageURL(product.image_url)}"
                alt="${escapeHTML(product.name)}">

            <div class="card-content">

                <h3>${escapeHTML(product.name)}</h3>

                <p>${escapeHTML(product.description)}</p>

                <strong>
                    £${escapeHTML(product.price)}
                </strong>

            </div>

        </div>

    `).join('');
}

loadProducts();