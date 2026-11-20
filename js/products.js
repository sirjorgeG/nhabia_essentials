
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

let allProducts = [];
let allCategories = [];
let allVariants = [];

async function loadProducts() {
  const container = document.getElementById('products');

  if (!container) return;

  const [productsResult, categoriesResult, variantsResult] =
    await Promise.all([
      supabaseClient.from('products').select('*').order('id'),
      supabaseClient.from('product_categories')
        .select('id,name,slug,selection_type').order('id'),
      supabaseClient.from('product_variants')
        .select('id,product_id,variant_name,is_available')
        .eq('is_available', true)
        .order('id')
    ]);

  if (
    productsResult.error ||
    categoriesResult.error ||
    variantsResult.error
  ) {
    console.error(
      productsResult.error,
      categoriesResult.error,
      variantsResult.error
    );

    container.textContent =
      'Products are temporarily unavailable. Please try again later.';
    return;
  }

  allProducts = productsResult.data || [];
  allCategories = categoriesResult.data || [];
  allVariants = variantsResult.data || [];

  renderCategoryFilters();
  renderProducts();
}

function renderCategoryFilters() {
  const container = document.getElementById('products');

  let filters = document.getElementById('category-filters');

  if (!filters) {
    filters = document.createElement('div');
    filters.id = 'category-filters';
    filters.className = 'category-filters';
    container.parentNode.insertBefore(filters, container);
  }

  filters.innerHTML = `
    <button type="button" class="category-filter active"
      data-category="all">All Products</button>
    ${allCategories.map(category => `
      <button type="button" class="category-filter"
        data-category="${escapeHTML(category.id)}">
        ${escapeHTML(category.name)}
      </button>
    `).join('')}
  `;
}

function renderProducts(categoryId = 'all') {
  const container = document.getElementById('products');

  const products = categoryId === 'all'
    ? allProducts
    : allProducts.filter(product =>
        String(product.category_id) === String(categoryId)
      );

  if (!products.length) {
    container.innerHTML =
      '<p>No products are currently available in this category.</p>';
    return;
  }

  container.innerHTML = products.map(product => {
    const category = allCategories.find(
      item => String(item.id) === String(product.category_id)
    );

    const variants = allVariants.filter(
      item => String(item.product_id) === String(product.id)
    );

    const hasVariants = variants.length > 0;

    const selectionLabel =
      category?.selection_type === 'option'
        ? 'Choose Your Option'
        : 'Choose Your Scent';

    const description = String(product.description || '');
    const words = description.trim().split(/\s+/).filter(Boolean);
    const summary = words.slice(0, 19).join(' ') +
      (words.length > 19 ? '…' : '');

    const imageURL = safeImageURL(product.image_url);

    const price =
      product.price !== null &&
      product.price !== undefined &&
      product.price !== ''
        ? `£${escapeHTML(Number(product.price).toFixed(2))}`
        : 'Price on enquiry';

    return `
      <div class="card">
        ${imageURL ? `
          <img class="product-image"
            src="${imageURL}"
            alt="${escapeHTML(product.name)}"
            loading="lazy">
        ` : `
          <div class="product-image-placeholder">
            NHABIA ESSENTIALS
          </div>
        `}

        <div class="card-content">
          <h3>${escapeHTML(product.name)}</h3>

          <p class="product-summary">
            ${escapeHTML(summary)}
          </p>

          <details class="product-details">
            <summary>View Details</summary>
            <p>${escapeHTML(description)}</p>
          </details>

          ${hasVariants ? `
            <div class="product-selection">
              <label for="variant-${escapeHTML(product.id)}">
                ${selectionLabel}
              </label>

              <select id="variant-${escapeHTML(product.id)}"
                class="product-variant"
                data-product-id="${escapeHTML(product.id)}"
                required>
               <option value="">
  ${category?.slug === 'lip-balm'
    ? 'Select flavour'
    : category?.slug === 'face-cleansing-balm'
      ? 'Select option'
      : 'Select scent'}
</option>
                ${variants.map(variant => `
                  <option value="${escapeHTML(variant.id)}">
                    ${escapeHTML(variant.variant_name)}
                  </option>
                `).join('')}
              </select>
            </div>
          ` : ''}

          <button type="button"
            class="product-enquiry"
            data-product-id="${escapeHTML(product.id)}">
            Enquire About This Product
          </button>

          <div class="review-actions">
            <button type="button"
              class="review-open"
              data-product-id="${escapeHTML(product.id)}"
              data-product-name="${escapeHTML(product.name)}">
              Write a Review
            </button>

            <div class="review-list"
              data-reviews-for="${escapeHTML(product.id)}">
              Loading reviews…
            </div>
          </div>

          <strong>${price}</strong>
        </div>
      </div>
    `;
  }).join('');

  if (typeof window.refreshReviews === 'function') {
    products.forEach(product => {
      window.refreshReviews(product.id);
    });
  }
}

document.addEventListener('click', event => {
  const categoryButton = event.target.closest('.category-filter');

  if (categoryButton) {
    document.querySelectorAll('.category-filter')
      .forEach(button => button.classList.remove('active'));

    categoryButton.classList.add('active');
    renderProducts(categoryButton.dataset.category);
    return;
  }

  const reviewButton = event.target.closest('.review-open');

  if (reviewButton) {
    if (typeof window.openReviewForm === 'function') {
      window.openReviewForm(
        reviewButton.dataset.productId,
        reviewButton.dataset.productName
      );
    }
    return;
  }

  const enquiryButton = event.target.closest('.product-enquiry');

  if (enquiryButton) {
    const product = allProducts.find(
      item => String(item.id) === enquiryButton.dataset.productId
    );

    if (!product) return;

    const variants = allVariants.filter(
      item => String(item.product_id) === String(product.id)
    );

    let selectedVariant = '';

    if (variants.length) {
      const select = document.getElementById(`variant-${product.id}`);

      if (!select || !select.value) {
        alert('Please choose your preferred scent or option.');
        select?.focus();
        return;
      }

      const variant = variants.find(
        item => String(item.id) === select.value
      );

      if (!variant) return;

      selectedVariant = variant.variant_name;
    }

    const message =
      `Hello Nhabia Essentials,\n\n` +
      `I would like to enquire about:\n` +
      `Product: ${product.name}\n` +
      (selectedVariant ? `Selection: ${selectedVariant}\n` : '') +
      `\nCould you please provide more information about availability and ordering?`;

    const instagramURL =
      'https://www.instagram.com/nhabia_essentials/';

    navigator.clipboard.writeText(message)
      .then(() => {
        alert(
          'Your enquiry details have been copied. ' +
          'Please paste them into your Instagram message.'
        );
        window.open(instagramURL, '_blank', 'noopener,noreferrer');
      })
      .catch(() => {
        window.prompt(
          'Copy your enquiry message, then contact us on Instagram:',
          message
        );
      });
  }
});

loadProducts();

