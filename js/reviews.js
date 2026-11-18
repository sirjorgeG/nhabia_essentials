
(() => {
    "use strict";

    const dialog = document.getElementById("reviewDialog");
    const form = document.getElementById("reviewForm");
    const status = document.getElementById("reviewStatus");
    const closeButton = document.getElementById("closeReview");
    const captchaContainer = document.getElementById("reviewCaptcha");
    const productName = document.getElementById("reviewProductName");

    const captchaKey = window.NHABIA_TURNSTILE_SITE_KEY || "";

    let productId = null;
    let widgetId = null;

    if (
        !dialog ||
        !form ||
        !status ||
        !closeButton ||
        !captchaContainer ||
        !productName
    ) {
        console.error("Review form elements are missing.");
        return;
    }

    // Open the customer review form
    window.openReviewForm = (id, name) => {
        productId = id;

        form.reset();
        status.textContent = "";
        productName.textContent = name;

        dialog.showModal();

        // Remove the previous CAPTCHA widget
        if (widgetId !== null && window.turnstile) {
            turnstile.remove(widgetId);
            widgetId = null;
        }

        captchaContainer.replaceChildren();

        // Render Cloudflare Turnstile
        if (captchaKey && window.turnstile) {
            widgetId = turnstile.render("#reviewCaptcha", {
                sitekey: captchaKey
            });
        } else {
            captchaContainer.textContent =
                "Security verification is unavailable. Please try again later.";
        }
    };

    // Close the review form
    closeButton.addEventListener("click", () => {
        dialog.close();
    });

    // Load approved customer reviews
    async function refreshReviews() {
        const nodes = [
            ...document.querySelectorAll("[data-reviews-for]")
        ];

        if (!window.supabaseClient) {
            console.error("Supabase client is unavailable.");
            return;
        }

        for (const node of nodes) {
            const currentProductId = node.dataset.reviewsFor;

            try {
                const { data, error } = await supabaseClient
                    .from("public_product_reviews")
                    .select(
                        "product_id,reviewer_name,rating,review_text,created_at"
                    )
                    .eq("product_id", currentProductId)
                    .order("created_at", {
                        ascending: false
                    })
                    .limit(5);

                node.replaceChildren();

                if (error) {
                    console.error("Review loading error:", error);
                    node.textContent = "Reviews unavailable";
                    continue;
                }

                if (!data || data.length === 0) {
                    node.textContent = "No reviews yet";
                    continue;
                }

                // Display each approved review
                for (const review of data) {
                    const entry = document.createElement("div");
                    entry.className = "review-entry";

                    // Customer name
                    const name = document.createElement("strong");
                    name.className = "review-customer";
                    name.textContent = review.reviewer_name;

                    // Gold star rating
                    const stars = document.createElement("div");
                    stars.className = "review-stars";
                    stars.textContent = "★".repeat(review.rating);

                    // Customer comment
                    const comment = document.createElement("p");
                    comment.className = "review-comment";
                    comment.textContent = review.review_text;

                    // Assemble review card
                    entry.appendChild(name);
                    entry.appendChild(stars);
                    entry.appendChild(comment);

                    node.appendChild(entry);
                }

            } catch (error) {
                console.error("Review loading error:", error);
                node.textContent = "Reviews unavailable";
            }
        }
    }

    // Submit a customer review
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const submitButton = form.querySelector('[type="submit"]');

        if (!submitButton) {
            return;
        }

        submitButton.disabled = true;
        status.textContent = "Submitting your review...";

        try {
            const nameInput = document.getElementById("reviewName");
            const emailInput = document.getElementById("reviewEmail");
            const ratingInput = document.getElementById("reviewRating");
            const textInput = document.getElementById("reviewText");

            if (
                !nameInput ||
                !emailInput ||
                !ratingInput ||
                !textInput
            ) {
                throw new Error(
                    "The review form is incomplete. Please check the form fields."
                );
            }

            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const rating = Number(ratingInput.value);
            const reviewText = textInput.value.trim();

            // Validate required information
            if (
                !productId ||
                name.length < 2 ||
                !emailInput.validity.valid ||
                !email ||
                !Number.isInteger(rating) ||
                rating < 1 ||
                rating > 5 ||
                reviewText.length < 15 ||
                reviewText.length > 1000
            ) {
                throw new Error(
                    "Please complete all review fields correctly."
                );
            }

            // Obtain the CAPTCHA verification token
            const token =
                widgetId !== null && window.turnstile
                    ? turnstile.getResponse(widgetId)
                    : "";

            if (!token) {
                throw new Error(
                    "Please complete the security verification."
                );
            }

            // Send the review securely to Netlify
            const response = await fetch(
                "/.netlify/functions/submit-review",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        product_id: productId,
                        display_name: name,
                        reviewer_email: email,
                        rating: rating,
                        body: reviewText,
                        captcha_token: token
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Review submission failed."
                );
            }

            status.textContent =
                "Thank you! Your review is awaiting approval.";

            form.reset();

        } catch (error) {
            console.error("Review submission error:", error);

            status.textContent =
                error.message || "Please try again later.";

        } finally {
            submitButton.disabled = false;

            if (widgetId !== null && window.turnstile) {
                turnstile.reset(widgetId);
            }
        }
    });

    // Load reviews after products have been rendered
    window.addEventListener("load", () => {
        setTimeout(refreshReviews, 500);
    });

    // Allow product-loading code to refresh reviews again
    window.refreshProductReviews = refreshReviews;

})();
