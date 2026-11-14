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

                <p class="product-summary">${escapeHTML(String(product.description || '').split(/\s+/).slice(0,19).join(' '))}${String(product.description || '').split(/\s+/).length > 19 ? '…' : ''}</p>
                <details class="product-details"><summary>View Details</summary><p>${escapeHTML(product.description)}</p></details>
                <div class="review-actions"><button type="button" class="review-open" data-product-id="${escapeHTML(product.id)}" data-product-name="${escapeHTML(product.name)}">Write a Review</button><div class="review-list" data-reviews-for="${escapeHTML(product.id)}">Loading reviews…</div></div>

                <strong>
                    £${escapeHTML(product.price)}
                </strong>

            </div>

        </div>

    `).join('');
}

loadProducts();
// Review buttons use delegation; text is escaped above and reviews render as textContent.
document.getElementById('products').addEventListener('click', event => {
  const button = event.target.closest('.review-open');
  if (button) window.openReviewForm(button.dataset.productId, button.dataset.productName);
});
