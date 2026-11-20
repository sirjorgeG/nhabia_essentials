
// js/reviews.js
// NHABIA ESSENTIALS - Customer Review System

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
    let submitting = false;
    let reviewRefreshVersion = 0;

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

    // --------------------------------------------
    // OPEN CUSTOMER REVIEW FORM
    // --------------------------------------------

    window.openReviewForm = (id, name) => {
        if (submitting) return;

        productId = id;

        form.reset();
        status.textContent = "";
        productName.textContent = name;

        // Remove previous CAPTCHA widget
        if (widgetId !== null && window.turnstile) {
            turnstile.remove(widgetId);
            widgetId = null;
        }

        captchaContainer.replaceChildren();

        dialog.showModal();

        // Render Cloudflare Turnstile
        if (captchaKey && window.turnstile) {
            try {
                widgetId = turnstile.render("#reviewCaptcha", {
                    sitekey: captchaKey
                });
            } catch (error) {
                console.error("CAPTCHA error:", error);
                captchaContainer.textContent =
                    "Security verification is unavailable. Please try again later.";
            }
        } else {
            captchaContainer.textContent =
                "Security verification is unavailable. Please try again later.";
        }
    };

    // --------------------------------------------
    // CLOSE REVIEW FORM
    // --------------------------------------------

    closeButton.addEventListener("click", () => {
        if (!submitting) {
            dialog.close();
        }
    });

    dialog.addEventListener("cancel", (event) => {
        if (submitting) {
            event.preventDefault();
        }
    });

    // --------------------------------------------
    // LOAD APPROVED CUSTOMER REVIEWS
    // --------------------------------------------

    async function refreshReviews() {
        const version = ++reviewRefreshVersion;

        const nodes = [
            ...document.querySelectorAll("[data-reviews-for]")
        ];

        if (!window.supabaseClient) {
            console.error("Supabase client is unavailable.");

            nodes.forEach(node => {
                node.textContent = "Reviews unavailable";
            });

            return;
        }

        for (const node of nodes) {
            // Stop an older refresh from updating a new
            // category's product cards.
            if (version !== reviewRefreshVersion) {
                return;
            }

            if (!node.isConnected) {
                continue;
            }

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

                if (
                    version !== reviewRefreshVersion ||
                    !node.isConnected
                ) {
                    return;
                }

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

                // ------------------------------------
                // CREATE COMPACT REVIEW LIST
                // ------------------------------------

                const reviewList = document.createElement("div");
                reviewList.className = "compact-review-list";

                data.forEach((review, index) => {
                    const entry = document.createElement("div");
                    entry.className = "review-entry";

                    // Show first two reviews initially
                    if (index >= 2) {
                        entry.hidden = true;
                    }

                    // Customer name
                    const name = document.createElement("strong");
                    name.className = "review-customer";
                    name.textContent =
                        String(review.reviewer_name ?? "");

                    // Star rating
                    const stars = document.createElement("span");
                    stars.className = "review-stars";

                    const rating = Math.max(
                        0,
                        Math.min(5, Number(review.rating) || 0)
                    );

                    stars.textContent =
                        "★".repeat(Math.floor(rating));

                    stars.setAttribute(
                        "aria-label",
                        `${rating} out of 5 stars`
                    );

                    // Customer comment
                    const comment = document.createElement("p");
                    comment.className = "review-comment";
                    comment.textContent =
                        String(review.review_text ?? "");

                    // Assemble review
                    entry.appendChild(name);
                    entry.appendChild(stars);
                    entry.appendChild(comment);

                    reviewList.appendChild(entry);
                });

                node.appendChild(reviewList);

                // ------------------------------------
                // EXPAND OR COLLAPSE REVIEWS
                // ------------------------------------

                if (data.length > 2) {
                    const toggle = document.createElement("button");

                    toggle.type = "button";
                    toggle.className = "review-toggle";
                    toggle.textContent = "View all reviews";
                    toggle.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                    toggle.addEventListener("click", () => {
                        const expanded =
                            toggle.getAttribute("aria-expanded") === "true";

                        reviewList
                            .querySelectorAll(".review-entry")
                            .forEach((entry, index) => {
                                entry.hidden =
                                    expanded && index >= 2;
                            });

                        toggle.setAttribute(
                            "aria-expanded",
                            String(!expanded)
                        );

                        toggle.textContent = expanded
                            ? "View all reviews"
                            : "Show fewer reviews";
                    });

                    node.appendChild(toggle);
                }

            } catch (error) {
                if (
                    version !== reviewRefreshVersion ||
                    !node.isConnected
                ) {
                    return;
                }

                console.error("Review loading error:", error);
                node.textContent = "Reviews unavailable";
            }
        }
    }

    // --------------------------------------------
    // SUBMIT CUSTOMER REVIEW
    // --------------------------------------------

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (submitting) return;

        const submitButton =
            form.querySelector('[type="submit"]');

        if (!submitButton) return;

        submitting = true;
        submitButton.disabled = true;
        status.textContent = "Submitting your review...";

        try {
            const nameInput =
                document.getElementById("reviewName");

            const emailInput =
                document.getElementById("reviewEmail");

            const ratingInput =
                document.getElementById("reviewRating");

            const textInput =
                document.getElementById("reviewText");

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

            // Validate customer information
            if (
                !productId ||
                name.length < 2 ||
                name.length > 60 ||
                !emailInput.validity.valid ||
                !email ||
                email.length > 254 ||
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

            // Obtain CAPTCHA verification token
            const token =
                widgetId !== null && window.turnstile
                    ? turnstile.getResponse(widgetId)
                    : "";

            if (!token) {
                throw new Error(
                    "Please complete the security verification."
                );
            }

            // Submit through secure Netlify function
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
                    result.error ||
                    "Review submission failed."
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
            submitting = false;
            submitButton.disabled = false;

            if (widgetId !== null && window.turnstile) {
                try {
                    turnstile.reset(widgetId);
                } catch (error) {
                    console.error("CAPTCHA reset error:", error);
                }
            }
        }
    });

    // --------------------------------------------
    // REFRESH REVIEWS AFTER PRODUCTS LOAD
    // --------------------------------------------

    // Called by js/products.js whenever products
    // or product categories are rendered.
    window.refreshProductReviews = refreshReviews;

    // Compatibility with code using the older name
    window.refreshReviews = refreshReviews;

    // Initial loading fallback
    window.addEventListener("load", () => {
        refreshReviews();
    });

})();

